import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PushController } from './push.controller.js';
import { 
  SubscribeRequestSchema, 
  UnsubscribeRequestSchema, 
  ManualNotificationRequestSchema 
} from './push.dto.js';

// Mock dependencies
vi.mock('../../lib/push/push-subscription.service.js');
vi.mock('../../lib/push/web-push.service.js');
vi.mock('../../lib/push/vapid-config.js');
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Push Controller Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DTO Validation', () => {
    it('should validate subscribe request data', () => {
      const validData = {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key',
          },
        },
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      const result = SubscribeRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid subscribe request data', () => {
      const invalidData = {
        subscription: {
          endpoint: 'invalid-url',
          keys: {
            p256dh: '',
            auth: 'test-auth-key',
          },
        },
      };

      const result = SubscribeRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Unsubscribe Request Validation', () => {
    it('should validate unsubscribe request data', () => {
      const validData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      };

      const result = UnsubscribeRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid unsubscribe request data', () => {
      const invalidData = {
        endpoint: 'invalid-url',
      };

      const result = UnsubscribeRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Manual Notification Request Validation', () => {
    it('should validate manual notification request data', () => {
      const validData = {
        payload: {
          title: 'Test Notification',
          body: 'This is a test notification',
          url: '/events/123', // Use relative URL which is always allowed
        },
        targetUserIds: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
      };

      const result = ManualNotificationRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid notification payload', () => {
      const invalidData = {
        payload: {
          title: '', // Empty title should fail
          body: 'Test body',
          url: 'invalid-url',
        },
      };

      const result = ManualNotificationRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Controller Instantiation', () => {
    it('should create push controller instance', () => {
      const controller = new PushController();
      expect(controller).toBeDefined();
      expect(typeof controller.getPublicKey).toBe('function');
      expect(typeof controller.subscribe).toBe('function');
      expect(typeof controller.unsubscribe).toBe('function');
      expect(typeof controller.getUserSubscriptions).toBe('function');
      expect(typeof controller.sendEventNotification).toBe('function');
    });
  });

});