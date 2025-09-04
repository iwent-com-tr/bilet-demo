import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import webpush from 'web-push';
import { WebPushService, type PushSubscriptionData, type NotificationPayload } from './web-push.service.js';

// Mock web-push module
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

// Mock VAPID config
vi.mock('./vapid-config.js', () => ({
  getVapidConfig: vi.fn(() => ({
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
    subject: 'mailto:test@example.com',
  })),
}));

describe('WebPushService', () => {
  let webPushService: WebPushService;
  let mockSubscription: PushSubscriptionData;
  let mockPayload: NotificationPayload;

  beforeEach(() => {
    vi.clearAllMocks();
    webPushService = new WebPushService(2); // Low concurrency for testing
    
    mockSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
    };

    mockPayload = {
      type: 'event_update',
      eventId: 'test-event-id',
      title: 'Test Event Updated',
      body: 'The event time has been changed',
      url: '/events/test-event-id',
      icon: '/icon-192x192.png',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with VAPID configuration', () => {
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'test-public-key',
        'test-private-key'
      );
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      vi.mocked(webpush.sendNotification).mockResolvedValue(undefined);

      await webPushService.sendNotification(mockSubscription, mockPayload);

      expect(webpush.sendNotification).toHaveBeenCalledWith(
        mockSubscription,
        JSON.stringify(mockPayload),
        {
          TTL: 86400,
          urgency: 'normal',
          topic: undefined,
        }
      );
    });

    it('should use custom options when provided', async () => {
      vi.mocked(webpush.sendNotification).mockResolvedValue(undefined);

      const options = {
        ttl: 3600,
        urgency: 'high' as const,
        topic: 'event-updates',
      };

      await webPushService.sendNotification(mockSubscription, mockPayload, options);

      expect(webpush.sendNotification).toHaveBeenCalledWith(
        mockSubscription,
        JSON.stringify(mockPayload),
        {
          TTL: 3600,
          urgency: 'high',
          topic: 'event-updates',
        }
      );
    });

    it('should handle 404 error (invalid subscription)', async () => {
      const error = new Error('Subscription not found');
      (error as any).statusCode = 404;
      vi.mocked(webpush.sendNotification).mockRejectedValue(error);

      await expect(webPushService.sendNotification(mockSubscription, mockPayload))
        .rejects.toThrow('Push subscription no longer valid: 404');
    });

    it('should handle 410 error (subscription expired)', async () => {
      const error = new Error('Subscription expired');
      (error as any).statusCode = 410;
      vi.mocked(webpush.sendNotification).mockRejectedValue(error);

      await expect(webPushService.sendNotification(mockSubscription, mockPayload))
        .rejects.toThrow('Push subscription no longer valid: 410');
    });

    it('should handle 413 error (payload too large)', async () => {
      const error = new Error('Payload too large');
      (error as any).statusCode = 413;
      vi.mocked(webpush.sendNotification).mockRejectedValue(error);

      await expect(webPushService.sendNotification(mockSubscription, mockPayload))
        .rejects.toThrow('Push notification payload too large');
    });

    it('should handle 429 error (rate limited)', async () => {
      const error = new Error('Rate limited');
      (error as any).statusCode = 429;
      vi.mocked(webpush.sendNotification).mockRejectedValue(error);

      await expect(webPushService.sendNotification(mockSubscription, mockPayload))
        .rejects.toThrow('Push service rate limit exceeded');
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send notifications to multiple subscriptions', async () => {
      const subscriptions = [
        mockSubscription,
        { ...mockSubscription, endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-2' },
      ];

      vi.mocked(webpush.sendNotification).mockResolvedValue(undefined);

      const result = await webPushService.sendBulkNotifications(subscriptions, mockPayload);

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.invalidEndpoints).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failure', async () => {
      const subscriptions = [
        mockSubscription,
        { ...mockSubscription, endpoint: 'https://fcm.googleapis.com/fcm/send/invalid-endpoint' },
      ];

      vi.mocked(webpush.sendNotification)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(Object.assign(new Error('Not found'), { statusCode: 404 }));

      const result = await webPushService.sendBulkNotifications(subscriptions, mockPayload);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.invalidEndpoints).toContain('https://fcm.googleapis.com/fcm/send/invalid-endpoint');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].statusCode).toBe(404);
    });

    it('should track invalid endpoints for cleanup', async () => {
      const subscriptions = [
        { ...mockSubscription, endpoint: 'https://fcm.googleapis.com/fcm/send/expired-1' },
        { ...mockSubscription, endpoint: 'https://fcm.googleapis.com/fcm/send/expired-2' },
      ];

      vi.mocked(webpush.sendNotification)
        .mockRejectedValueOnce(Object.assign(new Error('Not found'), { statusCode: 404 }))
        .mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }));

      const result = await webPushService.sendBulkNotifications(subscriptions, mockPayload);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.invalidEndpoints).toHaveLength(2);
      expect(result.invalidEndpoints).toContain('https://fcm.googleapis.com/fcm/send/expired-1');
      expect(result.invalidEndpoints).toContain('https://fcm.googleapis.com/fcm/send/expired-2');
    });
  });

  describe('getVapidPublicKey', () => {
    it('should return the VAPID public key', () => {
      const publicKey = webPushService.getVapidPublicKey();
      expect(publicKey).toBe('test-public-key');
    });
  });

  describe('validatePayload', () => {
    it('should validate a correct payload', () => {
      const result = webPushService.validatePayload(mockPayload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject payload without title', () => {
      const invalidPayload = { ...mockPayload, title: '' };
      const result = webPushService.validatePayload(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject payload without body', () => {
      const invalidPayload = { ...mockPayload, body: '' };
      const result = webPushService.validatePayload(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body is required');
    });

    it('should reject payload without URL', () => {
      const invalidPayload = { ...mockPayload, url: '' };
      const result = webPushService.validatePayload(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URL is required');
    });

    it('should reject payload with title too long', () => {
      const invalidPayload = { ...mockPayload, title: 'a'.repeat(101) };
      const result = webPushService.validatePayload(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title should not exceed 100 characters');
    });

    it('should reject payload with body too long', () => {
      const invalidPayload = { ...mockPayload, body: 'a'.repeat(201) };
      const result = webPushService.validatePayload(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body should not exceed 200 characters');
    });

    it('should reject payload that is too large', () => {
      const largePayload = {
        ...mockPayload,
        body: 'a'.repeat(4000), // Very large body
      };
      const result = webPushService.validatePayload(largePayload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Payload size exceeds 4KB limit');
    });
  });

  describe('trimPayload', () => {
    it('should trim title if too long', () => {
      const longTitlePayload = { ...mockPayload, title: 'a'.repeat(101) };
      const trimmed = webPushService.trimPayload(longTitlePayload);
      expect(trimmed.title).toHaveLength(100);
      expect(trimmed.title?.endsWith('...')).toBe(true);
    });

    it('should trim body if too long', () => {
      const longBodyPayload = { ...mockPayload, body: 'a'.repeat(201) };
      const trimmed = webPushService.trimPayload(longBodyPayload);
      expect(trimmed.body).toHaveLength(200);
      expect(trimmed.body?.endsWith('...')).toBe(true);
    });

    it('should remove optional fields if payload is too large', () => {
      // Create a payload that will definitely be over 4KB
      const largePayload = {
        type: 'event_update',
        eventId: 'test-event-id',
        title: 'a'.repeat(100), // Will be trimmed to 100 chars
        body: 'b'.repeat(200), // Will be trimmed to 200 chars  
        url: '/events/test-event-id',
        icon: '/large-icon.png',
        badge: '/badge.png',
        actions: [{ action: 'view', title: 'View Event' }],
        change: { field: 'time', oldValue: 'x'.repeat(2000), newValue: 'y'.repeat(2000) }, // Large change data
      };
      
      const trimmed = webPushService.trimPayload(largePayload);
      expect(trimmed.icon).toBeUndefined();
      expect(trimmed.badge).toBeUndefined();
      expect(trimmed.actions).toBeUndefined();
      expect(trimmed.change).toBeUndefined();
    });

    it('should preserve required fields', () => {
      const largePayload = { ...mockPayload, body: 'a'.repeat(4000) };
      const trimmed = webPushService.trimPayload(largePayload);
      expect(trimmed.type).toBe(mockPayload.type);
      expect(trimmed.eventId).toBe(mockPayload.eventId);
      expect(trimmed.url).toBe(mockPayload.url);
    });
  });
});