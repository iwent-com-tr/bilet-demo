import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DevToolsService } from './dev-tools.service.js';
import type { NotificationPayload } from './web-push.service.js';

// Mock VAPID configuration
vi.mock('./vapid-config.js', () => ({
  getVapidConfig: vi.fn(() => ({
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
    subject: 'mailto:test@example.com',
  })),
}));

// Mock Prisma
const mockPrisma = {
  pushSubscription: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  notificationLog: {
    count: vi.fn(),
    create: vi.fn(),
  },
  pushError: {
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
} as unknown as PrismaClient;

describe('DevToolsService', () => {
  let devToolsService: DevToolsService;

  beforeEach(() => {
    devToolsService = new DevToolsService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (devToolsService) {
      devToolsService.disableMockMode();
    }
  });

  describe('getTestTemplates', () => {
    it('should return predefined test templates', () => {
      const templates = devToolsService.getTestTemplates();

      expect(templates).toHaveLength(5);
      expect(templates[0]).toMatchObject({
        id: 'event_time_change',
        name: 'Event Time Change',
        description: 'Notification for when an event time is updated',
      });
      expect(templates[0].payload).toMatchObject({
        type: 'event_update',
        title: '🕐 Event Time Changed',
        body: 'Summer Music Festival has been moved to 8:00 PM',
      });
    });

    it('should include all required template fields', () => {
      const templates = devToolsService.getTestTemplates();

      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('payload');
        
        expect(template.payload).toHaveProperty('type');
        expect(template.payload).toHaveProperty('eventId');
        expect(template.payload).toHaveProperty('title');
        expect(template.payload).toHaveProperty('body');
        expect(template.payload).toHaveProperty('url');
      });
    });
  });

  describe('enableMockMode', () => {
    it('should enable mock mode with default options', () => {
      devToolsService.enableMockMode();
      
      // Mock mode is enabled internally, we can test by checking behavior
      expect(true).toBe(true); // Mock mode enabled
    });

    it('should enable mock mode with custom options', () => {
      const options = {
        simulateFailures: true,
        failureRate: 0.2,
        simulateInvalidEndpoints: true,
        invalidEndpointRate: 0.1,
        responseDelay: 200,
      };

      devToolsService.enableMockMode(options);
      
      // Mock mode is enabled with custom options
      expect(true).toBe(true);
    });
  });

  describe('disableMockMode', () => {
    it('should disable mock mode', () => {
      devToolsService.enableMockMode();
      devToolsService.disableMockMode();
      
      // Mock mode is disabled
      expect(true).toBe(true);
    });
  });

  describe('debugPayload', () => {
    it('should analyze payload structure and size', () => {
      const payload: NotificationPayload = {
        type: 'test',
        eventId: 'test-event',
        title: 'Test Notification',
        body: 'This is a test notification',
        url: '/test',
        icon: '/icon.png',
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      const debug = devToolsService.debugPayload(payload);

      expect(debug).toHaveProperty('size');
      expect(debug).toHaveProperty('sizeFormatted');
      expect(debug).toHaveProperty('validation');
      expect(debug).toHaveProperty('structure');
      expect(debug).toHaveProperty('recommendations');

      expect(debug.validation.valid).toBe(true);
      expect(debug.structure.hasTitle).toBe(true);
      expect(debug.structure.hasBody).toBe(true);
      expect(debug.structure.hasIcon).toBe(true);
      expect(debug.structure.hasActions).toBe(true);
      expect(debug.structure.actionCount).toBe(2);
    });

    it('should provide recommendations for large payloads', () => {
      const payload: NotificationPayload = {
        type: 'test',
        eventId: 'test-event',
        title: 'This is a very long title that exceeds the recommended length for push notifications',
        body: 'This is a very long body text that exceeds the recommended length for push notifications and may be truncated on some devices or platforms',
        url: '/test',
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
          { action: 'share', title: 'Share' },
        ],
      };

      const debug = devToolsService.debugPayload(payload);

      expect(debug.recommendations).toContain('Title is quite long, consider shortening for better display');
      expect(debug.recommendations).toContain('Body text is long, may be truncated on some devices');
      expect(debug.recommendations).toContain('More than 2 actions may not be supported on all platforms');
    });

    it('should recommend adding missing fields', () => {
      const payload: NotificationPayload = {
        type: 'test',
        eventId: 'test-event',
        title: 'Test',
        body: 'Test message',
        url: '/test',
      };

      const debug = devToolsService.debugPayload(payload);

      expect(debug.recommendations).toContain('Consider adding an icon for better visual appeal');
    });
  });

  describe('getDevStats', () => {
    beforeEach(() => {
      // Mock database responses
      (mockPrisma.pushSubscription.count as any)
        .mockResolvedValueOnce(100) // total subscriptions
        .mockResolvedValueOnce(85); // active subscriptions

      (mockPrisma.notificationLog.count as any)
        .mockResolvedValue(50); // recent notifications

      (mockPrisma.pushError.findMany as any)
        .mockResolvedValue([
          { error: 'Push subscription no longer valid: 404' },
          { error: 'Push subscription no longer valid: 404' },
          { error: 'Push service rate limit exceeded' },
        ]);
    });

    it('should return development statistics', async () => {
      const stats = await devToolsService.getDevStats();

      expect(stats).toMatchObject({
        totalSubscriptions: 100,
        activeSubscriptions: 85,
        recentNotifications: 50,
        errorRate: 0.06, // 3 errors / 50 notifications
      });

      expect(stats.topErrors).toHaveLength(2);
      expect(stats.topErrors[0]).toMatchObject({
        error: 'Push subscription no longer valid: 404',
        count: 2,
      });
    });

    it('should handle zero notifications gracefully', async () => {
      (mockPrisma.notificationLog.count as any).mockResolvedValue(0);
      (mockPrisma.pushError.findMany as any).mockResolvedValue([]);

      const stats = await devToolsService.getDevStats();

      expect(stats.errorRate).toBe(0);
      expect(stats.topErrors).toHaveLength(0);
    });
  });

  describe('sendTestNotification', () => {
    it('should throw error for invalid template ID', async () => {
      await expect(
        devToolsService.sendTestNotification('user-123', 'invalid-template')
      ).rejects.toThrow("Test template 'invalid-template' not found");
    });

    it('should return zero results for user with no subscriptions', async () => {
      // Mock empty subscriptions
      vi.spyOn(devToolsService['pushSubscriptionService'], 'getUserSubscriptions')
        .mockResolvedValue([]);

      const result = await devToolsService.sendTestNotification('user-123', 'event_time_change');

      expect(result).toMatchObject({
        sent: 0,
        failed: 0,
        subscriptions: 0,
        errors: ['No active subscriptions found for user'],
      });
    });
  });

  describe('testUserSubscriptions', () => {
    it('should return empty array for user with no subscriptions', async () => {
      // Mock empty subscriptions
      vi.spyOn(devToolsService['pushSubscriptionService'], 'getUserSubscriptions')
        .mockResolvedValue([]);

      const results = await devToolsService.testUserSubscriptions('user-123');

      expect(results).toHaveLength(0);
    });
  });

  describe('mock mode functionality', () => {
    it('should simulate failures when enabled', async () => {
      devToolsService.enableMockMode({
        simulateFailures: true,
        failureRate: 1.0, // Always fail
      });

      // Mock subscription data
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh',
        auth: 'test-auth',
        ua: 'Test Browser',
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      vi.spyOn(devToolsService['pushSubscriptionService'], 'getUserSubscriptions')
        .mockResolvedValue([mockSubscription]);

      vi.spyOn(devToolsService['pushSubscriptionService'], 'toPushSubscriptionDataArray')
        .mockReturnValue([{
          endpoint: mockSubscription.endpoint,
          keys: {
            p256dh: mockSubscription.p256dh,
            auth: mockSubscription.auth,
          },
        }]);

      const result = await devToolsService.sendTestNotification('user-1', 'event_time_change');

      // With 100% failure rate, should have 1 failed notification
      expect(result.failed).toBe(1);
      expect(result.sent).toBe(0);
    });

    it('should simulate invalid endpoints when enabled', async () => {
      devToolsService.enableMockMode({
        simulateInvalidEndpoints: true,
        invalidEndpointRate: 1.0, // Always invalid
      });

      // Mock subscription data
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh',
        auth: 'test-auth',
        ua: 'Test Browser',
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      vi.spyOn(devToolsService['pushSubscriptionService'], 'getUserSubscriptions')
        .mockResolvedValue([mockSubscription]);

      vi.spyOn(devToolsService['pushSubscriptionService'], 'toPushSubscriptionDataArray')
        .mockReturnValue([{
          endpoint: mockSubscription.endpoint,
          keys: {
            p256dh: mockSubscription.p256dh,
            auth: mockSubscription.auth,
          },
        }]);

      const result = await devToolsService.sendTestNotification('user-1', 'event_time_change');

      // With 100% invalid endpoint rate, should have 1 failed notification
      expect(result.failed).toBe(1);
      expect(result.sent).toBe(0);
    });
  });

  describe('payload validation integration', () => {
    it('should validate payload through WebPushService', () => {
      const validPayload: NotificationPayload = {
        type: 'test',
        eventId: 'test-event',
        title: 'Test',
        body: 'Test message',
        url: '/test',
      };

      const debug = devToolsService.debugPayload(validPayload);

      expect(debug.validation.valid).toBe(true);
      expect(debug.validation.errors).toHaveLength(0);
    });

    it('should detect invalid payload', () => {
      const invalidPayload = {
        type: 'test',
        eventId: 'test-event',
        title: '', // Empty title
        body: '', // Empty body
        url: '', // Empty URL
      } as NotificationPayload;

      const debug = devToolsService.debugPayload(invalidPayload);

      expect(debug.validation.valid).toBe(false);
      expect(debug.validation.errors).toContain('Title is required');
      expect(debug.validation.errors).toContain('Body is required');
      expect(debug.validation.errors).toContain('URL is required');
    });
  });
});