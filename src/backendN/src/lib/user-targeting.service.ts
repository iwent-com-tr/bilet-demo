import { PrismaClient, NotificationCategory } from '@prisma/client';
import { PushSubscriptionService } from './push/push-subscription.service';

export interface UserTargetingFilters {
  eventId?: string;
  notificationCategory?: NotificationCategory;
  city?: string;
  userIds?: string[];
  excludeUserIds?: string[];
}

export interface TargetedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  subscriptionCount: number;
}

export interface UserTargetingResult {
  users: TargetedUser[];
  subscriptions: any[];
  totalUsers: number;
  totalSubscriptions: number;
  cacheHit: boolean;
}

/**
 * Service for targeting users for push notifications based on various criteria
 */
export class UserTargetingService {
  private pushSubscriptionService: PushSubscriptionService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private prisma: PrismaClient) {
    this.pushSubscriptionService = new PushSubscriptionService(prisma);
  }

  /**
   * Get users with valid tickets for a specific event
   */
  async getUsersWithEventTickets(eventId: string): Promise<TargetedUser[]> {
    const cacheKey = `event_ticket_holders_${eventId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const users = await this.prisma.user.findMany({
      where: {
        tickets: {
          some: {
            eventId,
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

    const result = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      city: user.city,
      subscriptionCount: user.pushSubscriptions.length,
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get push subscriptions for users with valid tickets for an event
   */
  async getSubscriptionsForEventTicketHolders(eventId: string): Promise<any[]> {
    const cacheKey = `event_subscriptions_${eventId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const subscriptions = await this.pushSubscriptionService.getSubscriptionsForEventTicketHolders(eventId);
    
    this.setCache(cacheKey, subscriptions);
    return subscriptions;
  }

  /**
   * Get users based on notification preferences
   */
  async getUsersWithNotificationPreference(
    category: NotificationCategory,
    enabled: boolean = true
  ): Promise<TargetedUser[]> {
    const cacheKey = `notification_pref_${category}_${enabled}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const users = await this.prisma.user.findMany({
      where: {
        notificationPreferences: {
          some: {
            category,
            enabled,
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

    const result = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      city: user.city,
      subscriptionCount: user.pushSubscriptions.length,
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get push subscriptions for users with specific notification preferences
   */
  async getSubscriptionsWithNotificationPreference(
    category: NotificationCategory,
    enabled: boolean = true
  ): Promise<any[]> {
    const cacheKey = `notification_subscriptions_${category}_${enabled}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const subscriptions = await this.pushSubscriptionService.getSubscriptionsWithNotificationPreference(
      category,
      enabled
    );
    
    this.setCache(cacheKey, subscriptions);
    return subscriptions;
  }

  /**
   * Get users in a specific city
   */
  async getUsersByCity(city: string): Promise<TargetedUser[]> {
    const cacheKey = `users_by_city_${city.toLowerCase()}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const users = await this.prisma.user.findMany({
      where: {
        city: {
          equals: city,
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

    const result = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      city: user.city,
      subscriptionCount: user.pushSubscriptions.length,
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get targeted users and subscriptions based on complex filters
   */
  async getTargetedUsersAndSubscriptions(filters: UserTargetingFilters): Promise<UserTargetingResult> {
    const cacheKey = this.generateCacheKey(filters);
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return { ...cached, cacheHit: true };
    }

    let users: TargetedUser[] = [];
    let subscriptions: any[] = [];

    // If targeting by event tickets
    if (filters.eventId) {
      users = await this.getUsersWithEventTickets(filters.eventId);
      subscriptions = await this.getSubscriptionsForEventTicketHolders(filters.eventId);
    }
    // If targeting by notification preference
    else if (filters.notificationCategory) {
      users = await this.getUsersWithNotificationPreference(filters.notificationCategory);
      subscriptions = await this.getSubscriptionsWithNotificationPreference(filters.notificationCategory);
    }
    // If targeting by city
    else if (filters.city) {
      users = await this.getUsersByCity(filters.city);
      subscriptions = await this.prisma.pushSubscription.findMany({
        where: {
          enabled: true,
          user: {
            city: {
              equals: filters.city,
              mode: 'insensitive',
            },
            deletedAt: null,
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
    }
    // If targeting specific user IDs
    else if (filters.userIds && filters.userIds.length > 0) {
      users = await this.prisma.user.findMany({
        where: {
          id: { in: filters.userIds },
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
      }).then(users => users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        city: user.city,
        subscriptionCount: user.pushSubscriptions.length,
      })));

      subscriptions = await this.prisma.pushSubscription.findMany({
        where: {
          enabled: true,
          userId: { in: filters.userIds },
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
    }
    // Default: get all users with push subscriptions
    else {
      users = await this.prisma.user.findMany({
        where: {
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
      }).then(users => users.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        city: user.city,
        subscriptionCount: user.pushSubscriptions.length,
      })));

      subscriptions = await this.prisma.pushSubscription.findMany({
        where: { enabled: true },
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
    }

    // Apply exclusion filters
    if (filters.excludeUserIds && filters.excludeUserIds.length > 0) {
      users = users.filter(user => !filters.excludeUserIds!.includes(user.id));
      subscriptions = subscriptions.filter(sub => !filters.excludeUserIds!.includes(sub.userId));
    }

    const result: UserTargetingResult = {
      users,
      subscriptions,
      totalUsers: users.length,
      totalSubscriptions: subscriptions.length,
      cacheHit: false,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get statistics about user targeting
   */
  async getTargetingStats(): Promise<{
    totalUsers: number;
    totalActiveSubscriptions: number;
    usersByCity: { city: string; count: number }[];
    subscriptionsByNotificationCategory: { category: string; count: number }[];
  }> {
    const cacheKey = 'targeting_stats';
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const [
      totalUsers,
      totalActiveSubscriptions,
      usersByCity,
      subscriptionsByCategory,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { deletedAt: null },
      }),
      this.prisma.pushSubscription.count({
        where: { enabled: true },
      }),
      this.prisma.user.groupBy({
        by: ['city'],
        where: {
          deletedAt: null,
          pushSubscriptions: {
            some: { enabled: true },
          },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.userNotificationPreference.groupBy({
        by: ['category'],
        where: { enabled: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    const result = {
      totalUsers,
      totalActiveSubscriptions,
      usersByCity: usersByCity.map(item => ({
        city: item.city,
        count: item._count.id,
      })),
      subscriptionsByNotificationCategory: subscriptionsByCategory.map(item => ({
        category: item.category,
        count: item._count.id,
      })),
    };

    this.setCache(cacheKey, result, 10 * 60 * 1000); // Cache for 10 minutes
    return result;
  }

  /**
   * Invalidate cache for specific patterns
   */
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(pattern)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate cache for a specific event
   */
  invalidateEventCache(eventId: string): void {
    this.invalidateCache(`event_${eventId}`);
    this.invalidateCache('targeting_stats');
  }

  /**
   * Invalidate cache for notification preferences
   */
  invalidateNotificationCache(category?: NotificationCategory): void {
    if (category) {
      this.invalidateCache(`notification_pref_${category}`);
      this.invalidateCache(`notification_subscriptions_${category}`);
    } else {
      this.invalidateCache('notification_pref_');
      this.invalidateCache('notification_subscriptions_');
    }
    this.invalidateCache('targeting_stats');
  }

  /**
   * Get data from cache if not expired
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache with timestamp
   */
  private setCache(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up expired entries periodically
    if (this.cache.size > 100) {
      this.cleanupExpiredCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Generate cache key from filters
   */
  private generateCacheKey(filters: UserTargetingFilters): string {
    const parts = ['targeting'];
    
    if (filters.eventId) parts.push(`event_${filters.eventId}`);
    if (filters.notificationCategory) parts.push(`category_${filters.notificationCategory}`);
    if (filters.city) parts.push(`city_${filters.city.toLowerCase()}`);
    if (filters.userIds) parts.push(`users_${filters.userIds.sort().join(',')}`);
    if (filters.excludeUserIds) parts.push(`exclude_${filters.excludeUserIds.sort().join(',')}`);
    
    return parts.join('_');
  }
}

// Export singleton instance
let userTargetingService: UserTargetingService | null = null;

export function createUserTargetingService(prisma: PrismaClient): UserTargetingService {
  if (!userTargetingService) {
    userTargetingService = new UserTargetingService(prisma);
  }
  return userTargetingService;
}

export function getUserTargetingService(): UserTargetingService | null {
  return userTargetingService;
}