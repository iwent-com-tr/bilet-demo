import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient, NotificationCategory } from '@prisma/client';
import { UserTargetingService, type UserTargetingFilters } from './user-targeting.service.js';
import { PushSubscriptionService } from './push/push-subscription.service.js';

// Mock PushSubscriptionService
vi.mock('./push/push-subscription.service.js', () => ({
  PushSubscriptionService: vi.fn().mockImplementation(() => ({
    getSubscriptionsForEventTicketHolders: vi.fn(),
    getSubscriptionsWithNotificationPreference: vi.fn(),
  })),
}));

// Mock Prisma Client
const mockPrisma = {
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  pushSubscription: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  userNotificationPreference: {
    groupBy: vi.fn(),
  },
} as unknown as PrismaClient;

describe('UserTargetingService', () => {
  let service: UserTargetingService;
  let mockPushSubscriptionService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserTargetingService(mockPrisma);
    mockPushSubscriptionService = vi.mocked(PushSubscriptionService).mock.instances[0];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear cache between tests
    service.invalidateCache();
  });

  describe('getUsersWithEventTickets', () => {
    it('should get users with valid tickets for an event', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }, { id: 'sub2' }],
        },
        {
          id: 'user2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          city: 'Ankara',
          pushSubscriptions: [{ id: 'sub3' }],
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);

      const result = await service.getUsersWithEventTickets('event-123');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          tickets: {
            some: {
              eventId: 'event-123',
              status: 'ACTIVE',
            },
          },
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          city: true,
          pushSubscriptions: {
            where: { enabled: true },
            select: { id: true },
          },
        },
        distinct: ['id'],
      });

      expect(result).toEqual([
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          subscriptionCount: 2,
        },
        {
          id: 'user2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          city: 'Ankara',
          subscriptionCount: 1,
        },
      ]);
    });

    it('should return cached result on second call', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);

      // First call
      await service.getUsersWithEventTickets('event-123');
      
      // Second call should use cache
      const result = await service.getUsersWithEventTickets('event-123');

      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('getSubscriptionsForEventTicketHolders', () => {
    it('should get subscriptions for event ticket holders', async () => {
      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
        { id: 'sub2', userId: 'user2', endpoint: 'endpoint2' },
      ];

      mockPushSubscriptionService.getSubscriptionsForEventTicketHolders.mockResolvedValue(mockSubscriptions);

      const result = await service.getSubscriptionsForEventTicketHolders('event-123');

      expect(mockPushSubscriptionService.getSubscriptionsForEventTicketHolders)
        .toHaveBeenCalledWith('event-123');
      expect(result).toEqual(mockSubscriptions);
    });

    it('should cache subscriptions result', async () => {
      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
      ];

      mockPushSubscriptionService.getSubscriptionsForEventTicketHolders.mockResolvedValue(mockSubscriptions);

      // First call
      await service.getSubscriptionsForEventTicketHolders('event-123');
      
      // Second call should use cache
      const result = await service.getSubscriptionsForEventTicketHolders('event-123');

      expect(mockPushSubscriptionService.getSubscriptionsForEventTicketHolders)
        .toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe('getUsersWithNotificationPreference', () => {
    it('should get users with specific notification preference', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);

      const result = await service.getUsersWithNotificationPreference(
        NotificationCategory.EVENT_UPDATE,
        true
      );

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          notificationPreferences: {
            some: {
              category: NotificationCategory.EVENT_UPDATE,
              enabled: true,
            },
          },
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          city: true,
          pushSubscriptions: {
            where: { enabled: true },
            select: { id: true },
          },
        },
      });

      expect(result).toEqual([
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          subscriptionCount: 1,
        },
      ]);
    });
  });

  describe('getSubscriptionsWithNotificationPreference', () => {
    it('should get subscriptions for users with notification preference', async () => {
      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
      ];

      mockPushSubscriptionService.getSubscriptionsWithNotificationPreference.mockResolvedValue(mockSubscriptions);

      const result = await service.getSubscriptionsWithNotificationPreference(
        NotificationCategory.EVENT_UPDATE,
        true
      );

      expect(mockPushSubscriptionService.getSubscriptionsWithNotificationPreference)
        .toHaveBeenCalledWith(NotificationCategory.EVENT_UPDATE, true);
      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe('getUsersByCity', () => {
    it('should get users by city', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);

      const result = await service.getUsersByCity('Istanbul');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          city: {
            equals: 'Istanbul',
            mode: 'insensitive',
          },
          deletedAt: null,
          pushSubscriptions: {
            some: {
              enabled: true,
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          city: true,
          pushSubscriptions: {
            where: { enabled: true },
            select: { id: true },
          },
        },
      });

      expect(result).toEqual([
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          subscriptionCount: 1,
        },
      ]);
    });

    it('should cache results by city', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);

      // First call
      await service.getUsersByCity('Istanbul');
      
      // Second call should use cache
      const result = await service.getUsersByCity('Istanbul');

      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('getTargetedUsersAndSubscriptions', () => {
    it('should target users by event ID', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);
      mockPushSubscriptionService.getSubscriptionsForEventTicketHolders.mockResolvedValue(mockSubscriptions);

      const filters: UserTargetingFilters = { eventId: 'event-123' };
      const result = await service.getTargetedUsersAndSubscriptions(filters);

      expect(result.users).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);
      expect(result.totalUsers).toBe(1);
      expect(result.totalSubscriptions).toBe(1);
      expect(result.cacheHit).toBe(false);
    });

    it('should target users by notification category', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);
      mockPushSubscriptionService.getSubscriptionsWithNotificationPreference.mockResolvedValue(mockSubscriptions);

      const filters: UserTargetingFilters = { 
        notificationCategory: NotificationCategory.EVENT_UPDATE 
      };
      const result = await service.getTargetedUsersAndSubscriptions(filters);

      expect(result.users).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);
      expect(result.cacheHit).toBe(false);
    });

    it('should target users by city', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);
      vi.mocked(mockPrisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions);

      const filters: UserTargetingFilters = { city: 'Istanbul' };
      const result = await service.getTargetedUsersAndSubscriptions(filters);

      expect(result.users).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);
    });

    it('should target specific user IDs', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);
      vi.mocked(mockPrisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions);

      const filters: UserTargetingFilters = { userIds: ['user1', 'user2'] };
      const result = await service.getTargetedUsersAndSubscriptions(filters);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user1', 'user2'] },
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          city: true,
          pushSubscriptions: {
            where: { enabled: true },
            select: { id: true },
          },
        },
      });

      expect(result.users).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);
    });

    it('should exclude specified user IDs', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
        {
          id: 'user2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          city: 'Ankara',
          pushSubscriptions: [{ id: 'sub2' }],
        },
      ];

      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
        { id: 'sub2', userId: 'user2', endpoint: 'endpoint2' },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);
      vi.mocked(mockPrisma.pushSubscription.findMany).mockResolvedValue(mockSubscriptions);

      const filters: UserTargetingFilters = { 
        city: 'Istanbul',
        excludeUserIds: ['user2'] 
      };
      const result = await service.getTargetedUsersAndSubscriptions(filters);

      expect(result.users).toHaveLength(1);
      expect(result.users[0].id).toBe('user1');
      expect(result.subscriptions).toHaveLength(1);
      expect(result.subscriptions[0].userId).toBe('user1');
    });

    it('should return cached result on subsequent calls', async () => {
      const mockUsers = [
        {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          city: 'Istanbul',
          pushSubscriptions: [{ id: 'sub1' }],
        },
      ];

      const mockSubscriptions = [
        { id: 'sub1', userId: 'user1', endpoint: 'endpoint1' },
      ];

      vi.mocked(mockPrisma.user.findMany).mockResolvedValue(mockUsers);
      mockPushSubscriptionService.getSubscriptionsForEventTicketHolders.mockResolvedValue(mockSubscriptions);

      const filters: UserTargetingFilters = { eventId: 'event-123' };
      
      // First call
      const result1 = await service.getTargetedUsersAndSubscriptions(filters);
      expect(result1.cacheHit).toBe(false);
      
      // Second call should use cache
      const result2 = await service.getTargetedUsersAndSubscriptions(filters);
      expect(result2.cacheHit).toBe(true);
      
      // Should only call database once
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTargetingStats', () => {
    it('should return targeting statistics', async () => {
      const mockStats = [
        5000, // totalUsers
        3000, // totalActiveSubscriptions
        [{ city: 'Istanbul', _count: { id: 1500 } }], // usersByCity
        [{ category: 'EVENT_UPDATE', _count: { id: 2000 } }], // subscriptionsByCategory
      ];

      vi.mocked(mockPrisma.user.count).mockResolvedValue(mockStats[0]);
      vi.mocked(mockPrisma.pushSubscription.count).mockResolvedValue(mockStats[1]);
      vi.mocked(mockPrisma.user.groupBy).mockResolvedValue(mockStats[2] as any);
      vi.mocked(mockPrisma.userNotificationPreference.groupBy).mockResolvedValue(mockStats[3] as any);

      const result = await service.getTargetingStats();

      expect(result).toEqual({
        totalUsers: 5000,
        totalActiveSubscriptions: 3000,
        usersByCity: [{ city: 'Istanbul', count: 1500 }],
        subscriptionsByNotificationCategory: [{ category: 'EVENT_UPDATE', count: 2000 }],
      });
    });

    it('should cache targeting statistics', async () => {
      vi.mocked(mockPrisma.user.count).mockResolvedValue(5000);
      vi.mocked(mockPrisma.pushSubscription.count).mockResolvedValue(3000);
      vi.mocked(mockPrisma.user.groupBy).mockResolvedValue([]);
      vi.mocked(mockPrisma.userNotificationPreference.groupBy).mockResolvedValue([]);

      // First call
      await service.getTargetingStats();
      
      // Second call should use cache
      await service.getTargetingStats();

      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.pushSubscription.count).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache management', () => {
    it('should invalidate all cache when no pattern provided', () => {
      // Add some data to cache first
      service['setCache']('test_key_1', { data: 'test1' });
      service['setCache']('test_key_2', { data: 'test2' });

      service.invalidateCache();

      // Cache should be empty
      expect(service['getFromCache']('test_key_1')).toBeNull();
      expect(service['getFromCache']('test_key_2')).toBeNull();
    });

    it('should invalidate cache by pattern', () => {
      service['setCache']('event_123_data', { data: 'event data' });
      service['setCache']('user_456_data', { data: 'user data' });

      service.invalidateCache('event_123');

      expect(service['getFromCache']('event_123_data')).toBeNull();
      expect(service['getFromCache']('user_456_data')).not.toBeNull();
    });

    it('should invalidate event-specific cache', () => {
      service['setCache']('event_123_tickets', { data: 'tickets' });
      service['setCache']('event_123_subscriptions', { data: 'subscriptions' });
      service['setCache']('targeting_stats', { data: 'stats' });
      service['setCache']('other_data', { data: 'other' });

      service.invalidateEventCache('123');

      expect(service['getFromCache']('event_123_tickets')).toBeNull();
      expect(service['getFromCache']('event_123_subscriptions')).toBeNull();
      expect(service['getFromCache']('targeting_stats')).toBeNull();
      expect(service['getFromCache']('other_data')).not.toBeNull();
    });

    it('should invalidate notification preference cache', () => {
      service['setCache']('notification_pref_EVENT_UPDATE_true', { data: 'prefs' });
      service['setCache']('notification_subscriptions_EVENT_UPDATE_true', { data: 'subs' });
      service['setCache']('targeting_stats', { data: 'stats' });
      service['setCache']('other_data', { data: 'other' });

      service.invalidateNotificationCache(NotificationCategory.EVENT_UPDATE);

      expect(service['getFromCache']('notification_pref_EVENT_UPDATE_true')).toBeNull();
      expect(service['getFromCache']('notification_subscriptions_EVENT_UPDATE_true')).toBeNull();
      expect(service['getFromCache']('targeting_stats')).toBeNull();
      expect(service['getFromCache']('other_data')).not.toBeNull();
    });

    it('should return null for expired cache entries', async () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      service['setCache']('test_key', { data: 'test' });

      // Advance time beyond cache TTL (5 minutes = 300000ms)
      currentTime += 300001;

      const result = service['getFromCache']('test_key');
      expect(result).toBeNull();

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('generateCacheKey', () => {
    it('should generate cache key from filters', () => {
      const filters: UserTargetingFilters = {
        eventId: 'event-123',
        city: 'Istanbul',
        userIds: ['user2', 'user1'], // Should be sorted
        excludeUserIds: ['user4', 'user3'], // Should be sorted
      };

      const key = service['generateCacheKey'](filters);
      
      expect(key).toBe('targeting_event_event-123_city_istanbul_users_user1,user2_exclude_user3,user4');
    });

    it('should generate different keys for different filters', () => {
      const filters1: UserTargetingFilters = { eventId: 'event-123' };
      const filters2: UserTargetingFilters = { city: 'Istanbul' };

      const key1 = service['generateCacheKey'](filters1);
      const key2 = service['generateCacheKey'](filters2);

      expect(key1).not.toBe(key2);
    });
  });
});