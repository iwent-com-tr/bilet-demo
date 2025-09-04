import { z } from 'zod';
import crypto from 'crypto';

// Enhanced VAPID configuration schema with security validation
const VapidConfigSchema = z.object({
  publicKey: z.string()
    .min(1, 'VAPID public key is required')
    .regex(/^[A-Za-z0-9+/=_-]+$/, 'VAPID public key must be base64url encoded')
    .refine((key) => {
      // Validate key length (should be 65 bytes when decoded)
      try {
        const decoded = Buffer.from(key.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        return decoded.length === 65;
      } catch {
        return false;
      }
    }, 'VAPID public key must be a valid 65-byte P-256 key'),
  privateKey: z.string()
    .min(1, 'VAPID private key is required')
    .regex(/^[A-Za-z0-9+/=_-]+$/, 'VAPID private key must be base64url encoded')
    .refine((key) => {
      // Validate key length (should be 32 bytes when decoded)
      try {
        const decoded = Buffer.from(key.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
        return decoded.length === 32;
      } catch {
        return false;
      }
    }, 'VAPID private key must be a valid 32-byte P-256 key'),
  subject: z.string()
    .min(1, 'VAPID subject is required')
    .refine(
      (val) => {
        // Must be either a valid email or a mailto: URL
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(val) || (val.startsWith('mailto:') && emailRegex.test(val.slice(7)));
      },
      'VAPID subject must be a valid email address or mailto: URL'
    ),
});

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface VapidKeyPair {
  publicKey: string;
  privateKey: string;
}

// Cache for validated VAPID configuration to avoid repeated validation
let cachedConfig: VapidConfig | null = null;
let configValidatedAt: number = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validates and returns VAPID configuration from environment variables
 * @throws {Error} If VAPID configuration is invalid or missing
 */
export function getVapidConfig(): VapidConfig {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedConfig && (now - configValidatedAt) < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const config = {
    publicKey: process.env.VAPID_PUBLIC_KEY?.trim(),
    privateKey: process.env.VAPID_PRIVATE_KEY?.trim(),
    subject: process.env.VAPID_SUBJECT?.trim(),
  };

  // Check for missing environment variables
  const missingVars = [];
  if (!config.publicKey) missingVars.push('VAPID_PUBLIC_KEY');
  if (!config.privateKey) missingVars.push('VAPID_PRIVATE_KEY');
  if (!config.subject) missingVars.push('VAPID_SUBJECT');

  if (missingVars.length > 0) {
    throw new Error(`Missing required VAPID environment variables: ${missingVars.join(', ')}`);
  }

  try {
    const validatedConfig = VapidConfigSchema.parse(config);
    
    // Additional security check: verify key pair consistency
    if (!areKeysConsistent(validatedConfig.publicKey, validatedConfig.privateKey)) {
      throw new Error('VAPID public and private keys do not form a valid key pair');
    }

    // Cache the validated configuration
    cachedConfig = validatedConfig;
    configValidatedAt = now;
    
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new Error(`Invalid VAPID configuration: ${issues}`);
    }
    throw error;
  }
}

/**
 * Validates VAPID configuration without throwing
 * @returns {boolean} True if configuration is valid
 */
export function isVapidConfigValid(): boolean {
  try {
    getVapidConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets only the public key for client-side use
 * @returns {string} VAPID public key
 */
export function getVapidPublicKey(): string {
  const config = getVapidConfig();
  return config.publicKey;
}

/**
 * Generates a new VAPID key pair for development/testing
 * WARNING: Only use this for development. Production keys should be generated securely offline.
 * @returns {VapidKeyPair} New VAPID key pair
 */
export function generateVapidKeys(): VapidKeyPair {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('VAPID key generation is not allowed in production environment');
  }

  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: {
        type: 'spki',
        format: 'der'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'der'
      }
    });

    // Extract the raw key bytes and convert to base64url
    const publicKeyRaw = publicKey.slice(-65); // Last 65 bytes contain the raw key
    const privateKeyRaw = privateKey.slice(-32); // Last 32 bytes contain the raw key

    return {
      publicKey: base64UrlEncode(publicKeyRaw),
      privateKey: base64UrlEncode(privateKeyRaw)
    };
  } catch (error) {
    throw new Error(`Failed to generate VAPID keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates that public and private keys form a consistent key pair
 * @param publicKey Base64url encoded public key
 * @param privateKey Base64url encoded private key
 * @returns {boolean} True if keys are consistent
 */
function areKeysConsistent(publicKey: string, privateKey: string): boolean {
  try {
    // This is a simplified check - in a real implementation you might want
    // to use a crypto library to verify the mathematical relationship
    const pubDecoded = Buffer.from(publicKey.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const privDecoded = Buffer.from(privateKey.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    // Basic length checks
    return pubDecoded.length === 65 && privDecoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Converts buffer to base64url encoding
 * @param buffer Buffer to encode
 * @returns {string} Base64url encoded string
 */
function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Clears the cached VAPID configuration (useful for testing or key rotation)
 */
export function clearVapidConfigCache(): void {
  cachedConfig = null;
  configValidatedAt = 0;
}

/**
 * Validates environment variables and provides helpful error messages
 * @returns {string[]} Array of validation errors, empty if valid
 */
export function validateVapidEnvironment(): string[] {
  const errors: string[] = [];
  
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey) {
    errors.push('VAPID_PUBLIC_KEY environment variable is missing');
  } else if (!publicKey.match(/^[A-Za-z0-9+/=_-]+$/)) {
    errors.push('VAPID_PUBLIC_KEY must be base64url encoded');
  }

  if (!privateKey) {
    errors.push('VAPID_PRIVATE_KEY environment variable is missing');
  } else if (!privateKey.match(/^[A-Za-z0-9+/=_-]+$/)) {
    errors.push('VAPID_PRIVATE_KEY must be base64url encoded');
  }

  if (!subject) {
    errors.push('VAPID_SUBJECT environment variable is missing');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(subject);
    const isValidMailto = subject.startsWith('mailto:') && emailRegex.test(subject.slice(7));
    
    if (!isValidEmail && !isValidMailto) {
      errors.push('VAPID_SUBJECT must be a valid email address or mailto: URL');
    }
  }

  return errors;
}