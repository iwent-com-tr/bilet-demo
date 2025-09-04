import { Request, Response } from 'express';
import { checkQueueHealth, getQueueStats } from '../../lib/queue/index.js';
import { notificationService } from '../../lib/queue/notification.service.js';

export class QueueController {
  /**
   * Get queue health status
   */
  async getHealth(req: Request, res: Response) {
    try {
      const health = await checkQueueHealth();
      const status = health.redis && health.queue ? 200 : 503;
      
      res.status(status).json({
        success: status === 200,
        data: health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Queue health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check queue health',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get detailed queue statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await getQueueStats();
      const serviceStats = await notificationService.getQueueStats();
      
      res.json({
        success: true,
        data: {
          ...stats,
          detailed: serviceStats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Queue stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get queue statistics',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Retry failed jobs (admin only)
   */
  async retryFailedJobs(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const retriedCount = await notificationService.retryFailedJobs(limit);
      
      res.json({
        success: true,
        data: {
          retriedCount,
          limit,
        },
        message: `Retried ${retriedCount} failed jobs`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Retry failed jobs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retry failed jobs',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Clean old jobs (admin only)
   */
  async cleanOldJobs(req: Request, res: Response) {
    try {
      const olderThanHours = parseInt(req.query.hours as string) || 24;
      const olderThanMs = olderThanHours * 60 * 60 * 1000;
      
      await notificationService.cleanOldJobs(olderThanMs);
      
      res.json({
        success: true,
        message: `Cleaned jobs older than ${olderThanHours} hours`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Clean old jobs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clean old jobs',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Pause queue (admin only)
   */
  async pauseQueue(req: Request, res: Response) {
    try {
      await notificationService.pauseQueue();
      
      res.json({
        success: true,
        message: 'Queue paused successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Pause queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause queue',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Resume queue (admin only)
   */
  async resumeQueue(req: Request, res: Response) {
    try {
      await notificationService.resumeQueue();
      
      res.json({
        success: true,
        message: 'Queue resumed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Resume queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resume queue',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const queueController = new QueueController();