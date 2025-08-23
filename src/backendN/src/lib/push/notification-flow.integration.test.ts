import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { WebPushService } from './web-push.service.js';
import { PushSubscriptionService } from './push-subscription.service.js';
import { NotificationWorker } from '../queue/notification.worker.js';
import { NotificationService } from '../queue/notification.service.js';
import { UserTargetingService } from '../user-targeting.service.js';
import { ErrorTrackingService } from './error-tracking.service.js';
import { MetricsCollectorService } from './metrics-collector.service.js';

// Mock external dependencies
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock('../queue/index.js', () => ({
  notificationQueue: {
    add: vi.fn(),
    getJob: vi.fn(),
    getWaiting: vi.fn(),
    getActive: vi.fn(),
    getCompleted: vi.fn(),
    getFailed: vi.fn(),
    clean: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  },
  checkQueueHealth: vi.fn(() => ({
    redis: true,
    queue: true,
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
  })),
  JOB_TYPES: {
    EVENT_UPDATE: 'event_update',
    NEW_EVENT: 'new_event',
  },
  EventUpdateJobDataSchema: {
    parse: vi.fn((data) => data),
  },
  NewEventJobDataSchema: {
    parse: vi.fn((data) => data),
  },
}));

describe('Push Notification Integration Tests', () => {
  let prisma: PrismaClient;
  let webPushService: WebPushService;
  let pushSubscriptionService: PushSubscriptionService;
  let notificationService: NotificationService;
  let userTargetingService: UserTargetingService;
  let errorTrackingService: ErrorTrackingService;
  let metricsCollectorService: MetricsCollectorService;

  // Mock data
  const mockUser = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    city: 'Istanbul',
  };

  const mockEvent = {
    id: 'event-456',
    name: 'Test Event',
    slug: 'test-event',
    startDate: new Date('2024-02-01T20:00:00Z'),
    city: 'Istanbul',
    category: 'MUSIC',
    organizer: {
      id: 'organizer-789',
      company: 'Test Organizer',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  };

  const mockSubscription = {
    id: 'sub-123',
    userId: 'user-123',
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    p256dh: 'test-p256dh-key',
    auth: 'test-auth-key',
    enabled: true,
    createdAt: new Date(),
    lastSeenAt: new Date(),
  };

  beforeAll(() => {
    // Create mock Prisma client
    prisma = {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      event: {
        findUnique: vi.fn(),
      },
      pushSubscription: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      userNotificationPreference: {
        groupBy: vi.fn(),
      },
    } as unknown as PrismaClient;

    // Initialize services
    webPushService = new WebPushService(5);
    pushSubscriptionService = new PushSubscriptionService(prisma);
    notificationService = new NotificationService();
    userTargetingService = new UserTargetingService(prisma);
    errorTrackingService = new ErrorTrackingService(prisma);
    metricsCollectorService = new MetricsCollectorService(prisma);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Notification Flow', () => {
    it('should handle complete event update notification flow', async () => {
      // Setup mocks
      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as any);
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([mockSubscription] as any);
      vi.mocked(prisma.pushSubscription.count).mockResolvedValue(1);

      const webpush = await import('web-push');
      vi.mocked(webpush.default.sendNotification).mockResolvedValue(undefined as any);

      // Step 1: Queue notification job
      const jobData = {
        eventId: 'event-456',
        changeType: 'time_change' as const,
        changes: [{
          field: 'startDate',
          oldValue: '2024-02-01T19:00:00Z',
          newValue: '2024-02-01T20:00:00Z',
        }],
        timestamp: new Date(),
      };

      const mockJob = {
        id: 'job-123',
        data: { type: 'event_update', ...jobData },
      };

      const { notificationQueue } = await import('../queue/index.js');
      vi.mocked(notificationQueue.add).mockResolvedValue(mockJob as any);

      const queuedJob = await notificationService.queueEventUpdateNotification(jobData);

      expect(queuedJob).toBeDefined();
      expect(notificationQueue.add).toHaveBeenCalledWith(
        'event_update',
        expect.objectContaining({
          eventId: 'event-456',
          changeType: 'time_change',
        }),
        expect.objectContaining({
          priority: 2, // High priority for time changes
        })
      );

      // Step 2: Get target subscriptions
      const subscriptions = await userTargetingService.getSubscriptionsForEventTicketHolders('event-456');
      expect(subscriptions).toHaveLength(1);

      // Step 3: Send notifications
      const pushSubscriptionData = pushSubscriptionService.toPushSubscriptionData(mockSubscription);
      const payload = {
        type: 'event_update',
        eventId: 'event-456',
        title: '📅 Test Event - Time Changed',
        body: 'Event time has been updated',
        url: '/events/test-event',
        icon: '/icon-192x192.png',
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

      // Step 4: Record metrics
      const performanceMetrics = {
        jobId: 'job-123',
        eventId: 'event-456',
        jobType: 'event_update',
        processingTime: 1500,
        targetCount: 1,
        sentCount: 1,
        failedCount: 0,
        timestamp: new Date(),
      };

      metricsCollectorService.recordJobPerformance(performanceMetrics);

      const summary = metricsCollectorService.getPerformanceSummary(1);
      expect(summary.recentJobs).toHaveLength(1);
      expect(summary.summary.totalNotificationsSent).toBe(1);
      expect(summary.summary.averageSuccessRate).toBe(100);
    });

    it('should handle notification failures and cleanup', async () => {
      // Setup mocks for failure scenario
      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as any);
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([mockSubscription] as any);
      vi.mocked(prisma.pushSubscription.delete).mockResolvedValue(mockSubscription as any);

      const webpush = await import('web-push');
      const notFoundError = new Error('Subscription not found');
      (notFoundError as any).statusCode = 404;
      vi.mocked(webpush.default.sendNotification).mockRejectedValue(notFoundError);

      // Step 1: Attempt to send notification (will fail)
      const pushSubscriptionData = pushSubscriptionService.toPushSubscriptionData(mockSubscription);
      const payload = {
        type: 'event_update',
        eventId: 'event-456',
        title: 'Test Notification',
        body: 'Test body',
        url: '/events/test-event',
      };

      // Step 2: Track the error
      await expect(
        webPushService.sendNotification(pushSubscriptionData, payload)
      ).rejects.toThrow('Push subscription no longer valid: 404');

      // Step 3: Error tracking should categorize and handle the error
      await errorTrackingService.trackError(
        mockSubscription.endpoint,
        notFoundError as any,
        'job-123',
        'event-456'
      );

      const errorStats = errorTrackingService.getErrorStats();
      expect(errorStats.totalErrors).toBe(1);
      expect(errorStats.errorsByStatusCode[404]).toBe(1);
      expect(errorStats.errorsByType['invalid_endpoint']).toBe(1);
      expect(errorStats.invalidEndpointsFound).toBe(1);

      // Step 4: Cleanup should be performed
      const cleanupResult = await pushSubscriptionService.cleanupInvalidSubscription(
        mockSubscription.endpoint
      );
      expect(cleanupResult).toBe(true);
      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
        where: { endpoint: mockSubscription.endpoint },
      });
    });

    it('should handle bulk notification sending with mixed results', async () => {
      // Setup multiple subscriptions
      const subscriptions = [
        { ...mockSubscription, id: 'sub-1', endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1' },
        { ...mockSubscription, id: 'sub-2', endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-2' },
        { ...mockSubscription, id: 'sub-3', endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-3' },
      ];

      const pushSubscriptionDataArray = subscriptions.map(sub => 
        pushSubscriptionService.toPushSubscriptionData(sub)
      );

      const webpush = await import('web-push');
      
      // Mock mixed success/failure responses
      vi.mocked(webpush.default.sendNotification)
        .mockResolvedValueOnce(undefined as any) // Success
        .mockRejectedValueOnce(Object.assign(new Error('Not found'), { statusCode: 404 })) // Invalid endpoint
        .mockResolvedValueOnce(undefined as any); // Success

      const payload = {
        type: 'new_event',
        eventId: 'event-456',
        title: 'New Event Available',
        body: 'Check out this new event',
        url: '/events/test-event',
      };

      // Send bulk notifications
      const result = await webPushService.sendBulkNotifications(
        pushSubscriptionDataArray,
        payload,
        {},
        'job-123',
        'event-456'
      );

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.invalidEndpoints).toHaveLength(1);
      expect(result.invalidEndpoints[0]).toBe('https://fcm.googleapis.com/fcm/send/endpoint-2');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].statusCode).toBe(404);

      // Verify all notifications were attempted
      expect(webpush.default.sendNotification).toHaveBeenCalledTimes(3);
    });
  });

  describe('Subscription Lifecycle Integration', () => {
    it('should handle complete subscription lifecycle', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/new-endpoint',
        keys: {
          p256dh: 'new-p256dh-key',
          auth: 'new-auth-key',
        },
      };

      const createData = {
        userId: 'user-123',
        subscription: subscriptionData,
        userAgent: 'Mozilla/5.0 Test Browser',
      };

      // Step 1: Create subscription
      const createdSubscription = {
        id: 'new-sub-123',
        userId: 'user-123',
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

      // Step 2: Validate subscription data
      const validation = pushSubscriptionService.validateSubscriptionData(subscriptionData);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Step 3: Get user subscriptions
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([createdSubscription] as any);

      const userSubscriptions = await pushSubscriptionService.getUserSubscriptions('user-123');
      expect(userSubscriptions).toHaveLength(1);
      expect(userSubscriptions[0].endpoint).toBe(subscriptionData.endpoint);

      // Step 4: Update subscription
      const updatedSubscription = { ...createdSubscription, lastSeenAt: new Date() };
      vi.mocked(prisma.pushSubscription.update).mockResolvedValue(updatedSubscription as any);

      const updateResult = await pushSubscriptionService.updateLastSeen(subscriptionData.endpoint);
      expect(updateResult).toEqual(updatedSubscription);

      // Step 5: Disable subscription
      const disabledSubscription = { ...createdSubscription, enabled: false };
      vi.mocked(prisma.pushSubscription.update).mockResolvedValue(disabledSubscription as any);

      const disableResult = await pushSubscriptionService.disableSubscription(subscriptionData.endpoint);
      expect(disableResult).toEqual(disabledSubscription);

      // Step 6: Delete subscription
      vi.mocked(prisma.pushSubscription.delete).mockResolvedValue(createdSubscription as any);

      const deleteResult = await pushSubscriptionService.deleteSubscription(subscriptionData.endpoint);
      expect(deleteResult).toBe(true);
    });

    it('should handle subscription conflicts and updates', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/existing-endpoint',
        keys: {
          p256dh: 'updated-p256dh-key',
          auth: 'updated-auth-key',
        },
      };

      const createData = {
        userId: 'user-123',
        subscription: subscriptionData,
        userAgent: 'Mozilla/5.0 Updated Browser',
      };

      // Mock unique constraint violation
      const duplicateError = new Error('Unique constraint violation');
      (duplicateError as any).code = 'P2002';
      (duplicateError as any).meta = { target: ['endpoint'] };

      vi.mocked(prisma.pushSubscription.create).mockRejectedValue(duplicateError);

      // Mock successful update
      const updatedSubscription = {
        id: 'existing-sub-123',
        userId: 'user-123',
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth,
        userAgent: 'Mozilla/5.0 Updated Browser',
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
          userAgent: 'Mozilla/5.0 Updated Browser',
          enabled: true,
          lastSeenAt: expect.any(Date),
        },
      });
    });
  });

  describe('User Targeting Integration', () => {
    it('should integrate user targeting with subscription management', async () => {
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
        { id: 'sub-1', userId: 'user-1', endpoint: 'endpoint-1', enabled: true },
        { id: 'sub-2', userId: 'user-1', endpoint: 'endpoint-2', enabled: true },
        { id: 'sub-3', userId: 'user-2', endpoint: 'endpoint-3', enabled: true },
      ];

      // Step 1: Get users with event tickets
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

      const targetedUsers = await userTargetingService.getUsersWithEventTickets('event-456');

      expect(targetedUsers).toHaveLength(2);
      expect(targetedUsers[0].subscriptionCount).toBe(2);
      expect(targetedUsers[1].subscriptionCount).toBe(1);

      // Step 2: Get subscriptions for those users
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions as any);

      const subscriptions = await userTargetingService.getSubscriptionsForEventTicketHolders('event-456');
      expect(subscriptions).toHaveLength(3);

      // Step 3: Test caching behavior
      // Second call should use cache
      const cachedUsers = await userTargetingService.getUsersWithEventTickets('event-456');
      expect(cachedUsers).toEqual(targetedUsers);
      // Should only have called database once due to caching
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);

      // Step 4: Test cache invalidation
      userTargetingService.invalidateEventCache('456');
      
      // Next call should hit database again
      await userTargetingService.getUsersWithEventTickets('event-456');
      expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
    });

    it('should handle complex targeting filters', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub-1' }],
        },
        {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          city: 'Ankara',
          pushSubscriptions: [{ id: 'sub-2' }],
        },
        {
          id: 'user-3',
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub-3' }],
        },
      ];

      const mockSubscriptions = [
        { id: 'sub-1', userId: 'user-1', endpoint: 'endpoint-1' },
        { id: 'sub-2', userId: 'user-2', endpoint: 'endpoint-2' },
        { id: 'sub-3', userId: 'user-3', endpoint: 'endpoint-3' },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
      vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions as any);

      // Test targeting by city with exclusions
      const filters = {
        city: 'Istanbul',
        excludeUserIds: ['user-3'],
      };

      const result = await userTargetingService.getTargetedUsersAndSubscriptions(filters);

      expect(result.users).toHaveLength(1); // Only user-1, user-3 excluded
      expect(result.users[0].id).toBe('user-1');
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].userId).toBe('user-1');
      expect(result.totalUsers).toBe(1);
      expect(result.totalSubscriptions).toBe(1);
      expect(result.cacheHit).toBe(false);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle error recovery and batch cleanup', async () => {
      // Step 1: Simulate multiple errors
      const endpoints = [
        'https://fcm.googleapis.com/fcm/send/invalid-1',
        'https://fcm.googleapis.com/fcm/send/invalid-2',
        'https://fcm.googleapis.com/fcm/send/invalid-3',
      ];

      for (const endpoint of endpoints) {
        const error = new Error('Not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        await errorTrackingService.trackError(endpoint, error, 'job-123', 'event-456');
      }

      const errorStats = errorTrackingService.getErrorStats();
      expect(errorStats.totalErrors).toBe(3);
      expect(errorStats.invalidEndpointsFound).toBe(3);

      // Step 2: Perform batch cleanup
      vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 2 });

      const cleanupResult = await errorTrackingService.performBatchCleanup();

      expect(cleanupResult.processed).toBeGreaterThan(0);
      expect(cleanupResult.cleaned).toBeGreaterThan(0);
      expect(cleanupResult.errors).toHaveLength(0);

      // Step 3: Check health status after cleanup
      vi.mocked(prisma.pushSubscription.count).mockResolvedValue(1000);

      const healthStatus = await errorTrackingService.getHealthStatus();
      expect(healthStatus.status).toBe('healthy'); // Should be healthy with low error rate
      expect(healthStatus.lastCleanup).toBeInstanceOf(Date);
    });

    it('should handle system health monitoring integration', async () => {
      // Step 1: Record some performance metrics
      const performanceMetrics = [
        {
          jobId: 'job-1',
          eventId: 'event-1',
          jobType: 'event_update',
          processingTime: 1000,
          targetCount: 100,
          sentCount: 95,
          failedCount: 5,
          timestamp: new Date(),
        },
        {
          jobId: 'job-2',
          eventId: 'event-2',
          jobType: 'new_event',
          processingTime: 2000,
          targetCount: 50,
          sentCount: 45,
          failedCount: 5,
          timestamp: new Date(),
        },
      ];

      performanceMetrics.forEach(metrics => 
        metricsCollectorService.recordJobPerformance(metrics)
      );

      // Step 2: Get system health
      vi.mocked(prisma.pushSubscription.count).mockResolvedValue(1000);

      const systemHealth = await metricsCollectorService.getSystemHealth();

      expect(systemHealth.overall).toBe('healthy');
      expect(systemHealth.components.redis).toBe('healthy');
      expect(systemHealth.components.queue).toBe('healthy');
      expect(systemHealth.metrics.subscriptionCount).toBe(1000);
      expect(systemHealth.metrics.errorRate).toBeLessThan(10); // Should be low
      expect(systemHealth.alerts).toHaveLength(0);

      // Step 3: Collect comprehensive metrics
      const startDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const endDate = new Date();

      vi.mocked(prisma.pushSubscription.count)
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(900); // active

      const metrics = await metricsCollectorService.collectMetrics(startDate, endDate);

      expect(metrics.totalNotificationsSent).toBe(150); // 100 + 50
      expect(metrics.successfulNotifications).toBe(140); // 95 + 45
      expect(metrics.failedNotifications).toBe(10); // 5 + 5
      expect(metrics.successRate).toBeCloseTo(93.33, 1); // 140/150 * 100
      expect(metrics.averageProcessingTime).toBe(1500); // (1000 + 2000) / 2
      expect(metrics.totalSubscriptions).toBe(1000);
      expect(metrics.activeSubscriptions).toBe(900);
      expect(metrics.disabledSubscriptions).toBe(100);
    });
  });

  describe('Performance Testing', () => {
    it('should handle bulk notification sending performance', async () => {
      // Create a large number of subscriptions
      const subscriptionCount = 100;
      const subscriptions = Array.from({ length: subscriptionCount }, (_, i) => ({
        endpoint: `https://fcm.googleapis.com/fcm/send/endpoint-${i}`,
        keys: {
          p256dh: `p256dh-key-${i}`,
          auth: `auth-key-${i}`,
        },
      }));

      const webpush = await import('web-push');
      // Mock all notifications as successful
      vi.mocked(webpush.default.sendNotification).mockResolvedValue(undefined as any);

      const payload = {
        type: 'new_event',
        eventId: 'event-456',
        title: 'Performance Test Event',
        body: 'Testing bulk notification performance',
        url: '/events/performance-test',
      };

      const startTime = Date.now();

      // Send bulk notifications
      const result = await webPushService.sendBulkNotifications(
        subscriptions,
        payload,
        {},
        'performance-job',
        'event-456'
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify results
      expect(result.sent).toBe(subscriptionCount);
      expect(result.failed).toBe(0);
      expect(result.invalidEndpoints).toHaveLength(0);
      expect(result.errors).toHaveLength(0);

      // Verify performance (should complete within reasonable time)
      expect(processingTime).toBeLessThan(10000); // Less than 10 seconds

      // Record performance metrics
      const performanceMetrics = {
        jobId: 'performance-job',
        eventId: 'event-456',
        jobType: 'new_event',
        processingTime,
        targetCount: subscriptionCount,
        sentCount: result.sent,
        failedCount: result.failed,
        timestamp: new Date(),
      };

      metricsCollectorService.recordJobPerformance(performanceMetrics);

      const summary = metricsCollectorService.getPerformanceSummary(1);
      expect(summary.recentJobs[0].processingTime).toBe(processingTime);
      expect(summary.summary.averageSuccessRate).toBe(100);
    });

    it('should handle concurrent notification processing', async () => {
      // Simulate multiple concurrent jobs
      const jobPromises = Array.from({ length: 5 }, async (_, i) => {
        const jobData = {
          eventId: `event-${i}`,
          changeType: 'time_change' as const,
          changes: [{
            field: 'startDate',
            oldValue: '2024-02-01T19:00:00Z',
            newValue: '2024-02-01T20:00:00Z',
          }],
          timestamp: new Date(),
        };

        const mockJob = {
          id: `concurrent-job-${i}`,
          data: { type: 'event_update', ...jobData },
        };

        const { notificationQueue } = await import('../queue/index.js');
        vi.mocked(notificationQueue.add).mockResolvedValue(mockJob as any);

        return notificationService.queueEventUpdateNotification(jobData);
      });

      // Wait for all jobs to be queued
      const queuedJobs = await Promise.all(jobPromises);

      expect(queuedJobs).toHaveLength(5);
      queuedJobs.forEach((job, i) => {
        expect(job.id).toBe(`concurrent-job-${i}`);
      });

      // Verify all jobs were queued with correct priority
      const { notificationQueue } = await import('../queue/index.js');
      expect(notificationQueue.add).toHaveBeenCalledTimes(5);
    });
  });
});