// src/lib/google-oauth-config.ts

/**
 * Get the correct Google OAuth redirect URL based on environment
 * This ensures consistency between frontend, backend, and Google Console
 */
export function getGoogleRedirectUrl(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isHttps = process.env.HTTPS === 'true';
  const apiPrefix = process.env.API_PREFIX || '/api/v1';

  // Remove leading slash from apiPrefix if present, then add it back with auth path
  const cleanApiPrefix = apiPrefix.replace(/^\/+/, '');
  const fullPath = `/${cleanApiPrefix}/auth/google/callback`;

  if (isDevelopment) {
    // Development environment - use localhost with correct port
    if (isHttps) {
      // HTTPS dev server (dev:https script)
      return `https://localhost:3000${fullPath}`;
    } else {
      // HTTP dev server (regular dev script)
      return `http://localhost:3000${fullPath}`;
    }
  } else {
    // Production environment - use production domain
    const prodUrl = process.env.GOOGLE_WEBHOOK_PROD;
    if (prodUrl) {
      // If GOOGLE_WEBHOOK_PROD includes full path, use it as is
      if (prodUrl.includes('/auth/google/callback')) {
        return prodUrl;
      }
      // Otherwise, construct with API prefix
      return prodUrl.replace(/\/+$/, '') + fullPath;
    }
    return `https://iwent.com.tr${fullPath}`;
  }
}

/**
 * Get complete Google OAuth configuration
 */
export function getGoogleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUrl: getGoogleRedirectUrl(),
    isDevelopment: process.env.NODE_ENV === 'development',
    isHttps: process.env.HTTPS === 'true',
    environment: process.env.NODE_ENV
  };
}

/**
 * Validate Google OAuth configuration
 */
export function validateGoogleConfig(): { isValid: boolean; errors: string[] } {
  const config = getGoogleConfig();
  const errors: string[] = [];

  if (!config.clientId) {
    errors.push('GOOGLE_CLIENT_ID is required');
  }

  if (!config.clientSecret) {
    errors.push('GOOGLE_CLIENT_SECRET is required');
  }

  if (!config.redirectUrl) {
    errors.push('Redirect URL could not be determined');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
