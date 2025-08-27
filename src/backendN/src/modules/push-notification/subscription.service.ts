import { PrismaClient, PushSubscription, Browser, OS, DeviceType, SegmentSource } from '@prisma/client';
import * as crypto from 'crypto';
import { oneSignalService } from './onesignal.service';
import {
  SyncSubscriptionRequest,
  SubscriptionResponse,
  NotificationStatsResponse,
  DeviceInfo,
} from './push-notification.types';

export class SubscriptionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Sync subscription with OneSignal and store in database
   */
  async syncSubscription(
    userId: string,
    subscriptionData: SyncSubscriptionRequest
  ): Promise<PushSubscription> {
    const existingSubscription = await this.prisma.pushSubscription.findFirst({
      where: {
        userId,
        onesignalUserId: subscriptionData.onesignalUserId,
      },
    });

    if (existingSubscription) {
      // Update existing subscription
      const updated = await this.prisma.pushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          browser: subscriptionData.browser,
          os: subscriptionData.os,
          deviceType: subscriptionData.deviceType,
          pwa: subscriptionData.pwa,
          subscribed: true,
          updatedAt: new Date(),
        },
      });

      // Update default user tags in OneSignal
      await this.setDefaultUserTags(userId, subscriptionData.onesignalUserId);

      return updated;
    } else {
      // Create new subscription
      const subscription = await this.prisma.pushSubscription.create({
        data: {
          userId,
          onesignalUserId: subscriptionData.onesignalUserId,
          browser: subscriptionData.browser,
          os: subscriptionData.os,
          deviceType: subscriptionData.deviceType,
          pwa: subscriptionData.pwa,
          subscribed: true,
        },
      });

      // Set external user ID and default tags in OneSignal
      await Promise.all([
        oneSignalService.setExternalUserId(subscriptionData.onesignalUserId, userId),
        this.setDefaultUserTags(userId, subscriptionData.onesignalUserId),
      ]);

      return subscription;
    }
  }

  /**
   * Remove subscription (mark as unsubscribed)
   */
  async removeSubscription(userId: string, onesignalUserId?: string): Promise<void> {
    const whereClause = onesignalUserId
      ? { userId, onesignalUserId }
      : { userId };

    await this.prisma.pushSubscription.updateMany({
      where: whereClause,
      data: {
        subscribed: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get user subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await this.prisma.pushSubscription.findMany({
      where: {
        userId,
        subscribed: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get subscription by OneSignal user ID
   */
  async getSubscriptionByOneSignalId(onesignalUserId: string): Promise<PushSubscription | null> {
    return await this.prisma.pushSubscription.findFirst({
      where: {
        onesignalUserId,
        subscribed: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            city: true,
            userType: true,
            locale: true,
          },
        },
      },
    });
  }

  /**
   * Get all active subscriptions with pagination
   */
  async getSubscriptions(options: {
    page?: number;
    limit?: number;
    browser?: Browser;
    os?: OS;
    deviceType?: DeviceType;
    pwa?: boolean;
  } = {}): Promise<{
    subscriptions: PushSubscription[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      browser,
      os,
      deviceType,
      pwa,
    } = options;

    const where = {
      subscribed: true,
      ...(browser && { browser }),
      ...(os && { os }),
      ...(deviceType && { deviceType }),
      ...(pwa !== undefined && { pwa }),
    };

    const [subscriptions, total] = await Promise.all([
      this.prisma.pushSubscription.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              city: true,
              userType: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pushSubscription.count({ where }),
    ]);

    return {
      subscriptions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get comprehensive subscription statistics
   */
  async getSubscriptionStats(): Promise<NotificationStatsResponse> {
    const [
      total,
      active,
      byBrowser,
      byOS,
      byDeviceType,
      eventStats,
    ] = await Promise.all([
      this.prisma.pushSubscription.count(),
      this.prisma.pushSubscription.count({ where: { subscribed: true } }),
      this.prisma.pushSubscription.groupBy({
        by: ['browser'],
        where: { subscribed: true },
        _count: { _all: true },
      }),
      this.prisma.pushSubscription.groupBy({
        by: ['os'],
        where: { subscribed: true },
        _count: { _all: true },
      }),
      this.prisma.pushSubscription.groupBy({
        by: ['deviceType', 'pwa'],
        where: { subscribed: true },
        _count: { _all: true },
      }),
      this.getNotificationEventStats(),
    ]);

    const browserStats = byBrowser.reduce((acc, item) => {
      acc[item.browser] = item._count._all;
      return acc;
    }, {} as Record<Browser, number>);

    const osStats = byOS.reduce((acc, item) => {
      acc[item.os] = item._count._all;
      return acc;
    }, {} as Record<OS, number>);

    const platformStats = byDeviceType.reduce(
      (acc, item) => {
        if (item.pwa) {
          acc.pwa += item._count._all;
        } else {
          acc.web += item._count._all;
        }
        return acc;
      },
      { web: 0, pwa: 0 }
    );

    return {
      totalSubscriptions: total,
      activeSubscriptions: active,
      ...eventStats,
      byBrowser: browserStats,
      byOS: osStats,
      byPlatform: platformStats,
    };
  }

  /**
   * Clean up old inactive subscriptions
   */
  async cleanupInactiveSubscriptions(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.pushSubscription.updateMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
        subscribed: true,
      },
      data: {
        subscribed: false,
      },
    });

    return result.count;
  }

  /**
   * Detect device information from user agent
   */
  static detectDeviceInfo(userAgent: string): DeviceInfo {
    const ua = userAgent.toLowerCase();

    // Detect browser
    let browser: Browser = Browser.OTHER;
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = Browser.CHROME;
    } else if (ua.includes('firefox')) {
      browser = Browser.FIREFOX;
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = Browser.SAFARI;
    } else if (ua.includes('edg')) {
      browser = Browser.EDGE;
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = Browser.OTHER; // OPERA not available in current enum
    }

    // Detect OS
    let os: OS = OS.OTHER;
    if (ua.includes('windows')) {
      os = OS.WINDOWS;
    } else if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) {
      os = OS.MACOS;
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = OS.IOS;
    } else if (ua.includes('android')) {
      os = OS.ANDROID;
    } else if (ua.includes('linux')) {
      os = OS.LINUX;
    } else if (ua.includes('cros')) {
      os = OS.OTHER; // CHROME_OS not available in current enum
    }

    // Detect device type
    let deviceType: DeviceType = DeviceType.DESKTOP;
    if (ua.includes('mobile')) {
      deviceType = DeviceType.MOBILE;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = DeviceType.TABLET;
    }

    // Detect PWA (this needs to be determined from the client side)
    const pwa = false; // Will be set from client-side detection

    return { browser, os, deviceType, pwa, userAgent };
  }

  /**
   * Hash subscription endpoint for privacy
   */
  static hashEndpoint(endpoint: string): string {
    return crypto.createHash('sha256').update(endpoint).digest('hex').substring(0, 32);
  }

  /**
   * Set default user tags in OneSignal
   */
  private async setDefaultUserTags(userId: string, onesignalUserId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          userType: true,
          city: true,
          locale: true,
          createdAt: true,
        },
      });

      if (!user) return;

      const defaultTags = {
        env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        user_type: user.userType.toLowerCase(),
        city: user.city,
        signup_date: user.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
        language: user.locale || 'tr-TR',
      };

      // Update OneSignal tags
      await oneSignalService.updatePlayerTags(onesignalUserId, defaultTags);

      // Store tags locally for segmentation
      await this.updateUserTags(userId, defaultTags);
    } catch (error) {
      console.error('Failed to set default user tags:', error);
      // Don't throw - tag setting is not critical for subscription
    }
  }

  /**
   * Update user segment tags
   */
  private async updateUserTags(
    userId: string,
    tags: Record<string, string>,
    source: SegmentSource = SegmentSource.INTERNAL
  ): Promise<void> {
    for (const [key, value] of Object.entries(tags)) {
      // Try to find existing tag first
      const existingTag = await this.prisma.userSegmentTag.findFirst({
        where: {
          userId,
          key,
          source,
        },
      });

      if (existingTag) {
        // Update existing tag
        await this.prisma.userSegmentTag.update({
          where: { id: existingTag.id },
          data: {
            value,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new tag
        await this.prisma.userSegmentTag.create({
          data: {
            userId,
            key,
            value,
            source,
          },
        });
      }
    }
  }

  /**
   * Get notification event statistics
   */
  private async getNotificationEventStats(): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalClicked: number;
    clickThroughRate: number;
  }> {
    // Placeholder implementation - NotificationEvent model may not be available
    // TODO: Implement when NotificationEvent model is properly set up
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalClicked: 0,
      clickThroughRate: 0,
    };
  }
}