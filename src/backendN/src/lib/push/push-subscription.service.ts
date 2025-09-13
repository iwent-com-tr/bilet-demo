import { PrismaClient, PushSubscription } from '@prisma/client';
import { z } from 'zod';
import type { PushSubscriptionData } from './web-push.service.js';

// Validation schema for push subscription data
const PushSubscriptionDataSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
  expirationTime: z.number().nullable().optional(),
});

export interface CreateSubscriptionData {
  userId: string;
  subscription: PushSubscriptionData;
  userAgent?: string;
}

export interface UpdateSubscriptionData {
  subscription: PushSubscriptionData;
  userAgent?: string;
}

export interface SubscriptionFilters {
  userId?: string;
  enabled?: boolean;
  userIds?: string[];
}

/**
 * Service for managing push subscriptions in the database
 */
export class PushSubscriptionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new push subscription for a user
   */
  async createSubscription(data: CreateSubscriptionData): Promise<PushSubscription> {
    // Validate subscription data
    const validatedSubscription = PushSubscriptionDataSchema.parse(data.subscription);

    try {
      // Try to create new subscription
      return await this.prisma.pushSubscription.create({
        data: {
          userId: data.userId,
          endpoint: validatedSubscription.endpoint,
          p256dh: validatedSubscription.keys.p256dh,
          auth: validatedSubscription.keys.auth,
          userAgent: data.userAgent,
          enabled: true,
          lastSeenAt: new Date(),
          channel: 'WEB_PUSH',
          browser: 'OTHER',
          os: 'OTHER',
          deviceType: 'DESKTOP',
        },
      });
    } catch (error: any) {
      // If endpoint already exists, update the existing subscription
      if (error.code === 'P2002' && error.meta?.target?.includes('endpoint')) {
        return await this.updateSubscriptionByEndpoint(
          validatedSubscription.endpoint,
          {
            subscription: validatedSubscription,
            userAgent: data.userAgent,
          }
        );
      }
      throw error;
    }
  }

  /**
   * Update an existing push subscription by endpoint
   */
  async updateSubscriptionByEndpoint(
    endpoint: string,
    data: UpdateSubscriptionData
  ): Promise<PushSubscription> {
    const validatedSubscription = PushSubscriptionDataSchema.parse(data.subscription);

    return await this.prisma.pushSubscription.update({
      where: { endpoint },
      data: {
        p256dh: validatedSubscription.keys.p256dh,
        auth: validatedSubscription.keys.auth,
        userAgent: data.userAgent,
        enabled: true,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string, enabledOnly: boolean = true): Promise<PushSubscription[]> {
    return await this.prisma.pushSubscription.findMany({
      where: {
        userId,
        ...(enabledOnly && { enabled: true }),
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * Get subscriptions with filters
   */
  async getSubscriptions(filters: SubscriptionFilters = {}): Promise<PushSubscription[]> {
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.userIds && filters.userIds.length > 0) {
      where.userId = { in: filters.userIds };
    }

    if (filters.enabled !== undefined) {
      where.enabled = filters.enabled;
    }

    return await this.prisma.pushSubscription.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * Get subscription by endpoint
   */
  async getSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    return await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
    });
  }

  /**
   * Disable a subscription by endpoint
   */
  async disableSubscription(endpoint: string): Promise<PushSubscription | null> {
    try {
      return await this.prisma.pushSubscription.update({
        where: { endpoint },
        data: { enabled: false },
      });
    } catch (error: any) {
      // If subscription doesn't exist, return null
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Enable a subscription by endpoint
   */
  async enableSubscription(endpoint: string): Promise<PushSubscription | null> {
    try {
      return await this.prisma.pushSubscription.update({
        where: { endpoint },
        data: { 
          enabled: true,
          lastSeenAt: new Date(),
        },
      });
    } catch (error: any) {
      // If subscription doesn't exist, return null
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a subscription by endpoint
   */
  async deleteSubscription(endpoint: string): Promise<boolean> {
    try {
      await this.prisma.pushSubscription.delete({
        where: { endpoint },
      });
      return true;
    } catch (error: any) {
      // If subscription doesn't exist, return false
      if (error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Clean up invalid subscriptions (remove from database)
   */
  async cleanupInvalidSubscription(endpoint: string): Promise<boolean> {
    return await this.deleteSubscription(endpoint);
  }

  /**
   * Clean up multiple invalid subscriptions
   */
  async cleanupInvalidSubscriptions(endpoints: string[]): Promise<number> {
    if (endpoints.length === 0) return 0;

    const result = await this.prisma.pushSubscription.deleteMany({
      where: {
        endpoint: { in: endpoints },
      },
    });

    return result.count;
  }

  /**
   * Update last seen timestamp for a subscription
   */
  async updateLastSeen(endpoint: string): Promise<PushSubscription | null> {
    try {
      return await this.prisma.pushSubscription.update({
        where: { endpoint },
        data: { lastSeenAt: new Date() },
      });
    } catch (error: any) {
      // If subscription doesn't exist, return null
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get subscription count for a user
   */
  async getUserSubscriptionCount(userId: string, enabledOnly: boolean = true): Promise<number> {
    return await this.prisma.pushSubscription.count({
      where: {
        userId,
        ...(enabledOnly && { enabled: true }),
      },
    });
  }

  /**
   * Get total subscription count
   */
  async getTotalSubscriptionCount(enabledOnly: boolean = true): Promise<number> {
    return await this.prisma.pushSubscription.count({
      where: enabledOnly ? { enabled: true } : {},
    });
  }

  /**
   * Convert database subscription to PushSubscriptionData format
   */
  toPushSubscriptionData(subscription: PushSubscription): PushSubscriptionData {
    return {
      endpoint: subscription.endpoint || '',
      keys: {
        p256dh: subscription.p256dh || '',
        auth: subscription.auth || '',
      },
    };
  }

  /**
   * Convert multiple database subscriptions to PushSubscriptionData format
   */
  toPushSubscriptionDataArray(subscriptions: PushSubscription[]): PushSubscriptionData[] {
    return subscriptions.map(sub => this.toPushSubscriptionData(sub));
  }

  /**
   * Validate subscription data without saving
   */
  validateSubscriptionData(subscription: PushSubscriptionData): { valid: boolean; errors: string[] } {
    try {
      PushSubscriptionDataSchema.parse(subscription);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
        return { valid: false, errors };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Get subscriptions for users who have tickets for a specific event
   */
  async getSubscriptionsForEventTicketHolders(eventId: string): Promise<PushSubscription[]> {
    return await this.prisma.pushSubscription.findMany({
      where: {
        enabled: true,
        user: {
          tickets: {
            some: {
              eventId,
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
  }

  /**
   * Get subscriptions for users with specific notification preferences
   */
  async getSubscriptionsWithNotificationPreference(
    category: string,
    enabledOnly: boolean = true
  ): Promise<PushSubscription[]> {
    return await this.prisma.pushSubscription.findMany({
      where: {
        enabled: true,
        user: {
          notificationPreferences: {
            some: {
              category: category as any,
              enabled: enabledOnly,
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
  }

  /**
   * Clean up old disabled subscriptions (older than specified days)
   */
  async cleanupOldDisabledSubscriptions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.pushSubscription.deleteMany({
      where: {
        enabled: false,
        lastSeenAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}