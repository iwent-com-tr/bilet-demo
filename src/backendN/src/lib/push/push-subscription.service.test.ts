import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PushSubscriptionService, type CreateSubscriptionData } from './push-subscription.service.js';
import type { PushSubscriptionData } from './web-push.service.js';

// Mock Prisma Client
const mockPrisma = {
  pushSubscription: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
} as unknown as PrismaClient;

describe('PushSubscriptionService', () => {
  let service: PushSubscriptionService;
  let mockSubscriptionData: PushSubscriptionData;
  let mockCreateData: CreateSubscriptionData;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PushSubscriptionService(mockPrisma);

    mockSubscriptionData = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
    };

    mockCreateData = {
      userId: 'test-user-id',
      subscription: mockSubscriptionData,
      userAgent: 'Mozilla/5.0 Test Browser',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSubscription', () => {
    it('should create a new subscription successfully', async () => {
      const mockCreatedSubscription = {
        id: 'test-id',
        userId: 'test-user-id',
        endpoint: mockSubscriptionData.endpoint,
        p256dh: mockSubscriptionData.keys.p256dh,
        auth: mockSubscriptionData.keys.auth,
        userAgent: 'Mozilla/5.0 Test Browser',
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      vi.mocked(mockPrisma.pushSubscription.create).mockResolvedValue(mockCreatedSubscription);

      const result = await service.createSubscription(mockCreateData);

      expect(mockPrisma.pushSubscription.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          endpoint: mockSubscriptionData.endpoint,
          p256dh: mockSubscriptionData.keys.p256dh,
          auth: mockSubscriptionData.keys.auth,
          userAgent: 'Mozilla/5.0 Test Browser',
          enabled: true,
          lastSeenAt: expect.any(Date),
        },
      });

      expect(result).toEqual(mockCreatedSubscription);
    });

    it('should update existing subscription if endpoint already exists', async () => {
      const duplicateError = new Error('Unique constraint violation');
      (duplicateError as any).code = 'P2002';
      (duplicateError as any).meta = { target: ['endpoint'] };

      const mockUpdatedSubscription = {
        id: 'existing-id',
        userId: 'test-user-id',
        endpoint: mockSubscriptionData.endpoint,
        p256dh: mockSubscriptionData.keys.p256dh,
        auth: mockSubscriptionData.keys.auth,
        userAgent: 'Mozilla/5.0 Test Browser',
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      vi.mocked(mockPrisma.pushSubscription.create).mockRejectedValue(duplicateError);
      vi.mocked(mockPrisma.pushSubscription.update).mockResolvedValue(mockUpdatedSubscription);

      const result = await service.createSubscription(mockCreateData);

      expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
        where: { endpoint: mockSubscriptionData.endpoint },
        data: {
          p256dh: mockSubscriptionData.keys.p256dh,
          auth: mockSubscriptionData.keys.auth,
          userAgent: 'Mozilla/5.0 Test Browser',
          enabled: true,
          lastSeenAt: expect.any(Date),
        },
      });

      expect(result).toEqual(mockUpdatedSubscription);
    });

    it('should throw error for invalid subscription data', async () => {
      const invalidData = {
        ...mockCreateData,
        subscription: {
          endpoint: 'invalid-url',
          keys: {
            p256dh: '',
            auth: 'test-auth',
          },
        },
      };

      await expect(service.createSubscription(invalidData)).rejects.toThrow();
    });
  });

  describe('getUserSubscriptions', () => {
    it('should get enabled subscriptions for a user', async () => {
      const mockSubscriptions = [
        {
          id: 'sub1',
          userId: 'test-user-id',
          endpoint: 'endpoint1',
          p256dh: 'key1',
          auth: 'auth1',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ];

      vi.mocked(mockPrisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await service.getUserSubscriptions('test-user-id');

      expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          enabled: true,
        },
        orderBy: { lastSeenAt: 'desc' },
      });

      expect(result).toEqual(mockSubscriptions);
    });

    it('should get all subscriptions for a user when enabledOnly is false', async () => {
      const mockSubscriptions = [
        {
          id: 'sub1',
          userId: 'test-user-id',
          endpoint: 'endpoint1',
          p256dh: 'key1',
          auth: 'auth1',
          enabled: false,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ];

      vi.mocked(mockPrisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await service.getUserSubscriptions('test-user-id', false);

      expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
        },
        orderBy: { lastSeenAt: 'desc' },
      });

      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe('getSubscriptionByEndpoint', () => {
    it('should get subscription by endpoint', async () => {
      const mockSubscription = {
        id: 'sub1',
        userId: 'test-user-id',
        endpoint: 'test-endpoint',
        p256dh: 'key1',
        auth: 'auth1',
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      vi.mocked(mockPrisma.pushSubscription.findUnique).mockResolvedValue(mockSubscription);

      const result = await service.getSubscriptionByEndpoint('test-endpoint');

      expect(mockPrisma.pushSubscription.findUnique).toHaveBeenCalledWith({
        where: { endpoint: 'test-endpoint' },
      });

      expect(result).toEqual(mockSubscription);
    });

    it('should return null if subscription not found', async () => {
      vi.mocked(mockPrisma.pushSubscription.findUnique).mockResolvedValue(null);

      const result = await service.getSubscriptionByEndpoint('non-existent-endpoint');

      expect(result).toBeNull();
    });
  });

  describe('disableSubscription', () => {
    it('should disable subscription successfully', async () => {
      const mockDisabledSubscription = {
        id: 'sub1',
        userId: 'test-user-id',
        endpoint: 'test-endpoint',
        p256dh: 'key1',
        auth: 'auth1',
        enabled: false,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      vi.mocked(mockPrisma.pushSubscription.update).mockResolvedValue(mockDisabledSubscription);

      const result = await service.disableSubscription('test-endpoint');

      expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
        where: { endpoint: 'test-endpoint' },
        data: { enabled: false },
      });

      expect(result).toEqual(mockDisabledSubscription);
    });

    it('should return null if subscription not found', async () => {
      const notFoundError = new Error('Record not found');
      (notFoundError as any).code = 'P2025';

      vi.mocked(mockPrisma.pushSubscription.update).mockRejectedValue(notFoundError);

      const result = await service.disableSubscription('non-existent-endpoint');

      expect(result).toBeNull();
    });
  });

  describe('deleteSubscription', () => {
    it('should delete subscription successfully', async () => {
      vi.mocked(mockPrisma.pushSubscription.delete).mockResolvedValue({} as any);

      const result = await service.deleteSubscription('test-endpoint');

      expect(mockPrisma.pushSubscription.delete).toHaveBeenCalledWith({
        where: { endpoint: 'test-endpoint' },
      });

      expect(result).toBe(true);
    });

    it('should return false if subscription not found', async () => {
      const notFoundError = new Error('Record not found');
      (notFoundError as any).code = 'P2025';

      vi.mocked(mockPrisma.pushSubscription.delete).mockRejectedValue(notFoundError);

      const result = await service.deleteSubscription('non-existent-endpoint');

      expect(result).toBe(false);
    });
  });

  describe('cleanupInvalidSubscriptions', () => {
    it('should cleanup multiple invalid subscriptions', async () => {
      const endpoints = ['endpoint1', 'endpoint2', 'endpoint3'];
      vi.mocked(mockPrisma.pushSubscription.deleteMany).mockResolvedValue({ count: 3 });

      const result = await service.cleanupInvalidSubscriptions(endpoints);

      expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          endpoint: { in: endpoints },
        },
      });

      expect(result).toBe(3);
    });

    it('should return 0 for empty endpoints array', async () => {
      const result = await service.cleanupInvalidSubscriptions([]);

      expect(result).toBe(0);
      expect(mockPrisma.pushSubscription.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('getUserSubscriptionCount', () => {
    it('should get enabled subscription count for user', async () => {
      vi.mocked(mockPrisma.pushSubscription.count).mockResolvedValue(3);

      const result = await service.getUserSubscriptionCount('test-user-id');

      expect(mockPrisma.pushSubscription.count).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
          enabled: true,
        },
      });

      expect(result).toBe(3);
    });

    it('should get all subscription count for user when enabledOnly is false', async () => {
      vi.mocked(mockPrisma.pushSubscription.count).mockResolvedValue(5);

      const result = await service.getUserSubscriptionCount('test-user-id', false);

      expect(mockPrisma.pushSubscription.count).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
        },
      });

      expect(result).toBe(5);
    });
  });

  describe('toPushSubscriptionData', () => {
    it('should convert database subscription to PushSubscriptionData format', () => {
      const dbSubscription = {
        id: 'sub1',
        userId: 'user1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'test-p256dh',
        auth: 'test-auth',
        userAgent: 'Test Browser',
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      };

      const result = service.toPushSubscriptionData(dbSubscription);

      expect(result).toEqual({
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-p256dh',
          auth: 'test-auth',
        },
      });
    });
  });

  describe('validateSubscriptionData', () => {
    it('should validate correct subscription data', () => {
      const result = service.validateSubscriptionData(mockSubscriptionData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid endpoint URL', () => {
      const invalidData = {
        ...mockSubscriptionData,
        endpoint: 'invalid-url',
      };

      const result = service.validateSubscriptionData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('endpoint: Invalid endpoint URL');
    });

    it('should reject missing p256dh key', () => {
      const invalidData = {
        ...mockSubscriptionData,
        keys: {
          ...mockSubscriptionData.keys,
          p256dh: '',
        },
      };

      const result = service.validateSubscriptionData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('keys.p256dh: p256dh key is required');
    });

    it('should reject missing auth key', () => {
      const invalidData = {
        ...mockSubscriptionData,
        keys: {
          ...mockSubscriptionData.keys,
          auth: '',
        },
      };

      const result = service.validateSubscriptionData(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('keys.auth: auth key is required');
    });
  });

  describe('getSubscriptionsForEventTicketHolders', () => {
    it('should get subscriptions for users with active tickets for an event', async () => {
      const mockSubscriptions = [
        {
          id: 'sub1',
          userId: 'user1',
          endpoint: 'endpoint1',
          p256dh: 'key1',
          auth: 'auth1',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
          user: {
            id: 'user1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      vi.mocked(mockPrisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await service.getSubscriptionsForEventTicketHolders('event-id');

      expect(mockPrisma.pushSubscription.findMany).toHaveBeenCalledWith({
        where: {
          enabled: true,
          user: {
            tickets: {
              some: {
                eventId: 'event-id',
                status: 'ACTIVE',
              },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe('cleanupOldDisabledSubscriptions', () => {
    it('should cleanup old disabled subscriptions', async () => {
      vi.mocked(mockPrisma.pushSubscription.deleteMany).mockResolvedValue({ count: 5 });

      const result = await service.cleanupOldDisabledSubscriptions(30);

      expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          enabled: false,
          lastSeenAt: {
            lt: expect.any(Date),
          },
        },
      });

      expect(result).toBe(5);
    });
  });
});