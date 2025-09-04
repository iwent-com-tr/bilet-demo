import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PushSubscriptionService } from './push-subscription.service.js';
import { WebPushService } from './web-push.service.js';
import { ErrorTrackingService } from './error-tracking.service.js';
import { UserTargetingService } from '../user-targeting.service.js';

// Mock web-push
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

describe('Subscription Lifecycle Integration Tests', () => {
  let prisma: PrismaClient;
  let pushSubscriptionService: PushSubscriptionService;
  let webPushService: WebPushService;
  let errorTrackingService: ErrorTrackingService;
  let userTargetingService: UserTargetingService;

  const mockUser = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    city: 'Istanbul',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Prisma client
    prisma = {
      pushSubscription: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      userNotificationPreference: {
        groupBy: vi.fn(),
      },
    } as unknown as PrismaClient;

    // Initialize services
    pushSubscriptionService = new PushSubscriptionService(prisma);
    webPushService = new WebPushService(5);
    errorTrackingService = new ErrorTrackingService(prisma);
    userTargetingService = new UserTargetingService(prisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Subscription Creation and Management', () => {
    it('should handle complete subscription lifecycle', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
      };

      const createData = {
        userId: mockUser.id,
        subscription: subscriptionData,
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      // Step 1: Create subscription
      const createdSubscription = {
        id: 'sub-123',
        userId: mockUser.id,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        userAgent: 'Mozilla/5.0 Test Browser',
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      vi.mocked(prisma.pushSubscription.create).mockResolvedValue(createdSubscription as any);

      const result = await pushSubscriptionService.createSubscription(createData);
      expect(result).toEqual(createdSubscription);

      // Step 2: Verify subscription can be retrieved
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([createdSubscription] as any);

      const userSubscriptions = await pushSubscriptionService.getUserSubscriptions(mockUser.id);
      expect(userSubscriptions).toHaveLength(1);
      expect(userSubscriptions[0].endpoint).toBe(subscriptionData.endpoint);

      // Step 3: Test notification sending
      const webpush = await import('web-push');
      vi.mocked(webpush.default.sendNotification).mockResolvedValue(undefined as any);

      const pushSubscriptionData = pushSubscriptionService.toPushSubscriptionData(createdSubscription);
      const payload = {
        type: 'test',
        eventId: 'event-123',
        title: 'Test Notification',
        body: 'This is a test notification',
        url: '/test',
      };

      await webPushService.sendNotification(pushSubscriptionData, payload);

      expect(webpush.default.sendNotification).toHaveBeenCalledWith(
        pushSubscriptionData,
        JSON.stringify(payload),
        expect.objectContaining({
          TTL: 86400,
          urgency: 'normal',
        })
      );

      // Step 4: Update last seen
      const updatedSubscription = { ...createdSubscription, lastSeenAt: new Date() };
      vi.mocked(prisma.pushSubscription.update).mockResolvedValue(updatedSubscription as any);

      const updateResult = await pushSubscriptionService.updateLastSeen(subscriptionData.endpoint);
      expect(updateResult).toEqual(updatedSubscription);

      // Step 5: Disable subscription
      const disabledSubscription = { ...createdSubscription, enabled: false };
      vi.mocked(prisma.pushSubscription.update).mockResolvedValue(disabledSubscription as any);

      const disableResult = await pushSubscriptionService.disableSubscription(subscriptionData.endpoint);
      expect(disableResult).toEqual(disabledSubscription);

      // Step 6: Clean up subscription
      vi.mocked(prisma.pushSubscription.delete).mockResolvedValue(createdSubscription as any);

      const deleteResult = await pushSubscriptionService.deleteSubscription(subscriptionData.endpoint);
      expect(deleteResult).toBe(true);
    });

    it('should handle subscription conflicts and updates', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/existing-endpoint',
        keys: {
          p256dh: 'original-p256dh-key',
          auth: 'original-auth-key',
        },
      };

      const createData = {
        userId: mockUser.id,
        subscription: subscriptionData,
        userAgent: 'Mozilla/5.0 Original Browser',
      };

      // Mock unique constraint violation
      const duplicateError = new Error('Unique constraint violation');
      (duplicateError as any).code = 'P2002';
      (duplicateError as any).meta = { target: ['endpoint'] };

      vi.mocked(prisma.pushSubscription.create).mockRejectedValue(duplicateError);

      // Mock successful update
      const updatedSubscription = {
        id: 'existing-sub-123',
        userId: mockUser.id,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        userAgent: 'Mozilla/5.0 Original Browser',
        enabled: true,
        createdAt: new Date('2024-01-01'),
        lastSeenAt: new Date(),
      };

      vi.mocked(prisma.pushSubscription.update).mockResolvedValue(updatedSubscription as any);

      // Should handle conflict by updating existing subscription
      const result = await pushSubscriptionService.createSubscription(createData);

      expect(result).toEqual(updatedSubscription);
      expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
        where: { endpoint: subscriptionData.endpoint },
        data: {
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
          userAgent: 'Mozilla/5.0 Original Browser',
          enabled: true,
          lastSeenAt: expect.any(Date),
        },
      });

      // Now update with new keys
      const newSubscriptionData = {
        endpoint: subscriptionData.endpoint,
        keys: {
          p256dh: 'updated-p256dh-key',
          auth: 'updated-auth-key',
        },
      };

      const newCreateData = {
        userId: mockUser.id,
        subscription: newSubscriptionData,
        userAgent: 'Mozilla/5.0 Updated Browser',
      };

      const finalUpdatedSubscription = {
        ...updatedSubscription,
        p256dh: newSubscriptionData.keys.p256dh,
        auth: newSubscriptionData.keys.auth,
        userAgent: 'Mozilla/5.0 Updated Browser',
        lastSeenAt: new Date(),
      };

      vi.mocked(prisma.pushSubscription.create).mockRejectedValue(duplicateError);
      vi.mocked(prisma.pushSubscription.update).mockResolvedValue(finalUpdatedSubscription as any);

      const finalResult = await pushSubscriptionService.createSubscription(newCreateData);

      expect(finalResult).toEqual(finalUpdatedSubscription);
      expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
        where: { endpoint: subscriptionData.endpoint },
        data: {
          p256dh: newSubscriptionData.keys.p256dh,
          auth: newSubscriptionData.keys.auth,
          userAgent: 'Mozilla/5.0 Updated Browser',
          enabled: true,
          lastSeenAt: expect.any(Date),
        },
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid subscription cleanup', async () => {
      const invalidSubscription = {
        id: 'invalid-sub-123',
        userId: mockUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/invalid-endpoint',
        p256dh: 'invalid-p256dh-key',
        auth: 'invalid-auth-key',
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      // Mock notification failure
      const webpush = await import('web-push');
      const notFoundError = new Error('Subscription not found');
      (notFoundError as any).statusCode = 404;
      vi.mocked(webpush.default.sendNotification).mockRejectedValue(notFoundError);

      const pushSubscriptionData = pushSubscriptionService.toPushSubscriptionData(invalidSubscription);
      const payload = {
        type: 'test',
        eventId: 'event-123',
        title: 'Test Notification',
        body: 'This will fail',
        url: '/test',
      };

      // Step 1: Attempt to send notification (will fail)
      await expect(
        webPushService.sendNotification(pushSubscriptionData, payload)
      ).rejects.toThrow('Push subscription no longer valid: 404');

      // Step 2: Track the error
      await errorTrackingService.trackError(
        invalidSubscription.endpoint,
        notFoundError as any,
        'job-123',
        'event-123'
      );

      const errorStats = errorTrackingService.getErrorStats();
      expect(errorStats.totalErrors).toBe(1);
      expect(errorStats.errorsByStatusCode[404]).toBe(1);
      expect(errorStats.errorsByType['invalid_endpoint']).toBe(1);
      expect(errorStats.invalidEndpointsFound).toBe(1);

      // Step 3: Cleanup should be performed automatically
      vi.mocked(prisma.pushSubscription.delete).mockResolvedValue(invalidSubscription as any);

      const cleanupResult = await pushSubscriptionService.cleanupInvalidSubscription(
        invalidSubscription.endpoint
      );
      expect(cleanupResult).toBe(true);
      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
        where: { endpoint: invalidSubscription.endpoint },
      });

      // Step 4: Verify error stats are updated
      const updatedStats = errorTrackingService.getErrorStats();
      expect(updatedStats.subscriptionsCleanedUp).toBe(1);
    });

    it('should handle bulk cleanup of invalid subscriptions', async () => {
      const invalidEndpoints = [
        'https://fcm.googleapis.com/fcm/send/invalid-1',
        'https://fcm.googleapis.com/fcm/send/invalid-2',
        'https://fcm.googleapis.com/fcm/send/invalid-3',
      ];

      // Mock bulk delete
      vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 3 });

      const cleanupResult = await pushSubscriptionService.cleanupInvalidSubscriptions(invalidEndpoints);

      expect(cleanupResult).toBe(3);
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          endpoint: { in: invalidEndpoints },
        },
      });

      // Test with empty array
      const emptyResult = await pushSubscriptionService.cleanupInvalidSubscriptions([]);
      expect(emptyResult).toBe(0);
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledTimes(1); // Only called once above
    });

    it('should handle old subscription cleanup', async () => {
      // Mock cleanup of old disabled subscriptions
      vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 5 });

      const cleanupResult = await pushSubscriptionService.cleanupOldDisabledSubscriptions(30);

      expect(cleanupResult).toBe(5);
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          enabled: false,
          lastSeenAt: {
            lt: expect.any(Date),
          },
        },
      });

      // Verify the cutoff date is approximately 30 days ago
      const call = vi.mocked(prisma.pushSubscription.deleteMany).mock.calls[0];
      const cutoffDate = call[0].where.lastSeenAt.lt;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      expect(cutoffDate.getTime()).toBeCloseTo(thirtyDaysAgo.getTime(), -4); // Within 10 seconds
    });
  });

  describe('User Targeting Integration', () => {
    it('should integrate subscription management with user targeting', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub-1' }, { id: 'sub-2' }],
        },
        {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub-3' }],
        },
      ];

      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
          p256dh: 'key-1',
          auth: 'auth-1',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-2',
          p256dh: 'key-2',
          auth: 'auth-2',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
        {
          id: 'sub-3',
          userId: 'user-2',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-3',
          p256dh: 'key-3',
          auth: 'auth-3',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ];

      // Step 1: Get users with event tickets
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

      const targetedUsers = await userTargetingService.getUsersWithEventTickets('event-456');

      expect(targetedUsers).toHaveLength(2);
      expect(targetedUsers[0].subscriptionCount).toBe(2);
      expect(targetedUsers[1].subscriptionCount).toBe(1);

      // Step 2: Get subscriptions for those users
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions as any);

      const subscriptions = await pushSubscriptionService.getSubscriptionsForEventTicketHolders('event-456');
      expect(subscriptions).toHaveLength(3);

      // Step 3: Convert to push subscription data format
      const pushSubscriptionDataArray = pushSubscriptionService.toPushSubscriptionDataArray(subscriptions);

      expect(pushSubscriptionDataArray).toHaveLength(3);
      expect(pushSubscriptionDataArray[0]).toEqual({
        endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
        keys: {
          p256dh: 'key-1',
          auth: 'auth-1',
        },
      });

      // Step 4: Send bulk notifications
      const webpush = await import('web-push');
      vi.mocked(webpush.default.sendNotification).mockResolvedValue(undefined as any);

      const payload = {
        type: 'event_update',
        eventId: 'event-456',
        title: 'Event Updated',
        body: 'Your event has been updated',
        url: '/events/event-456',
      };

      const bulkResult = await webPushService.sendBulkNotifications(
        pushSubscriptionDataArray,
        payload
      );

      expect(bulkResult.sent).toBe(3);
      expect(bulkResult.failed).toBe(0);
      expect(bulkResult.invalidEndpoints).toHaveLength(0);
      expect(webpush.default.sendNotification).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure in bulk operations', async () => {
      const subscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/valid-endpoint',
          p256dh: 'valid-key',
          auth: 'valid-auth',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          endpoint: 'https://fcm.googleapis.com/fcm/send/invalid-endpoint',
          p256dh: 'invalid-key',
          auth: 'invalid-auth',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
        {
          id: 'sub-3',
          userId: 'user-3',
          endpoint: 'https://fcm.googleapis.com/fcm/send/rate-limited-endpoint',
          p256dh: 'rate-limited-key',
          auth: 'rate-limited-auth',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ];

      const pushSubscriptionDataArray = pushSubscriptionService.toPushSubscriptionDataArray(subscriptions);

      const webpush = await import('web-push');
      
      // Mock mixed responses
      vi.mocked(webpush.default.sendNotification)
        .mockResolvedValueOnce(undefined as any) // Success
        .mockRejectedValueOnce(Object.assign(new Error('Not found'), { statusCode: 404 })) // Invalid endpoint
        .mockRejectedValueOnce(Object.assign(new Error('Rate limited'), { statusCode: 429 })); // Rate limited

      const payload = {
        type: 'new_event',
        eventId: 'event-789',
        title: 'New Event',
        body: 'Check out this new event',
        url: '/events/event-789',
      };

      const bulkResult = await webPushService.sendBulkNotifications(
        pushSubscriptionDataArray,
        payload
      );

      expect(bulkResult.sent).toBe(1);
      expect(bulkResult.failed).toBe(2);
      expect(bulkResult.invalidEndpoints).toHaveLength(1);
      expect(bulkResult.invalidEndpoints[0]).toBe('https://fcm.googleapis.com/fcm/send/invalid-endpoint');
      expect(bulkResult.errors).toHaveLength(2);

      // Check error details
      const notFoundError = bulkResult.errors.find(e => e.statusCode === 404);
      const rateLimitError = bulkResult.errors.find(e => e.statusCode === 429);

      expect(notFoundError).toBeDefined();
      expect(notFoundError?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/invalid-endpoint');

      expect(rateLimitError).toBeDefined();
      expect(rateLimitError?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/rate-limited-endpoint');

      // Step 2: Clean up invalid endpoints
      vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 1 });

      const cleanupResult = await pushSubscriptionService.cleanupInvalidSubscriptions(
        bulkResult.invalidEndpoints
      );

      expect(cleanupResult).toBe(1);
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          endpoint: { in: ['https://fcm.googleapis.com/fcm/send/invalid-endpoint'] },
        },
      });
    });
  });

  describe('Subscription Validation and Data Integrity', () => {
    it('should validate subscription data thoroughly', () => {
      // Valid subscription data
      const validData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/valid-endpoint',
        keys: {
          p256dh: 'valid-p256dh-key',
          auth: 'valid-auth-key',
        },
      };

      const validResult = pushSubscriptionService.validateSubscriptionData(validData);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid endpoint URL
      const invalidEndpoint = {
        ...validData,
        endpoint: 'not-a-valid-url',
      };

      const invalidEndpointResult = pushSubscriptionService.validateSubscriptionData(invalidEndpoint);
      expect(invalidEndpointResult.valid).toBe(false);
      expect(invalidEndpointResult.errors).toContain('endpoint: Invalid endpoint URL');

      // Missing p256dh key
      const missingP256dh = {
        ...validData,
        keys: {
          ...validData.keys,
          p256dh: '',
        },
      };

      const missingP256dhResult = pushSubscriptionService.validateSubscriptionData(missingP256dh);
      expect(missingP256dhResult.valid).toBe(false);
      expect(missingP256dhResult.errors).toContain('keys.p256dh: p256dh key is required');

      // Missing auth key
      const missingAuth = {
        ...validData,
        keys: {
          ...validData.keys,
          auth: '',
        },
      };

      const missingAuthResult = pushSubscriptionService.validateSubscriptionData(missingAuth);
      expect(missingAuthResult.valid).toBe(false);
      expect(missingAuthResult.errors).toContain('keys.auth: auth key is required');

      // Multiple validation errors
      const multipleErrors = {
        endpoint: 'invalid-url',
        keys: {
          p256dh: '',
          auth: '',
        },
      };

      const multipleErrorsResult = pushSubscriptionService.validateSubscriptionData(multipleErrors);
      expect(multipleErrorsResult.valid).toBe(false);
      expect(multipleErrorsResult.errors.length).toBeGreaterThan(1);
    });

    it('should handle subscription count operations', async () => {
      // Mock user subscription count
      vi.mocked(prisma.pushSubscription.count).mockResolvedValue(3);

      const userCount = await pushSubscriptionService.getUserSubscriptionCount(mockUser.id);
      expect(userCount).toBe(3);
      expect(prisma.pushSubscription.count).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          enabled: true,
        },
      });

      // Mock user subscription count including disabled
      vi.mocked(prisma.pushSubscription.count).mockResolvedValue(5);

      const allUserCount = await pushSubscriptionService.getUserSubscriptionCount(mockUser.id, false);
      expect(allUserCount).toBe(5);
      expect(prisma.pushSubscription.count).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
        },
      });

      // Mock total subscription count
      vi.mocked(prisma.pushSubscription.count).mockResolvedValue(1000);

      const totalCount = await pushSubscriptionService.getTotalSubscriptionCount();
      expect(totalCount).toBe(1000);
      expect(prisma.pushSubscription.count).toHaveBeenCalledWith({
        where: { enabled: true },
      });

      // Mock total subscription count including disabled
      vi.mocked(prisma.pushSubscription.count).mockResolvedValue(1200);

      const allTotalCount = await pushSubscriptionService.getTotalSubscriptionCount(false);
      expect(allTotalCount).toBe(1200);
      expect(prisma.pushSubscription.count).toHaveBeenCalledWith({
        where: {},
      });
    });
  });
});