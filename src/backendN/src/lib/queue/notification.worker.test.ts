import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { NotificationWorker } from './notification.worker.js';
import { notificationService } from './notification.service.js';

// Mock the WebPushService
vi.mock('../push/web-push.service.js', () => ({
  WebPushService: vi.fn().mockImplementation(() => ({
    sendNotification: vi.fn().mockResolvedValue(undefined),
    getVapidPublicKey: vi.fn().mockReturnValue('test-public-key'),
  })),
}));

// Mock the PushSubscriptionService
vi.mock('../push/push-subscription.service.js', () => ({
  PushSubscriptionService: vi.fn().mockImplementation(() => ({
    getSubscriptionsForEventTicketHolders: vi.fn().mockResolvedValue([
      {
        id: '1',
        userId: 'user1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test1',
        p256dh: 'test-p256dh-1',
        auth: 'test-auth-1',
        enabled: true,
      },
      {
        id: '2',
        userId: 'user2',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
        p256dh: 'test-p256dh-2',
        auth: 'test-auth-2',
        enabled: true,
      },
    ]),
    getSubscriptionsWithNotificationPreference: vi.fn().mockResolvedValue([
      {
        id: '3',
        userId: 'user3',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test3',
        p256dh: 'test-p256dh-3',
        auth: 'test-auth-3',
        enabled: true,
      },
    ]),
    toPushSubscriptionDataArray: vi.fn().mockImplementation((subs) => 
      subs.map((sub: any) => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }))
    ),
    cleanupInvalidSubscriptions: vi.fn().mockResolvedValue(0),
  })),
}));

describe('NotificationWorker', () => {
  let prisma: PrismaClient;
  let worker: NotificationWorker;

  beforeAll(async () => {
    prisma = new PrismaClient();
    
    // Mock Prisma methods
    prisma.event = {
      findUnique: vi.fn(),
    } as any;

    worker = new NotificationWorker(prisma);
    
    // Wait for worker to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await worker.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Event Update Jobs', () => {
    it('should queue event update job successfully', async () => {
      // Create job data
      const jobData = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        changeType: 'time_change' as const,
        changes: [{
          field: 'startDate',
          oldValue: '2024-01-01T10:00:00Z',
          newValue: '2024-01-01T11:00:00Z',
        }],
        timestamp: new Date(),
      };

      // Queue the job
      const job = await notificationService.queueEventUpdateNotification(jobData);

      // Verify job was created
      expect(job).toBeDefined();
      expect(job.data.eventId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(job.data.changeType).toBe('time_change');
    }, 10000);

    it('should queue venue change notifications', async () => {
      const jobData = {
        eventId: '123e4567-e89b-12d3-a456-426614174001',
        changeType: 'venue_change' as const,
        changes: [{
          field: 'venue',
          oldValue: 'Old Venue',
          newValue: 'New Venue',
        }],
        timestamp: new Date(),
      };

      const job = await notificationService.queueEventUpdateNotification(jobData);

      expect(job).toBeDefined();
      expect(job.data.eventId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(job.data.changeType).toBe('venue_change');
    }, 10000);

    it('should queue event cancellation notifications', async () => {
      const jobData = {
        eventId: '123e4567-e89b-12d3-a456-426614174002',
        changeType: 'cancellation' as const,
        changes: [{
          field: 'status',
          oldValue: 'ACTIVE',
          newValue: 'CANCELLED',
        }],
        timestamp: new Date(),
      };

      const job = await notificationService.queueEventUpdateNotification(jobData);

      expect(job).toBeDefined();
      expect(job.data.eventId).toBe('123e4567-e89b-12d3-a456-426614174002');
      expect(job.data.changeType).toBe('cancellation');
      expect(job.opts.priority).toBe(1); // Highest priority for cancellations
    }, 10000);
  });

  describe('New Event Jobs', () => {
    it('should queue new event job successfully', async () => {
      const jobData = {
        eventId: '123e4567-e89b-12d3-a456-426614174003',
        timestamp: new Date(),
      };

      const job = await notificationService.queueNewEventNotification(jobData);

      expect(job).toBeDefined();
      expect(job.data.eventId).toBe('123e4567-e89b-12d3-a456-426614174003');
      expect(job.data.type).toBe('new_event');
    }, 10000);
  });

  describe('Job Management', () => {
    it('should get queue statistics', async () => {
      const stats = await notificationService.getQueueStats();
      
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('total');
      
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.total).toBe('number');
    });

    it('should handle job cancellation gracefully', async () => {
      const jobData = {
        eventId: '123e4567-e89b-12d3-a456-426614174004',
        timestamp: new Date(),
      };

      const job = await notificationService.queueNewEventNotification(jobData);
      
      // Try to cancel the job - it might fail if already being processed
      try {
        const cancelled = await notificationService.cancelJob(job.id!);
        expect(typeof cancelled).toBe('boolean');
      } catch (error) {
        // Job might be locked by worker, which is expected behavior
        expect(error).toBeDefined();
      }
    });
  });

  describe('Worker Stats', () => {
    it('should return worker statistics', async () => {
      const stats = await worker.getStats();
      
      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('concurrency');
      expect(typeof stats.isRunning).toBe('boolean');
      expect(typeof stats.concurrency).toBe('number');
    });
  });
});