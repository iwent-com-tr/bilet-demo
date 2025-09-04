import { validateVapidEnvironment } from './vapid-config.js';

/**
 * Comprehensive environment validation for push notification system
 */
export interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Validates all environment variables required for secure push notification operation
 * @returns {EnvironmentValidationResult} Validation result with errors and recommendations
 */
export function validatePushEnvironment(): EnvironmentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Validate VAPID configuration
  const vapidErrors = validateVapidEnvironment();
  errors.push(...vapidErrors);

  // Validate Redis configuration for queue system
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    errors.push('Redis configuration missing: Set REDIS_URL or REDIS_HOST');
  }

  // Validate client origin for CSRF protection
  if (!process.env.CLIENT_ORIGIN) {
    warnings.push('CLIENT_ORIGIN not set, using default http://localhost:3001');
    recommendations.push('Set CLIENT_ORIGIN to your production domain for security');
  } else {
    try {
      new URL(process.env.CLIENT_ORIGIN);
    } catch {
      errors.push('CLIENT_ORIGIN must be a valid URL');
    }
  }

  // Check for secure environment practices
  if (process.env.NODE_ENV === 'production') {
    // Production-specific validations
    if (process.env.CLIENT_ORIGIN?.includes('localhost')) {
      warnings.push('CLIENT_ORIGIN points to localhost in production');
    }

    if (!process.env.VAPID_PRIVATE_KEY?.match(/^[A-Za-z0-9+/=_-]{40,}$/)) {
      warnings.push('VAPID private key appears to be weak or improperly formatted');
    }

    // Check for development-only settings
    if (process.env.START_WORKER === 'true') {
      recommendations.push('Consider running notification worker as separate process in production');
    }
  }

  // Validate notification rate limiting settings
  if (process.env.NOTIFICATION_RATE_LIMIT) {
    const rateLimit = parseInt(process.env.NOTIFICATION_RATE_LIMIT);
    if (isNaN(rateLimit) || rateLimit < 1 || rateLimit > 100) {
      warnings.push('NOTIFICATION_RATE_LIMIT should be between 1 and 100');
    }
  }

  // Check for additional security headers
  if (!process.env.ADDITIONAL_ORIGINS && process.env.NODE_ENV === 'production') {
    recommendations.push('Consider setting ADDITIONAL_ORIGINS if you have multiple domains');
  }

  // Validate database connection
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required for push subscription storage');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations,
  };
}

/**
 * Prints a formatted validation report to console
 * @param result Validation result to print
 */
export function printValidationReport(result: EnvironmentValidationResult): void {
  console.log('\n🔍 Push Notification Environment Validation Report');
  console.log('=' .repeat(60));

  if (result.isValid) {
    console.log('✅ Environment validation passed');
  } else {
    console.log('❌ Environment validation failed');
  }

  if (result.errors.length > 0) {
    console.log('\n🚨 Errors (must be fixed):');
    result.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings (should be addressed):');
    result.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }

  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  console.log('=' .repeat(60));
}

/**
 * Validates environment and exits process if critical errors found
 * Useful for startup validation
 */
export function validateEnvironmentOrExit(): void {
  const result = validatePushEnvironment();
  printValidationReport(result);

  if (!result.isValid) {
    console.error('\n💥 Critical environment validation errors found. Exiting...');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Continuing with warnings. Please address them when possible.');
  }
}

/**
 * Environment variable security checker
 * Checks for common security issues in environment configuration
 */
export function checkEnvironmentSecurity(): string[] {
  const issues: string[] = [];

  // Check for potentially exposed secrets
  const sensitiveVars = ['VAPID_PRIVATE_KEY', 'DATABASE_URL', 'REDIS_URL'];
  sensitiveVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Check if value looks like it might be logged or exposed
      if (value.length < 20) {
        issues.push(`${varName} appears to be too short (possible test/dummy value)`);
      }
      
      // Check for common insecure patterns
      if (value.includes('password') || value.includes('123456')) {
        issues.push(`${varName} contains insecure patterns`);
      }
    }
  });

  // Check for development settings in production
  if (process.env.NODE_ENV === 'production') {
    const devSettings = ['DEBUG', 'VERBOSE_LOGGING', 'DISABLE_AUTH'];
    devSettings.forEach(setting => {
      if (process.env[setting] === 'true') {
        issues.push(`${setting} is enabled in production (security risk)`);
      }
    });
  }

  return issues;
}

/**
 * Generates a security checklist for push notification deployment
 */
export function generateSecurityChecklist(): string[] {
  return [
    '✅ VAPID keys generated securely offline',
    '✅ Private keys stored in secure environment variable system',
    '✅ CLIENT_ORIGIN set to production domain',
    '✅ Rate limiting configured appropriately',
    '✅ CSRF protection enabled',
    '✅ Payload sanitization implemented',
    '✅ Database connection secured with SSL',
    '✅ Redis connection secured (if applicable)',
    '✅ Environment variables validated on startup',
    '✅ Key rotation procedure documented and tested',
    '✅ Monitoring and alerting configured',
    '✅ Access logs reviewed and secured',
  ];
}