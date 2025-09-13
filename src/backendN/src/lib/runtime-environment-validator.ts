/**
 * Comprehensive Runtime Environment Validator
 * Validates all required environment variables and service configurations at startup
 */

import { z } from 'zod';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

// Define required environment schema
const EnvironmentSchema = z.object({
  // Core application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1000).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),
  
  // API Configuration
  API_PREFIX: z.string().default('/api/v1'),
  CLIENT_ORIGIN: z.string().url(),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT Secrets
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // External Services
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Search Engine
  MEILI_HOST: z.string().url().default('http://127.0.0.1:7700'),
  MEILI_API_KEY: z.string().optional(),
  
  // AI Services
  OPENAI_API_KEY: z.string().optional(),
  
  // Push Notifications
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().refine(
    (val) => {
      if (!val) return true; // Optional field
      // Should be either email format or mailto:email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const mailtoRegex = /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(val) || mailtoRegex.test(val);
    },
    { message: 'Must be a valid email or mailto:email format' }
  ).optional(),
  
  // Queue System
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  
  // Worker Configuration
  NOTIFICATION_WORKER_CONCURRENCY: z.coerce.number().default(5),
  START_WORKER: z.enum(['true', 'false']).default('false'),
  
  // Security
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  
  // Development/Production specific
  HTTPS: z.enum(['true', 'false']).default('false'),
  SSL_KEY_FILE: z.string().optional(),
  SSL_CRT_FILE: z.string().optional(),
});

type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;

/**
 * Validates the current environment configuration
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  try {
    // Parse and validate environment variables
    const config = EnvironmentSchema.parse(process.env);
    
    // Core validations
    validateCoreServices(config, errors, warnings, info);
    validateDatabaseConnection(config, errors, warnings);
    validateJWTSecrets(config, errors, warnings);
    validateExternalServices(config, warnings, info);
    validateProductionSecurity(config, errors, warnings);
    validateServiceIntegration(config, warnings, info);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push(`Environment variable ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      errors.push(`Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      isValid: false,
      errors,
      warnings,
      info
    };
  }
}

function validateCoreServices(config: EnvironmentConfig, errors: string[], warnings: string[], info: string[]) {
  // Check CLIENT_ORIGIN configuration
  if (config.CLIENT_ORIGIN.includes('localhost') && config.NODE_ENV === 'production') {
    warnings.push('CLIENT_ORIGIN points to localhost in production environment');
  }
  
  // Check PORT conflicts
  if (config.PORT === 3000 && config.CLIENT_ORIGIN.includes(':3000')) {
    errors.push('Port conflict: Backend and frontend both configured for port 3000');
  }
  
  info.push(`Server will run on ${config.HOST}:${config.PORT}`);
  info.push(`API prefix: ${config.API_PREFIX}`);
  info.push(`Client origin: ${config.CLIENT_ORIGIN}`);
}

function validateDatabaseConnection(config: EnvironmentConfig, errors: string[], warnings: string[]) {
  if (!config.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
    return;
  }
  
  try {
    const url = new URL(config.DATABASE_URL);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      warnings.push('DATABASE_URL does not appear to be a PostgreSQL connection string');
    }
    
    if (url.hostname === 'localhost' && config.NODE_ENV === 'production') {
      warnings.push('Database points to localhost in production environment');
    }
  } catch {
    errors.push('DATABASE_URL is not a valid URL');
  }
}

function validateJWTSecrets(config: EnvironmentConfig, errors: string[], warnings: string[]) {
  // Check JWT secret strength
  if (config.JWT_ACCESS_SECRET.length < 32) {
    errors.push('JWT_ACCESS_SECRET must be at least 32 characters long');
  }
  
  if (config.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
  }
  
  if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    warnings.push('JWT access and refresh secrets should be different for better security');
  }
  
  // Check for weak secrets in production
  if (config.NODE_ENV === 'production') {
    const weakPatterns = ['test', 'dev', 'secret', '123456', 'password'];
    if (weakPatterns.some(pattern => config.JWT_ACCESS_SECRET.toLowerCase().includes(pattern))) {
      errors.push('JWT_ACCESS_SECRET appears to contain weak patterns in production');
    }
  }
}

function validateExternalServices(config: EnvironmentConfig, warnings: string[], info: string[]) {
  // Twilio validation
  const twilioConfigured = config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_VERIFY_SERVICE_SID;
  if (!twilioConfigured) {
    warnings.push('Twilio not configured - phone verification will be disabled');
  } else {
    info.push('Twilio configured - phone verification enabled');
  }
  
  // SendGrid validation
  if (!config.SENDGRID_API_KEY || !config.EMAIL_FROM) {
    warnings.push('SendGrid not configured - email notifications will be disabled');
  } else {
    info.push('SendGrid configured - email notifications enabled');
  }
  
  // MeiliSearch validation
  if (config.MEILI_HOST) {
    info.push(`MeiliSearch configured: ${config.MEILI_HOST}`);
  }
  
  // Push notifications
  const pushConfigured = config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY && config.VAPID_SUBJECT;
  if (!pushConfigured) {
    warnings.push('VAPID keys not configured - web push notifications will be disabled');
  } else {
    info.push('VAPID configured - web push notifications enabled');
  }
  
  // Redis/Queue system
  const redisConfigured = config.REDIS_URL || (config.REDIS_HOST && config.REDIS_PORT);
  if (!redisConfigured) {
    warnings.push('Redis not configured - background job queue will be disabled');
  } else {
    info.push(`Redis configured - queue system enabled (${config.REDIS_HOST}:${config.REDIS_PORT})`);
  }
}

function validateProductionSecurity(config: EnvironmentConfig, errors: string[], warnings: string[]) {
  if (config.NODE_ENV !== 'production') return;
  
  // HTTPS validation for production
  if (config.HTTPS === 'true') {
    if (!config.SSL_KEY_FILE || !config.SSL_CRT_FILE) {
      errors.push('HTTPS enabled but SSL certificate files not configured');
    }
  } else {
    warnings.push('HTTPS not enabled in production - consider enabling SSL');
  }
  
  // Check for development configurations in production
  const devIndicators = [
    config.CLIENT_ORIGIN.includes('localhost'),
    config.DATABASE_URL.includes('localhost'),
    config.MEILI_HOST.includes('localhost'),
  ];
  
  if (devIndicators.some(Boolean)) {
    warnings.push('Some services are configured for localhost in production');
  }
  
  // Worker configuration
  if (config.START_WORKER === 'true') {
    warnings.push('Background worker is configured to run in main process - consider separate worker process for production');
  }
}

function validateServiceIntegration(config: EnvironmentConfig, warnings: string[], info: string[]) {
  // Check for service consistency
  if (config.START_WORKER === 'true' && !config.REDIS_URL && !config.REDIS_HOST) {
    warnings.push('Worker is enabled but Redis is not configured - jobs will fail');
  }
  
  // Check authentication flow compatibility
  if (!config.TWILIO_ACCOUNT_SID && config.NODE_ENV === 'production') {
    warnings.push('Phone verification not configured - users cannot verify phone numbers');
  }
  
  // OpenAI configuration
  if (config.OPENAI_API_KEY) {
    info.push('OpenAI configured - AI features enabled');
  } else {
    info.push('OpenAI not configured - AI features will be disabled');
  }
}

/**
 * Prints a formatted validation report
 */
export function printValidationReport(result: ValidationResult): void {
  console.log('\n🔍 Runtime Environment Validation Report');
  console.log('='.repeat(50));
  
  if (result.isValid) {
    console.log('✅ Environment validation passed');
  } else {
    console.log('❌ Environment validation failed');
  }
  
  if (result.errors.length > 0) {
    console.log('\n🚨 ERRORS (must be fixed):');
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (should be addressed):');
    result.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }
  
  if (result.info.length > 0) {
    console.log('\n💡 INFORMATION:');
    result.info.forEach((info, index) => {
      console.log(`  ${index + 1}. ${info}`);
    });
  }
  
  console.log('='.repeat(50));
}

/**
 * Validates environment and exits if critical errors are found
 */
export function validateEnvironmentOrExit(): void {
  const result = validateEnvironment();
  printValidationReport(result);
  
  if (!result.isValid) {
    console.error('\n💥 Critical environment validation errors found. Server cannot start.');
    process.exit(1);
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Continuing with warnings. Please address them when possible.\n');
  } else {
    console.log('\n🎉 Environment validation completed successfully!\n');
  }
}

export default {
  validateEnvironment,
  printValidationReport,
  validateEnvironmentOrExit
};