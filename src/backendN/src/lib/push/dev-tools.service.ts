import { PrismaClient } from '@prisma/client';
import { WebPushService, type NotificationPayload, type PushSubscriptionData } from './web-push.service.js';
import { PushSubscriptionService } from './push-subscription.service.js';
import { NotificationLoggerService } from './notification-logger.service.js';

export interface MockPushServiceOptions {
  simulateFailures?: boolean;
  failureRate?: number;
  simulateInvalidEndpoints?: boolean;
  invalidEndpointRate?: number;
  responseDelay?: number;
}

export interface TestNotificationTemplate {
  id: string;
  name: string;
  description: string;
  payload: NotificationPayload;
}

export interface SubscriptionTestResult {
  endpoint: string;
  valid: boolean;
  error?: string;
  responseTime?: number;
}

/**
 * Development tools service for testing push notifications
 */
export class DevToolsService {
  private prisma: PrismaClient;
  private webPushService: WebPushService;
  private pushSubscriptionService: PushSubscriptionService;
  private notificationLogger: NotificationLoggerService;
  private mockMode: boolean = false;
  private mockOptions: MockPushServiceOptions = {};

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.webPushService = new WebPushService(5, prisma);
    this.pushSubscriptionService = new PushSubscriptionService(prisma);
    this.notificationLogger = new NotificationLoggerService(prisma);
  }

  /**
   * Enable mock push service for local development
   */
  enableMockMode(options: MockPushServiceOptions = {}): void {
    this.mockMode = true;
    this.mockOptions = {
      simulateFailures: false,
      failureRate: 0.1,
      simulateInvalidEndpoints: false,
      invalidEndpointRate: 0.05,
      responseDelay: 100,
      ...options,
    };
  }

  /**
   * Disable mock push service
   */
  disableMockMode(): void {
    this.mockMode = false;
    this.mockOptions = {};
  }

  /**
   * Get predefined test notification templates
   */
  getTestTemplates(): TestNotificationTemplate[] {
    return [
      {
        id: 'event_time_change',
        name: 'Event Time Change',
        description: 'Notification for when an event time is updated',
        payload: {
          type: 'event_update',
          eventId: 'test-event-1',
          title: '🕐 Event Time Changed',
          body: 'Summer Music Festival has been moved to 8:00 PM',
          url: '/events/test-event-1',
          icon: '/icons/time-change.png',
          badge: '/icons/badge.png',
          actions: [
            {
              action: 'view',
              title: 'View Event',
              icon: '/icons/view.png',
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
            },
          ],
          change: {
            field: 'startDate',
            oldValue: '2024-08-25T19:00:00Z',
            newValue: '2024-08-25T20:00:00Z',
          },
        },
      },
      {
        id: 'new_event',
        name: 'New Event Available',
        description: 'Notification for new events',
        payload: {
          type: 'new_event',
          eventId: 'test-event-2',
          title: '🎉 New Event Available',
          body: 'Electronic Music Night - Get your tickets now!',
          url: '/events/test-event-2',
          icon: '/icons/new-event.png',
          badge: '/icons/badge.png',
          actions: [
            {
              action: 'view',
              title: 'View Event',
              icon: '/icons/view.png',
            },
            {
              action: 'book',
              title: 'Book Now',
              icon: '/icons/ticket.png',
            },
          ],
        },
      },
      {
        id: 'event_cancelled',
        name: 'Event Cancelled',
        description: 'Notification for cancelled events',
        payload: {
          type: 'event_update',
          eventId: 'test-event-3',
          title: '❌ Event Cancelled',
          body: 'Unfortunately, Rock Concert has been cancelled. Refunds will be processed automatically.',
          url: '/events/test-event-3',
          icon: '/icons/cancelled.png',
          badge: '/icons/badge.png',
          actions: [
            {
              action: 'view',
              title: 'View Details',
              icon: '/icons/view.png',
            },
          ],
          change: {
            field: 'status',
            oldValue: 'active',
            newValue: 'cancelled',
          },
        },
      },
      {
        id: 'venue_change',
        name: 'Venue Change',
        description: 'Notification for venue changes',
        payload: {
          type: 'event_update',
          eventId: 'test-event-4',
          title: '📍 Venue Changed',
          body: 'Jazz Night has been moved to Blue Note Club',
          url: '/events/test-event-4',
          icon: '/icons/venue-change.png',
          badge: '/icons/badge.png',
          actions: [
            {
              action: 'view',
              title: 'View Event',
              icon: '/icons/view.png',
            },
            {
              action: 'directions',
              title: 'Get Directions',
              icon: '/icons/directions.png',
            },
          ],
          change: {
            field: 'venue',
            oldValue: 'Main Concert Hall',
            newValue: 'Blue Note Club',
          },
        },
      },
      {
        id: 'broadcast',
        name: 'Broadcast Message',
        description: 'General broadcast notification',
        payload: {
          type: 'broadcast_notification',
          eventId: '',
          title: '📢 Important Update',
          body: 'New features are now available in the iWent app!',
          url: '/updates',
          icon: '/icons/broadcast.png',
          badge: '/icons/badge.png',
          actions: [
            {
              action: 'view',
              title: 'Learn More',
              icon: '/icons/view.png',
            },
          ],
        },
      },
    ];
  }

  /**
   * Send test notification to specific user
   */
  async sendTestNotification(
    userId: string,
    templateId: string,
    customPayload?: Partial<NotificationPayload>
  ): Promise<{
    sent: number;
    failed: number;
    subscriptions: number;
    errors: string[];
  }> {
    const template = this.getTestTemplates().find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Test template '${templateId}' not found`);
    }

    const payload = customPayload 
      ? { ...template.payload, ...customPayload }
      : template.payload;

    const subscriptions = await this.pushSubscriptionService.getUserSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      return {
        sent: 0,
        failed: 0,
        subscriptions: 0,
        errors: ['No active subscriptions found for user'],
      };
    }

    const pushSubscriptionData = this.pushSubscriptionService.toPushSubscriptionDataArray(subscriptions);
    
    let result;
    if (this.mockMode) {
      result = await this.mockSendBulkNotifications(pushSubscriptionData, payload);
    } else {
      result = await this.webPushService.sendBulkNotifications(pushSubscriptionData, payload);
    }

    // Log the test notification
    await this.notificationLogger.logNotification({
      type: 'test_notification',
      eventId: payload.eventId || 'test',
      userId,
      subscriptionCount: subscriptions.length,
      sentCount: result.sent,
      failedCount: result.failed,
      payload,
      metadata: {
        templateId,
        mockMode: this.mockMode,
      },
    });

    return {
      sent: result.sent,
      failed: result.failed,
      subscriptions: subscriptions.length,
      errors: result.errors.map(e => e.error),
    };
  }

  /**
   * Test all subscriptions for a user
   */
  async testUserSubscriptions(userId: string): Promise<SubscriptionTestResult[]> {
    const subscriptions = await this.pushSubscriptionService.getUserSubscriptions(userId);
    const results: SubscriptionTestResult[] = [];

    const testPayload: NotificationPayload = {
      type: 'test',
      eventId: 'test',
      title: 'Connection Test',
      body: 'Testing push notification connectivity',
      url: '/',
    };

    for (const subscription of subscriptions) {
      const startTime = Date.now();
      try {
        const pushSubscriptionData = this.pushSubscriptionService.toPushSubscriptionData(subscription);
        
        if (this.mockMode) {
          await this.mockSendNotification(pushSubscriptionData, testPayload);
        } else {
          await this.webPushService.sendNotification(pushSubscriptionData, testPayload);
        }
        
        results.push({
          endpoint: subscription.endpoint,
          valid: true,
          responseTime: Date.now() - startTime,
        });
      } catch (error) {
        results.push({
          endpoint: subscription.endpoint,
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Generate debug information for notification payload
   */
  debugPayload(payload: NotificationPayload): {
    size: number;
    sizeFormatted: string;
    validation: { valid: boolean; errors: string[] };
    structure: any;
    recommendations: string[];
  } {
    const payloadString = JSON.stringify(payload);
    const size = new Blob([payloadString]).size;
    const validation = this.webPushService.validatePayload(payload);
    
    const recommendations: string[] = [];
    
    if (size > 3000) {
      recommendations.push('Consider reducing payload size for better compatibility');
    }
    
    if (payload.title && payload.title.length > 50) {
      recommendations.push('Title is quite long, consider shortening for better display');
    }
    
    if (payload.body && payload.body.length > 120) {
      recommendations.push('Body text is long, may be truncated on some devices');
    }
    
    if (payload.actions && payload.actions.length > 2) {
      recommendations.push('More than 2 actions may not be supported on all platforms');
    }
    
    if (!payload.icon) {
      recommendations.push('Consider adding an icon for better visual appeal');
    }

    return {
      size,
      sizeFormatted: this.formatBytes(size),
      validation,
      structure: this.analyzePayloadStructure(payload),
      recommendations,
    };
  }

  /**
   * Get development statistics
   */
  async getDevStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    recentNotifications: number;
    errorRate: number;
    topErrors: Array<{ error: string; count: number }>;
  }> {
    const [
      totalSubs,
      activeSubs,
      recentNotifications,
      recentErrors,
    ] = await Promise.all([
      this.prisma.pushSubscription.count(),
      this.prisma.pushSubscription.count({ where: { enabled: true } }),
      this.prisma.notificationLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      this.prisma.pushError.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        select: { error: true },
      }),
    ]);

    const errorCounts = recentErrors.reduce((acc, error) => {
      acc[error.error] = (acc[error.error] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    const errorRate = recentNotifications > 0 ? recentErrors.length / recentNotifications : 0;

    return {
      totalSubscriptions: totalSubs,
      activeSubscriptions: activeSubs,
      recentNotifications,
      errorRate,
      topErrors,
    };
  }

  /**
   * Mock implementation for local development
   */
  private async mockSendNotification(
    subscription: PushSubscriptionData,
    payload: NotificationPayload
  ): Promise<void> {
    // Simulate network delay
    if (this.mockOptions.responseDelay) {
      await new Promise(resolve => setTimeout(resolve, this.mockOptions.responseDelay));
    }

    // Simulate failures
    if (this.mockOptions.simulateFailures && Math.random() < (this.mockOptions.failureRate || 0.1)) {
      const errorCodes = [400, 429, 500, 502, 503];
      const statusCode = errorCodes[Math.floor(Math.random() * errorCodes.length)];
      const error = new Error(`Mock push service error`) as any;
      error.statusCode = statusCode;
      throw error;
    }

    // Simulate invalid endpoints
    if (this.mockOptions.simulateInvalidEndpoints && Math.random() < (this.mockOptions.invalidEndpointRate || 0.05)) {
      const error = new Error('Mock invalid endpoint') as any;
      error.statusCode = Math.random() > 0.5 ? 404 : 410;
      throw error;
    }

    // Log mock notification
    console.log(`[MOCK] Push notification sent to ${subscription.endpoint.substring(0, 50)}...`);
    console.log(`[MOCK] Payload:`, JSON.stringify(payload, null, 2));
  }

  /**
   * Mock bulk send implementation
   */
  private async mockSendBulkNotifications(
    subscriptions: PushSubscriptionData[],
    payload: NotificationPayload
  ): Promise<{
    sent: number;
    failed: number;
    invalidEndpoints: string[];
    errors: Array<{ endpoint: string; error: string; statusCode?: number }>;
  }> {
    const result = {
      sent: 0,
      failed: 0,
      invalidEndpoints: [] as string[],
      errors: [] as Array<{ endpoint: string; error: string; statusCode?: number }>,
    };

    for (const subscription of subscriptions) {
      try {
        await this.mockSendNotification(subscription, payload);
        result.sent++;
      } catch (error: any) {
        result.failed++;
        
        if (error.statusCode === 404 || error.statusCode === 410) {
          result.invalidEndpoints.push(subscription.endpoint);
        }
        
        result.errors.push({
          endpoint: subscription.endpoint,
          error: error.message,
          statusCode: error.statusCode,
        });
      }
    }

    return result;
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Analyze payload structure
   */
  private analyzePayloadStructure(payload: NotificationPayload): any {
    return {
      hasTitle: !!payload.title,
      hasBody: !!payload.body,
      hasIcon: !!payload.icon,
      hasBadge: !!payload.badge,
      hasActions: !!(payload.actions && payload.actions.length > 0),
      actionCount: payload.actions?.length || 0,
      hasChangeDetails: !!payload.change,
      hasUrl: !!payload.url,
      type: payload.type,
      eventId: payload.eventId,
    };
  }
}