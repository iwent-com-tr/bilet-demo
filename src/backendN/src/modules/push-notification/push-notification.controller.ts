import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import { oneSignalService } from './onesignal.service';
import {
  SyncSubscriptionSchema,
  UpdateTagsSchema,
  TestNotificationSchema,
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
      // Log webhook for debugging
      console.log('[OneSignal Webhook]', {
        url: req.url,
        body: req.body,
        timestamp: new Date().toISOString(),
      });
      
      // Always return 200 to OneSignal
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
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
   * Send test notification (development)
   * POST /api/v1/admin/push/test
   */
  async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      // Only allow in development environment
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'Test endpoints not available in production' });
        return;
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const validatedData = TestNotificationSchema.parse(req.body);
      
      // Get user's subscriptions
      const subscriptions = await subscriptionService.getUserSubscriptions(
        validatedData.userId || userId
      );
      
      if (subscriptions.length === 0) {
        res.status(404).json({ error: 'No active subscriptions found' });
        return;
      }
      
      // Send test notification to the first subscription
      const result = await oneSignalService.sendTestNotification(
        subscriptions[0].onesignalUserId,
        validatedData.title,
        validatedData.body
      );
      
      res.status(200).json({
        success: true,
        data: result,
        devicesNotified: subscriptions.length,
      });
    } catch (error) {
      console.error('Send test notification error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to send test notification',
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
}