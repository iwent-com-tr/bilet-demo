import { PrismaClient } from '@prisma/client';
import { PushSubscriptionService } from './push-subscription.service.js';
import { checkQueueHealth } from '../queue/index.js';

export interface NotificationMetrics {
  // Success metrics
  totalNotificationsSent: number;
  successfulNotifications: number;
  failedNotifications: number;
  successRate: number;

  // Performance metrics
  averageProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  totalProcessingTime: number;

  // Error metrics
  errorsByStatusCode: Record<number, number>;
  errorsByType: Record<string, number>;
  invalidEndpointsCleanedUp: number;

  // Queue metrics
  queueHealth: {
    redis: boolean;
    queue: boolean;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };

  // Subscription metrics
  totalSubscriptions: number;
  activeSubscriptions: number;
  disabledSubscriptions: number;
  subscriptionGrowthRate: number;

  // Time period
  periodStart: Date;
  periodEnd: Date;
  collectionTime: Date;
}

export interface PerformanceMetrics {
  jobId: string;
  eventId: string;
  jobType: string;
  processingTime: number;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  timestamp: Date;
}

export interface SystemHealthMetrics {
  overall: 'healthy' | 'warning' | 'critical';
  components: {
    redis: 'healthy' | 'unhealthy';
    queue: 'healthy' | 'warning' | 'critical';
    worker: 'healthy' | 'unhealthy';
    database: 'healthy' | 'unhealthy';
  };
  metrics: {
    queueBacklog: number;
    errorRate: number;
    averageProcessingTime: number;
    subscriptionCount: number;
  };
  alerts: string[];
  lastUpdated: Date;
}

/**
 * Service for collecting and aggregating notification metrics
 */
export class MetricsCollectorService {
  private performanceData: PerformanceMetrics[] = [];
  private maxPerformanceDataSize = 1000; // Keep last 1000 entries
  private pushSubscriptionService: PushSubscriptionService;

  constructor(private prisma: PrismaClient) {
    this.pushSubscriptionService = new PushSubscriptionService(prisma);
  }

  /**
   * Record performance metrics for a completed job
   */
  recordJobPerformance(metrics: PerformanceMetrics): void {
    this.performanceData.push(metrics);

    // Keep only the most recent entries
    if (this.performanceData.length > this.maxPerformanceDataSize) {
      this.performanceData = this.performanceData.slice(-this.maxPerformanceDataSize);
    }

    console.log(`[METRICS] Job performance recorded:`, {
      jobId: metrics.jobId,
      eventId: metrics.eventId,
      jobType: metrics.jobType,
      processingTime: `${metrics.processingTime}ms`,
      successRate: metrics.targetCount > 0 
        ? `${((metrics.sentCount / metrics.targetCount) * 100).toFixed(2)}%`
        : '0%',
      timestamp: metrics.timestamp.toISOString(),
    });
  }

  /**
   * Collect comprehensive notification metrics for a time period
   */
  async collectMetrics(
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<NotificationMetrics> {
    const collectionStart = Date.now();

    // Filter performance data for the time period
    const periodData = this.performanceData.filter(
      data => data.timestamp >= startDate && data.timestamp <= endDate
    );

    // Calculate success metrics
    const totalNotificationsSent = periodData.reduce((sum, data) => sum + data.targetCount, 0);
    const successfulNotifications = periodData.reduce((sum, data) => sum + data.sentCount, 0);
    const failedNotifications = periodData.reduce((sum, data) => sum + data.failedCount, 0);
    const successRate = totalNotificationsSent > 0 
      ? (successfulNotifications / totalNotificationsSent) * 100 
      : 0;

    // Calculate performance metrics
    const processingTimes = periodData.map(data => data.processingTime);
    const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0);
    const averageProcessingTime = processingTimes.length > 0 
      ? totalProcessingTime / processingTimes.length 
      : 0;
    const minProcessingTime = processingTimes.length > 0 
      ? Math.min(...processingTimes) 
      : 0;
    const maxProcessingTime = processingTimes.length > 0 
      ? Math.max(...processingTimes) 
      : 0;

    // Get queue health
    const queueHealth = await checkQueueHealth();

    // Get subscription metrics
    const totalSubscriptions = await this.pushSubscriptionService.getTotalSubscriptionCount(false);
    const activeSubscriptions = await this.pushSubscriptionService.getTotalSubscriptionCount(true);
    const disabledSubscriptions = totalSubscriptions - activeSubscriptions;

    // Calculate subscription growth rate (simplified - would need historical data)
    const subscriptionGrowthRate = 0; // Placeholder

    const metrics: NotificationMetrics = {
      // Success metrics
      totalNotificationsSent,
      successfulNotifications,
      failedNotifications,
      successRate,

      // Performance metrics
      averageProcessingTime,
      minProcessingTime,
      maxProcessingTime,
      totalProcessingTime,

      // Error metrics (simplified - would need error tracking integration)
      errorsByStatusCode: {},
      errorsByType: {},
      invalidEndpointsCleanedUp: 0,

      // Queue metrics
      queueHealth,

      // Subscription metrics
      totalSubscriptions,
      activeSubscriptions,
      disabledSubscriptions,
      subscriptionGrowthRate,

      // Time period
      periodStart: startDate,
      periodEnd: endDate,
      collectionTime: new Date(),
    };

    const collectionTime = Date.now() - collectionStart;
    console.log(`[METRICS] Metrics collected in ${collectionTime}ms:`, {
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalJobs: periodData.length,
      totalNotifications: totalNotificationsSent,
      successRate: `${successRate.toFixed(2)}%`,
      avgProcessingTime: `${averageProcessingTime.toFixed(2)}ms`,
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        disabled: disabledSubscriptions,
      },
      queue: {
        waiting: queueHealth.waiting,
        active: queueHealth.active,
        failed: queueHealth.failed,
      },
    });

    return metrics;
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    const queueHealth = await checkQueueHealth();
    const subscriptionCount = await this.pushSubscriptionService.getTotalSubscriptionCount();

    // Calculate recent performance metrics (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentData = this.performanceData.filter(
      data => data.timestamp >= oneHourAgo
    );

    const recentTotalNotifications = recentData.reduce((sum, data) => sum + data.targetCount, 0);
    const recentSuccessfulNotifications = recentData.reduce((sum, data) => sum + data.sentCount, 0);
    const errorRate = recentTotalNotifications > 0 
      ? ((recentTotalNotifications - recentSuccessfulNotifications) / recentTotalNotifications) * 100
      : 0;

    const recentProcessingTimes = recentData.map(data => data.processingTime);
    const averageProcessingTime = recentProcessingTimes.length > 0
      ? recentProcessingTimes.reduce((sum, time) => sum + time, 0) / recentProcessingTimes.length
      : 0;

    // Determine component health
    const components = {
      redis: queueHealth.redis ? 'healthy' as const : 'unhealthy' as const,
      queue: this.determineQueueHealth(queueHealth),
      worker: queueHealth.active > 0 ? 'healthy' as const : 'unhealthy' as const,
      database: 'healthy' as const, // Simplified - would need actual DB health check
    };

    // Determine overall health
    const overall = this.determineOverallHealth(components, errorRate, queueHealth.waiting);

    // Generate alerts
    const alerts: string[] = [];
    if (!queueHealth.redis) {
      alerts.push('Redis connection is down');
    }
    if (queueHealth.failed > 10) {
      alerts.push(`High number of failed jobs: ${queueHealth.failed}`);
    }
    if (queueHealth.waiting > 100) {
      alerts.push(`High queue backlog: ${queueHealth.waiting} jobs waiting`);
    }
    if (errorRate > 10) {
      alerts.push(`High error rate: ${errorRate.toFixed(2)}%`);
    }
    if (averageProcessingTime > 30000) {
      alerts.push(`Slow processing: ${(averageProcessingTime / 1000).toFixed(2)}s average`);
    }

    return {
      overall,
      components,
      metrics: {
        queueBacklog: queueHealth.waiting,
        errorRate,
        averageProcessingTime,
        subscriptionCount,
      },
      alerts,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get performance summary for recent jobs
   */
  getPerformanceSummary(limit: number = 50): {
    recentJobs: PerformanceMetrics[];
    summary: {
      totalJobs: number;
      averageProcessingTime: number;
      averageSuccessRate: number;
      totalNotificationsSent: number;
    };
  } {
    const recentJobs = this.performanceData
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    const totalJobs = recentJobs.length;
    const totalProcessingTime = recentJobs.reduce((sum, job) => sum + job.processingTime, 0);
    const averageProcessingTime = totalJobs > 0 ? totalProcessingTime / totalJobs : 0;

    const totalNotificationsSent = recentJobs.reduce((sum, job) => sum + job.targetCount, 0);
    const totalSuccessfulNotifications = recentJobs.reduce((sum, job) => sum + job.sentCount, 0);
    const averageSuccessRate = totalNotificationsSent > 0 
      ? (totalSuccessfulNotifications / totalNotificationsSent) * 100 
      : 0;

    return {
      recentJobs,
      summary: {
        totalJobs,
        averageProcessingTime,
        averageSuccessRate,
        totalNotificationsSent,
      },
    };
  }

  /**
   * Clear old performance data
   */
  clearOldData(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = this.performanceData.length;
    
    this.performanceData = this.performanceData.filter(
      data => data.timestamp > cutoffTime
    );

    const removedCount = initialLength - this.performanceData.length;
    
    if (removedCount > 0) {
      console.log(`[METRICS] Cleared ${removedCount} old performance entries`);
    }

    return removedCount;
  }

  /**
   * Export metrics to JSON
   */
  async exportMetrics(
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<string> {
    const metrics = await this.collectMetrics(startDate, endDate);
    const systemHealth = await this.getSystemHealth();
    const performanceSummary = this.getPerformanceSummary();

    const exportData = {
      metrics,
      systemHealth,
      performanceSummary,
      exportTime: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Determine queue health status
   */
  private determineQueueHealth(queueHealth: any): 'healthy' | 'warning' | 'critical' {
    if (!queueHealth.queue || !queueHealth.redis) {
      return 'critical';
    }
    
    if (queueHealth.waiting > 100 || queueHealth.failed > 20) {
      return 'critical';
    }
    
    if (queueHealth.waiting > 50 || queueHealth.failed > 10) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Determine overall system health
   */
  private determineOverallHealth(
    components: any,
    errorRate: number,
    queueBacklog: number
  ): 'healthy' | 'warning' | 'critical' {
    // Critical conditions
    if (components.redis === 'unhealthy' || 
        components.queue === 'critical' ||
        errorRate > 25 ||
        queueBacklog > 200) {
      return 'critical';
    }

    // Warning conditions
    if (components.queue === 'warning' ||
        components.worker === 'unhealthy' ||
        errorRate > 10 ||
        queueBacklog > 50) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Get metrics for specific time ranges
   */
  async getMetricsForTimeRange(range: 'hour' | 'day' | 'week' | 'month'): Promise<NotificationMetrics> {
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return await this.collectMetrics(startDate, now);
  }
}