import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getNotificationWorker } from '../../lib/queue/notification.worker.js';
import { checkQueueHealth, getQueueStats } from '../../lib/queue/index.js';
import { PushSubscriptionService } from '../../lib/push/push-subscription.service.js';
import { MetricsCollectorService } from '../../lib/push/metrics-collector.service.js';
import { ErrorTrackingService } from '../../lib/push/error-tracking.service.js';

/**
 * Controller for push notification system health monitoring
 */
export class HealthController {
  private pushSubscriptionService: PushSubscriptionService;
  private metricsCollector: MetricsCollectorService;
  private errorTracker: ErrorTrackingService;

  constructor(private prisma: PrismaClient) {
    this.pushSubscriptionService = new PushSubscriptionService(prisma);
    this.metricsCollector = new MetricsCollectorService(prisma);
    this.errorTracker = new ErrorTrackingService(prisma);
  }

  /**
   * Get overall system health status
   */
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const systemHealth = await this.metricsCollector.getSystemHealth();
      
      res.json({
        status: 'success',
        data: systemHealth,
      });
    } catch (error) {
      console.error('Failed to get system health:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve system health',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get detailed queue health information
   */
  async getQueueHealth(req: Request, res: Response): Promise<void> {
    try {
      const queueHealth = await checkQueueHealth();
      const queueStats = await getQueueStats();
      
      res.json({
        status: 'success',
        data: {
          health: queueHealth,
          stats: queueStats,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to get queue health:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve queue health',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get worker status and statistics
   */
  async getWorkerStatus(req: Request, res: Response): Promise<void> {
    try {
      const worker = getNotificationWorker();
      
      if (!worker) {
        res.status(503).json({
          status: 'error',
          message: 'Notification worker not initialized',
          data: {
            isRunning: false,
            initialized: false,
          },
        });
        return;
      }

      const workerStats = await worker.getStats();
      const healthMetrics = await worker.getHealthMetrics();
      
      res.json({
        status: 'success',
        data: {
          worker: workerStats,
          health: healthMetrics,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to get worker status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve worker status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get notification metrics for different time periods
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'day' } = req.query;
      
      if (!['hour', 'day', 'week', 'month'].includes(period as string)) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid period. Must be one of: hour, day, week, month',
        });
        return;
      }

      const metrics = await this.metricsCollector.getMetricsForTimeRange(period as any);
      const performanceSummary = this.metricsCollector.getPerformanceSummary(50);
      
      res.json({
        status: 'success',
        data: {
          metrics,
          performanceSummary,
          period,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to get metrics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get error statistics and recent alerts
   */
  async getErrorStats(req: Request, res: Response): Promise<void> {
    try {
      const errorStats = this.errorTracker.getErrorStats();
      const recentAlerts = this.errorTracker.getRecentAlerts(20);
      const healthStatus = await this.errorTracker.getHealthStatus();
      
      res.json({
        status: 'success',
        data: {
          errorStats,
          recentAlerts,
          healthStatus,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to get error stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve error statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(req: Request, res: Response): Promise<void> {
    try {
      const totalSubscriptions = await this.pushSubscriptionService.getTotalSubscriptionCount(false);
      const activeSubscriptions = await this.pushSubscriptionService.getTotalSubscriptionCount(true);
      const disabledSubscriptions = totalSubscriptions - activeSubscriptions;
      
      res.json({
        status: 'success',
        data: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          disabled: disabledSubscriptions,
          activePercentage: totalSubscriptions > 0 
            ? ((activeSubscriptions / totalSubscriptions) * 100).toFixed(2)
            : '0',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to get subscription stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve subscription statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Perform system maintenance tasks
   */
  async performMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const worker = getNotificationWorker();
      
      if (!worker) {
        res.status(503).json({
          status: 'error',
          message: 'Notification worker not available for maintenance',
        });
        return;
      }

      const maintenanceResult = await worker.performMaintenance();
      
      res.json({
        status: 'success',
        message: 'Maintenance tasks completed successfully',
        data: maintenanceResult,
      });
    } catch (error) {
      console.error('Failed to perform maintenance:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to perform maintenance tasks',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Export metrics data
   */
  async exportMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      
      let start: Date;
      let end: Date = new Date();
      
      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          res.status(400).json({
            status: 'error',
            message: 'Invalid startDate format',
          });
          return;
        }
      } else {
        // Default to last 24 hours
        start = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }
      
      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          res.status(400).json({
            status: 'error',
            message: 'Invalid endDate format',
          });
          return;
        }
      }

      const exportData = await this.metricsCollector.exportMetrics(start, end);
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="metrics-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.json"`);
        res.send(exportData);
      } else {
        res.status(400).json({
          status: 'error',
          message: 'Unsupported format. Only JSON is currently supported.',
        });
      }
    } catch (error) {
      console.error('Failed to export metrics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to export metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Clear alerts (admin only)
   */
  async clearAlerts(req: Request, res: Response): Promise<void> {
    try {
      this.errorTracker.clearAlerts();
      
      res.json({
        status: 'success',
        message: 'All alerts cleared successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to clear alerts:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to clear alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Reset error statistics (admin only)
   */
  async resetErrorStats(req: Request, res: Response): Promise<void> {
    try {
      this.errorTracker.resetErrorStats();
      
      res.json({
        status: 'success',
        message: 'Error statistics reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to reset error stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to reset error statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const [
        systemHealth,
        queueHealth,
        subscriptionStats,
        errorStats,
        metrics,
      ] = await Promise.all([
        this.metricsCollector.getSystemHealth(),
        checkQueueHealth(),
        Promise.all([
          this.pushSubscriptionService.getTotalSubscriptionCount(false),
          this.pushSubscriptionService.getTotalSubscriptionCount(true),
        ]),
        this.errorTracker.getErrorStats(),
        this.metricsCollector.getMetricsForTimeRange('day'),
      ]);

      const [totalSubs, activeSubs] = subscriptionStats;
      const recentAlerts = this.errorTracker.getRecentAlerts(10);
      const performanceSummary = this.metricsCollector.getPerformanceSummary(20);

      res.json({
        status: 'success',
        data: {
          systemHealth,
          queueHealth,
          subscriptions: {
            total: totalSubs,
            active: activeSubs,
            disabled: totalSubs - activeSubs,
            activePercentage: totalSubs > 0 ? ((activeSubs / totalSubs) * 100).toFixed(2) : '0',
          },
          errorStats,
          recentAlerts,
          metrics: {
            daily: metrics,
            performance: performanceSummary,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve dashboard data',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}