import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { oneSignalService } from './onesignal.service';
import {
  SyncSubscriptionSchema,
  UpdateTagsSchema,
  TestNotificationSchema,
  TicketHolderNotificationSchema,
  EventReminderSchema,
  SegmentNotificationSchema,
} from './push-notification.schemas';
import { SyncSubscriptionRequest } from './push-notification.types';

const prisma = new PrismaClient();
const subscriptionService = new SubscriptionService(prisma);

export class PushNotificationController {
  /**
   * Sync OneSignal subscription with backend
   * POST /api/v1/push/sync
   */
  async syncSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = SyncSubscriptionSchema.parse(req.body) as SyncSubscriptionRequest;
      
      const subscription = await subscriptionService.syncSubscription(userId, validatedData);
      
      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error('Sync subscription error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to sync subscription',
      });
    }
  }

  /**
   * Get user subscription details
   * GET /api/v1/push/subscription
   */
  async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const subscriptions = await subscriptionService.getUserSubscriptions(userId);
      
      res.status(200).json({
        success: true,
        data: subscriptions,
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({
        error: 'Failed to get subscription details',
      });
    }
  }

  /**
   * Remove subscription
   * DELETE /api/v1/push/subscription
   */
  async removeSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { onesignalUserId } = req.query;
      
      await subscriptionService.removeSubscription(
        userId,
        onesignalUserId as string | undefined
      );
      
      res.status(200).json({
        success: true,
        message: 'Subscription removed successfully',
      });
    } catch (error) {
      console.error('Remove subscription error:', error);
      res.status(500).json({
        error: 'Failed to remove subscription',
      });
    }
  }

  /**
   * Update user tags for segmentation
   * POST /api/v1/push/tags
   */
  async updateTags(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = UpdateTagsSchema.parse(req.body);
      
      // Get user's OneSignal subscriptions
      const subscriptions = await subscriptionService.getUserSubscriptions(userId);
      
      // Update tags in OneSignal for all user devices
      const updatePromises = subscriptions.map(subscription =>
        oneSignalService.updatePlayerTags(subscription.onesignalUserId, validatedData.tags)
      );
      
      await Promise.all(updatePromises);
      
      res.status(200).json({
        success: true,
        message: 'Tags updated successfully',
        devicesUpdated: subscriptions.length,
      });
    } catch (error) {
      console.error('Update tags error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update tags',
      });
    }
  }

  /**
   * OneSignal webhook handlers
   * POST /api/v1/onesignal/{display|clicked|dismissed}
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Get the signature from headers
      const signature = req.get('X-OneSignal-Signature') || req.get('x-onesignal-signature');
      const payload = JSON.stringify(req.body);

      // Verify webhook signature if secret is configured
      if (process.env.ONESIGNAL_WEBHOOK_SECRET && signature) {
        const isValid = oneSignalService.verifyWebhookSignature(payload, signature);
        if (!isValid) {
          console.warn('[OneSignal Webhook] Invalid signature');
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
      }

      // Log webhook for debugging
      console.log('[OneSignal Webhook]', {
        url: req.url,
        body: req.body,
        timestamp: new Date().toISOString(),
      });

      // TODO: Process webhook data (save to database, trigger notifications, etc.)
      // For now, just acknowledge receipt
      
      // Always return 200 to OneSignal to acknowledge receipt
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      // Always return 200 to OneSignal even on error to prevent retries
      res.status(200).json({ success: true });
    }
  }

  /**
   * Get notification statistics
   * GET /api/v1/admin/push/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      if ((req as any).user?.adminRole !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const stats = await subscriptionService.getSubscriptionStats();
      
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        error: 'Failed to get statistics',
      });
    }
  }

  /**
   * Health check endpoint
   * GET /api/v1/admin/push/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const [oneSignalHealth, dbStats] = await Promise.all([
        oneSignalService.healthCheck(),
        this.getDatabaseStats(),
      ]);
      
      const overallStatus = oneSignalHealth.status === 'up' && dbStats.status === 'up'
        ? 'healthy'
        : 'degraded';
      
      res.status(200).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        services: {
          onesignal: oneSignalHealth,
          database: dbStats,
        },
        metrics: {
          totalSubscriptions: dbStats.totalSubscriptions || 0,
        },
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  }

  /**
   * Send test notification
   * POST /api/v1/admin/push/test
   */
  async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Check if user is admin or has appropriate permissions
      const userType = (req as any).user?.userType;
      const adminRole = (req as any).user?.adminRole;
      
      if (userType !== 'ADMIN' && adminRole !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required for test notifications' });
        return;
      }

      const validatedData = TestNotificationSchema.parse(req.body);
      
      // Use the provided userId from request or fall back to current user
      const targetUserId = validatedData.userId || userId;
      
      // Get user's subscriptions
      const subscriptions = await subscriptionService.getUserSubscriptions(targetUserId);
      
      if (subscriptions.length === 0) {
        res.status(404).json({ 
          error: 'No active subscriptions found',
          message: 'Please enable push notifications first'
        });
        return;
      }
      
      // Use custom title and body if provided, otherwise use defaults
      const notificationTitle = validatedData.title || 'Test Notification 🔔';
      const notificationBody = validatedData.body || 'This is a test push notification from bilet-demo!';
      
      // Send test notification to the user's subscriptions
      const result = await oneSignalService.sendTestNotification(
        subscriptions[0].onesignalUserId,
        notificationTitle,
        notificationBody
      );
      
      res.status(200).json({
        success: true,
        data: {
          ...result,
          id: result.id || 'test-notification-' + Date.now(),
          title: notificationTitle,
          body: notificationBody,
        },
        devicesNotified: subscriptions.length,
        message: 'Test notification sent successfully'
      });
    } catch (error) {
      console.error('Send test notification error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to send test notification',
      });
    }
  }

  /**
   * Send notification to event ticket holders
   * POST /api/v1/push/notify/ticket-holders
   */
  async notifyTicketHolders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = TicketHolderNotificationSchema.parse(req.body);
      
      // Verify user has permission to send notifications for this event
      const event = await prisma.event.findUnique({
        where: { id: validatedData.eventId },
        select: { organizerId: true, name: true }
      });
      
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      
      // Check if user is organizer or admin
      const isAdmin = (req as any).user?.adminRole === 'ADMIN';
      if (!isAdmin && event.organizerId !== userId) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }
      
      // Send notification to ticket holders
      const result = await oneSignalService.sendToEventTicketHolders(
        validatedData.eventId,
        validatedData.notification.title,
        validatedData.notification.body,
        {
          url: validatedData.notification.url,
          data: validatedData.notification.data,
          icon: validatedData.notification.icon,
          badge: validatedData.notification.badge,
          ticketType: validatedData.ticketType,
        }
      );
      
      res.status(200).json({
        success: true,
        data: result,
        message: `Notification sent to ${event.name} ticket holders`,
      });
    } catch (error) {
      console.error('Notify ticket holders error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to send notification',
      });
    }
  }

  /**
   * Send event reminder to ticket holders
   * POST /api/v1/push/notify/event-reminder
   */
  async sendEventReminder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = EventReminderSchema.parse(req.body);
      
      // Verify user has permission for this event
      const event = await prisma.event.findUnique({
        where: { id: validatedData.eventId },
        select: { organizerId: true, name: true }
      });
      
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      
      const isAdmin = (req as any).user?.adminRole === 'ADMIN';
      if (!isAdmin && event.organizerId !== userId) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }
      
      // Send event reminder
      const result = await oneSignalService.sendEventReminder(
        validatedData.eventId,
        validatedData.eventName,
        validatedData.hoursBeforeEvent,
        {
          venue: validatedData.venue,
          startTime: validatedData.startTime,
          url: validatedData.url,
          data: validatedData.data,
        }
      );
      
      res.status(200).json({
        success: true,
        data: result,
        message: `Event reminder sent to ${event.name} ticket holders`,
      });
    } catch (error) {
      console.error('Send event reminder error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to send reminder',
      });
    }
  }

  /**
   * Send notification to segmented users
   * POST /api/v1/push/notify/segment
   */
  async notifySegment(req: Request, res: Response): Promise<void> {
    try {
      if ((req as any).user?.adminRole !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const validatedData = SegmentNotificationSchema.parse(req.body);
      
      let result;
      
      if (validatedData.segment.ticketHolders) {
        // Send to all ticket holders with optional filters
        result = await oneSignalService.sendToAllTicketHolders(
          validatedData.notification.title,
          validatedData.notification.body,
          {
            url: validatedData.notification.url,
            data: validatedData.notification.data,
            icon: validatedData.notification.icon,
            badge: validatedData.notification.badge,
            eventCategory: validatedData.segment.eventCategory,
            eventCity: validatedData.segment.eventCity,
          }
        );
      } else if (validatedData.segment.customTags) {
        // Send to users with custom tags
        result = await oneSignalService.sendToSegment(
          validatedData.segment.customTags,
          validatedData.notification.title,
          validatedData.notification.body,
          {
            url: validatedData.notification.url,
            data: validatedData.notification.data,
            icon: validatedData.notification.icon,
            badge: validatedData.notification.badge,
          }
        );
      } else {
        res.status(400).json({ error: 'Invalid segment configuration' });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Notification sent to segment',
      });
    } catch (error) {
      console.error('Notify segment error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to send notification',
      });
    }
  }

  /**
   * Get ticket holder statistics
   * GET /api/v1/admin/push/ticket-stats
   */
  async getTicketHolderStats(req: Request, res: Response): Promise<void> {
    try {
      if ((req as any).user?.adminRole !== 'ADMIN') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const [oneSignalStats, dbStats] = await Promise.all([
        oneSignalService.getTicketHolderStats(),
        this.getDatabaseTicketStats(),
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          oneSignal: oneSignalStats,
          database: dbStats,
        },
      });
    } catch (error) {
      console.error('Get ticket holder stats error:', error);
      res.status(500).json({
        error: 'Failed to get ticket holder statistics',
      });
    }
  }

  /**
   * Get database statistics for health check
   */
  private async getDatabaseStats(): Promise<{
    status: 'up' | 'down';
    totalSubscriptions?: number;
    lastCheck: string;
  }> {
    try {
      const totalSubscriptions = await prisma.pushSubscription.count({
        where: { subscribed: true },
      });
      
      return {
        status: 'up',
        totalSubscriptions,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
      };
    }
  }

  /**
   * Get database ticket holder statistics
   */
  private async getDatabaseTicketStats(): Promise<{
    totalTicketHolders: number;
    activeEvents: number;
    recentTicketSales: number;
    popularCategories: Array<{ category: string; count: number }>;
  }> {
    try {
      const [ticketHolders, activeEvents, recentSales, categoryStats] = await Promise.all([
        // Count unique users with active tickets
        prisma.ticket.findMany({
          where: { status: { in: ['ACTIVE', 'USED'] } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        // Count active events
        prisma.event.count({
          where: {
            status: 'ACTIVE',
            deletedAt: null,
          },
        }),
        // Count tickets sold in last 7 days
        prisma.ticket.count({
          where: {
            status: { in: ['ACTIVE', 'USED'] },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        // Get popular event categories
        prisma.event.groupBy({
          by: ['category'],
          where: {
            status: 'ACTIVE',
            deletedAt: null,
          },
          _count: {
            category: true,
          },
          orderBy: {
            _count: {
              category: 'desc',
            },
          },
          take: 5,
        }),
      ]);

      return {
        totalTicketHolders: ticketHolders.length,
        activeEvents,
        recentTicketSales: recentSales,
        popularCategories: categoryStats.map(stat => ({
          category: stat.category,
          count: stat._count.category,
        })),
      };
    } catch (error) {
      console.error('Database ticket stats error:', error);
      return {
        totalTicketHolders: 0,
        activeEvents: 0,
        recentTicketSales: 0,
        popularCategories: [],
      };
    }
  }
}