import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { PushSubscriptionService } from '../../lib/push/push-subscription.service.js';
import { WebPushService } from '../../lib/push/web-push.service.js';
import { getVapidConfig } from '../../lib/push/vapid-config.js';
import { prisma } from '../../lib/prisma.js';
import {
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  ManualNotificationRequestSchema,
  BroadcastNotificationRequestSchema,
  TestNotificationToAllRequestSchema,
  EventNotificationOptionsSchema,
  type SubscribeRequest,
  type UnsubscribeRequest,
  type ManualNotificationRequest,
  type BroadcastNotificationRequest,
  type TestNotificationToAllRequest,
  type EventNotificationOptions,
} from './push.dto.js';

export class PushController {
  private pushSubscriptionService: PushSubscriptionService;
  private webPushService: WebPushService;

  constructor() {
    this.pushSubscriptionService = new PushSubscriptionService(prisma);
    this.webPushService = new WebPushService();
  }

  /**
   * GET /api/push/public-key
   * Expose VAPID public key for client-side subscription
   */
  getPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const vapidConfig = getVapidConfig();
      res.json({
        publicKey: vapidConfig.publicKey,
      });
    } catch (error) {
      console.error('Error getting VAPID public key:', error);
      res.status(500).json({
        error: 'Failed to get VAPID public key',
        code: 'VAPID_CONFIG_ERROR',
      });
    }
  };

  /**
   * POST /api/push/subscribe
   * Register a new push subscription for the authenticated user
   */
  subscribe = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validatedData: SubscribeRequest = SubscribeRequestSchema.parse(req.body);
      
      // Get authenticated user
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Create or update subscription
      const subscription = await this.pushSubscriptionService.createSubscription({
        userId: user.id,
        subscription: validatedData.subscription,
        userAgent: validatedData.userAgent || req.get('User-Agent'),
      });

      res.status(201).json({
        message: 'Push subscription registered successfully',
        subscription: {
          id: subscription.id,
          endpoint: subscription.endpoint,
          enabled: subscription.enabled,
          createdAt: subscription.createdAt,
        },
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid subscription data',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to register push subscription',
        code: 'SUBSCRIPTION_ERROR',
      });
    }
  };

  /**
   * DELETE /api/push/unsubscribe
   * Remove a push subscription
   */
  unsubscribe = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validatedData: UnsubscribeRequest = UnsubscribeRequestSchema.parse(req.body);
      
      // Get authenticated user
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Check if subscription belongs to the user
      const existingSubscription = await this.pushSubscriptionService.getSubscriptionByEndpoint(
        validatedData.endpoint
      );

      if (!existingSubscription) {
        res.status(404).json({
          error: 'Push subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        });
        return;
      }

      if (existingSubscription.userId !== user.id) {
        res.status(403).json({
          error: 'Not authorized to unsubscribe this endpoint',
          code: 'FORBIDDEN',
        });
        return;
      }

      // Delete the subscription
      const deleted = await this.pushSubscriptionService.deleteSubscription(validatedData.endpoint);

      if (deleted) {
        res.json({
          message: 'Push subscription removed successfully',
        });
      } else {
        res.status(404).json({
          error: 'Push subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        });
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid unsubscribe data',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to remove push subscription',
        code: 'UNSUBSCRIBE_ERROR',
      });
    }
  };

  /**
   * POST /api/push/test
   * Send a test notification to the authenticated user
   */
  sendTestNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get authenticated user
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Get user's active subscriptions
      const subscriptions = await this.pushSubscriptionService.getUserSubscriptions(user.id);
      const activeSubscriptions = subscriptions.filter(sub => sub.enabled);

      if (activeSubscriptions.length === 0) {
        res.status(404).json({
          error: 'No active push subscriptions found',
          code: 'NO_SUBSCRIPTIONS',
          message: 'Please enable push notifications first',
        });
        return;
      }

      // Prepare test notification payload
      const notificationPayload = {
        type: 'test_notification',
        eventId: '',
        title: 'Test Notification 🔔',
        body: 'This is a test push notification from iWent!',
        url: '/',
        icon: '/favicon-16x16.png',
        badge: '/favicon-16x16.png',
        actions: [
          {
            action: 'view',
            title: 'View App',
            icon: '/icons/view-icon.png'
          }
        ],
      };

      // Send notifications
      const pushSubscriptionData = this.pushSubscriptionService.toPushSubscriptionDataArray(activeSubscriptions);
      const result = await this.webPushService.sendBulkNotifications(
        pushSubscriptionData,
        notificationPayload
      );

      // Clean up invalid subscriptions
      if (result.invalidEndpoints.length > 0) {
        await this.pushSubscriptionService.cleanupInvalidSubscriptions(result.invalidEndpoints);
      }

      res.json({
        message: 'Test notification sent successfully',
        sent: result.sent,
        failed: result.failed,
        invalidEndpoints: result.invalidEndpoints.length,
        targetSubscriptions: activeSubscriptions.length,
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        error: 'Failed to send test notification',
        code: 'TEST_NOTIFICATION_ERROR',
      });
    }
  };

  /**
   * POST /api/push/test-all
   * Send test notification to all active subscribers (admin only)
   */
  sendTestNotificationToAll = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get authenticated user
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Authorization check - only admins can send to all subscribers
      // Note: This should be handled by middleware, but adding extra check for safety
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { userType: true },
      });

      if (!userRecord || userRecord.userType !== 'ADMIN') {
        res.status(403).json({
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      // Validate request body
      const validatedData: TestNotificationToAllRequest = TestNotificationToAllRequestSchema.parse(req.body);

      // Get all active subscriptions
      const subscriptions = await this.pushSubscriptionService.getSubscriptions({
        enabled: true,
      });

      if (subscriptions.length === 0) {
        res.status(404).json({
          error: 'No active push subscriptions found',
          code: 'NO_SUBSCRIPTIONS',
          message: 'No users have enabled push notifications',
        });
        return;
      }

      // Prepare test notification payload with customizable content
      const customTitle = validatedData.title || 'Test Notification to All Users 🔔';
      const customBody = validatedData.body || 'This is a test push notification sent to all active subscribers!';
      const customUrl = validatedData.url || '/';
      const customIcon = validatedData.icon || '/favicon-16x16.png';
      const customBadge = validatedData.badge || '/favicon-16x16.png';

      const notificationPayload = {
        type: 'admin_test_notification',
        eventId: '',
        title: customTitle,
        body: customBody,
        url: customUrl,
        icon: customIcon,
        badge: customBadge,
        actions: [
          {
            action: 'view',
            title: 'Open App',
            icon: '/icons/view-icon.png'
          }
        ],
      };

      // Send notifications to all active subscriptions
      const pushSubscriptionData = this.pushSubscriptionService.toPushSubscriptionDataArray(subscriptions);
      const result = await this.webPushService.sendBulkNotifications(
        pushSubscriptionData,
        notificationPayload,
        {
          ttl: 86400, // 24 hours
          urgency: 'normal',
          topic: 'admin_test_broadcast',
        }
      );

      // Clean up invalid subscriptions
      if (result.invalidEndpoints.length > 0) {
        await this.pushSubscriptionService.cleanupInvalidSubscriptions(result.invalidEndpoints);
      }

      // Log the broadcast test notification
      console.log(`Admin test notification sent by user ${user.id} to ${subscriptions.length} subscribers`);
      console.log(`Results: ${result.sent} sent, ${result.failed} failed, ${result.invalidEndpoints.length} invalid`);

      res.json({
        message: 'Test notification sent to all active subscribers',
        totalSubscribers: subscriptions.length,
        sent: result.sent,
        failed: result.failed,
        invalidEndpoints: result.invalidEndpoints.length,
        deliveryRate: subscriptions.length > 0 ? ((result.sent / subscriptions.length) * 100).toFixed(2) + '%' : '0%',
        payload: {
          title: customTitle,
          body: customBody,
          url: customUrl,
        },
      });
    } catch (error) {
      console.error('Error sending test notification to all subscribers:', error);
      
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }
      
      res.status(500).json({
        error: 'Failed to send test notification to all subscribers',
        code: 'BROADCAST_TEST_ERROR',
      });
    }
  };

  /**
   * GET /api/push/subscriptions
   * Get user's push subscriptions
   */
  getUserSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get authenticated user
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const subscriptions = await this.pushSubscriptionService.getUserSubscriptions(user.id);

      res.json({
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          endpoint: sub.endpoint,
          enabled: sub.enabled,
          userAgent: sub.userAgent,
          createdAt: sub.createdAt,
          lastSeenAt: sub.lastSeenAt,
        })),
        count: subscriptions.length,
      });
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      res.status(500).json({
        error: 'Failed to get push subscriptions',
        code: 'SUBSCRIPTIONS_ERROR',
      });
    }
  };

  /**
   * POST /api/events/notify/broadcast
   * Send broadcast notification to all users (admin only)
   */
  sendBroadcastNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get authenticated user
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Authorization is handled by middleware

      // Validate request body
      const validatedData: BroadcastNotificationRequest = BroadcastNotificationRequestSchema.parse(req.body);

      // Get all active subscriptions
      const subscriptions = await this.pushSubscriptionService.getSubscriptions({
        enabled: true,
      });

      if (subscriptions.length === 0) {
        res.json({
          message: 'No active push subscriptions found',
          sent: 0,
          failed: 0,
        });
        return;
      }

      // Prepare notification payload
      const notificationPayload = {
        type: 'broadcast_notification',
        eventId: '', // No specific event for broadcast
        title: validatedData.payload.title,
        body: validatedData.payload.body,
        url: validatedData.payload.url || '/',
        icon: validatedData.payload.icon,
        badge: validatedData.payload.badge,
        actions: validatedData.payload.actions,
      };

      // Send notifications
      const pushSubscriptionData = this.pushSubscriptionService.toPushSubscriptionDataArray(subscriptions);
      const result = await this.webPushService.sendBulkNotifications(
        pushSubscriptionData,
        notificationPayload
      );

      // Clean up invalid subscriptions
      if (result.invalidEndpoints.length > 0) {
        await this.pushSubscriptionService.cleanupInvalidSubscriptions(result.invalidEndpoints);
      }

      res.json({
        message: 'Broadcast notification sent successfully',
        sent: result.sent,
        failed: result.failed,
        invalidEndpoints: result.invalidEndpoints.length,
        targetSubscriptions: subscriptions.length,
      });
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid notification data',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to send broadcast notification',
        code: 'NOTIFICATION_ERROR',
      });
    }
  };

  /**
   * POST /api/events/:eventId/notify
   * Send manual test notification for an event (admin/organizer only)
   */
  sendEventNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get authenticated user
      const user = (req as any).user;
      if (!user?.id) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      // Authorization is handled by middleware

      const eventId = req.params.eventId;
      if (!eventId) {
        res.status(400).json({
          error: 'Event ID is required',
          code: 'MISSING_EVENT_ID',
        });
        return;
      }

      // Validate request body
      const validatedData: ManualNotificationRequest = ManualNotificationRequestSchema.parse(req.body);
      const options: EventNotificationOptions = EventNotificationOptionsSchema.parse(req.body.options || {});

      // Check if event exists
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          startDate: true,
          venue: true,
        },
      });

      if (!event) {
        res.status(404).json({
          error: 'Event not found',
          code: 'EVENT_NOT_FOUND',
        });
        return;
      }

      // Get target subscriptions
      let subscriptions;
      if (validatedData.targetUserIds && validatedData.targetUserIds.length > 0) {
        // Send to specific users
        subscriptions = await this.pushSubscriptionService.getSubscriptions({
          userIds: validatedData.targetUserIds,
          enabled: true,
        });
      } else {
        // Send to all ticket holders for this event
        subscriptions = await this.pushSubscriptionService.getSubscriptionsForEventTicketHolders(eventId);
      }

      if (subscriptions.length === 0) {
        res.json({
          message: 'No valid push subscriptions found for notification',
          sent: 0,
          failed: 0,
        });
        return;
      }

      // Prepare notification payload
      const notificationPayload = {
        type: options.notificationType,
        eventId: event.id,
        title: validatedData.payload.title,
        body: validatedData.payload.body,
        url: validatedData.payload.url || `/events/${event.id}`,
        icon: validatedData.payload.icon,
        badge: validatedData.payload.badge,
        actions: validatedData.payload.actions,
      };

      // Send notifications with options
      const pushSubscriptionData = this.pushSubscriptionService.toPushSubscriptionDataArray(subscriptions);
      const pushOptions = {
        ttl: options.ttl,
        urgency: options.urgency,
        topic: `event_${event.id}`,
      };
      
      const result = await this.webPushService.sendBulkNotifications(
        pushSubscriptionData,
        notificationPayload,
        pushOptions
      );

      // Clean up invalid subscriptions
      if (result.invalidEndpoints.length > 0) {
        await this.pushSubscriptionService.cleanupInvalidSubscriptions(result.invalidEndpoints);
      }

      res.json({
        message: 'Notification sent successfully',
        sent: result.sent,
        failed: result.failed,
        invalidEndpoints: result.invalidEndpoints.length,
        targetSubscriptions: subscriptions.length,
      });
    } catch (error) {
      console.error('Error sending event notification:', error);
      
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid notification data',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to send notification',
        code: 'NOTIFICATION_ERROR',
      });
    }
  };
}