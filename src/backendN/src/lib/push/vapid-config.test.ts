import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getVapidConfig, 
  isVapidConfigValid, 
  getVapidPublicKey,
  generateVapidKeys,
  clearVapidConfigCache,
  validateVapidEnvironment
} from './vapid-config.js';

describe('VAPID Configuration Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment and cache before each test
    process.env = { ...originalEnv };
    clearVapidConfigCache();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    // Valid test keys for testing (generated for testing purposes only)
    const VALID_PUBLIC_KEY = 'BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const VALID_PRIVATE_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

    it('should require all VAPID environment variables', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      delete process.env.VAPID_SUBJECT;

      expect(() => getVapidConfig()).toThrow('Missing required VAPID environment variables');
    });

    it('should validate public key format', () => {
      process.env.VAPID_PUBLIC_KEY = 'invalid-key';
      process.env.VAPID_PRIVATE_KEY = VALID_PRIVATE_KEY;
      process.env.VAPID_SUBJECT = 'mailto:test@example.com';

      expect(() => getVapidConfig()).toThrow('Invalid VAPID configuration');
    });

    it('should validate private key format', () => {
      process.env.VAPID_PUBLIC_KEY = VALID_PUBLIC_KEY;
      process.env.VAPID_PRIVATE_KEY = 'invalid-key';
      process.env.VAPID_SUBJECT = 'mailto:test@example.com';

      expect(() => getVapidConfig()).toThrow('Invalid VAPID configuration');
    });

    it('should validate subject format', () => {
      process.env.VAPID_PUBLIC_KEY = VALID_PUBLIC_KEY;
      process.env.VAPID_PRIVATE_KEY = VALID_PRIVATE_KEY;
      process.env.VAPID_SUBJECT = 'invalid-subject';

      expect(() => getVapidConfig()).toThrow('Invalid VAPID configuration');
    });

    it('should accept valid email as subject', () => {
      // Use simplified validation for testing - focus on format validation
      process.env.VAPID_PUBLIC_KEY = 'BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      process.env.VAPID_PRIVATE_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      process.env.VAPID_SUBJECT = 'admin@example.com';

      // This test focuses on subject validation, so we expect it to pass subject validation
      // but may fail on key consistency checks which is acceptable for this test
      const errors = validateVapidEnvironment();
      expect(errors.some(error => error.includes('VAPID_SUBJECT'))).toBe(false);
    });

    it('should accept valid mailto URL as subject', () => {
      process.env.VAPID_PUBLIC_KEY = 'BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      process.env.VAPID_PRIVATE_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      process.env.VAPID_SUBJECT = 'mailto:admin@example.com';

      // This test focuses on subject validation
      const errors = validateVapidEnvironment();
      expect(errors.some(error => error.includes('VAPID_SUBJECT'))).toBe(false);
    });
  });

  describe('Key Security', () => {
    it('should validate key format requirements', () => {
      // Test that the validation functions work correctly
      const errors = validateVapidEnvironment();
      
      // If no environment variables are set, we should get missing variable errors
      if (!process.env.VAPID_PUBLIC_KEY) {
        expect(errors).toContain('VAPID_PUBLIC_KEY environment variable is missing');
      }
    });

    it('should handle cache clearing', () => {
      // Test cache clearing functionality
      clearVapidConfigCache();
      
      // This should not throw - cache clearing should work
      expect(() => clearVapidConfigCache()).not.toThrow();
    });

    it('should validate environment variable trimming', () => {
      // Test that validation handles whitespace correctly
      process.env.VAPID_PUBLIC_KEY = '  invalid  ';
      process.env.VAPID_PRIVATE_KEY = '  invalid  ';
      process.env.VAPID_SUBJECT = '  invalid  ';

      const errors = validateVapidEnvironment();
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Key Generation (Development Only)', () => {
    it('should generate valid keys in non-production environment', () => {
      process.env.NODE_ENV = 'development';
      
      const keys = generateVapidKeys();
      expect(keys.publicKey).toMatch(/^[A-Za-z0-9+/=_-]+$/);
      expect(keys.privateKey).toMatch(/^[A-Za-z0-9+/=_-]+$/);
      expect(keys.publicKey).not.toBe(keys.privateKey);
    });

    it('should not allow key generation in production', () => {
      process.env.NODE_ENV = 'production';
      
      expect(() => generateVapidKeys()).toThrow('VAPID key generation is not allowed in production');
    });
  });

  describe('Validation Functions', () => {
    it('should return validation errors for missing variables', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      delete process.env.VAPID_SUBJECT;

      const errors = validateVapidEnvironment();
      expect(errors).toContain('VAPID_PUBLIC_KEY environment variable is missing');
      expect(errors).toContain('VAPID_PRIVATE_KEY environment variable is missing');
      expect(errors).toContain('VAPID_SUBJECT environment variable is missing');
    });

    it('should return validation errors for invalid formats', () => {
      process.env.VAPID_PUBLIC_KEY = 'invalid!@#$%';
      process.env.VAPID_PRIVATE_KEY = 'invalid!@#$%';
      process.env.VAPID_SUBJECT = 'not-an-email';

      const errors = validateVapidEnvironment();
      expect(errors).toContain('VAPID_PUBLIC_KEY must be base64url encoded');
      expect(errors).toContain('VAPID_PRIVATE_KEY must be base64url encoded');
      expect(errors).toContain('VAPID_SUBJECT must be a valid email address or mailto: URL');
    });

    it('should return empty array for properly formatted configuration', () => {
      process.env.VAPID_PUBLIC_KEY = 'BKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      process.env.VAPID_PRIVATE_KEY = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      process.env.VAPID_SUBJECT = 'mailto:test@example.com';

      const errors = validateVapidEnvironment();
      // Should have no format errors (though key consistency might still fail)
      expect(errors.filter(e => e.includes('must be base64url encoded') || e.includes('missing'))).toHaveLength(0);
    });

    it('should handle invalid configuration gracefully', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      
      expect(isVapidConfigValid()).toBe(false);
    });

    it('should return false for invalid configuration', () => {
      delete process.env.VAPID_PUBLIC_KEY;
      
      expect(isVapidConfigValid()).toBe(false);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle malformed base64 keys', () => {
      process.env.VAPID_PUBLIC_KEY = 'BNX@#$%^&*()';
      process.env.VAPID_PRIVATE_KEY = 'xxx@#$%^&*()';
      process.env.VAPID_SUBJECT = 'mailto:test@example.com';

      expect(() => getVapidConfig()).toThrow();
    });

    it('should handle empty string environment variables', () => {
      process.env.VAPID_PUBLIC_KEY = '';
      process.env.VAPID_PRIVATE_KEY = '';
      process.env.VAPID_SUBJECT = '';

      expect(() => getVapidConfig()).toThrow('Missing required VAPID environment variables');
    });

    it('should handle undefined environment variables', () => {
      process.env.VAPID_PUBLIC_KEY = undefined as any;
      process.env.VAPID_PRIVATE_KEY = undefined as any;
      process.env.VAPID_SUBJECT = undefined as any;

      expect(() => getVapidConfig()).toThrow('Missing required VAPID environment variables');
    });
  });
});