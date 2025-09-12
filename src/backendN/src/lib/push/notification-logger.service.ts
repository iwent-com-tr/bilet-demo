import { PrismaClient } from '@prisma/client';

export interface NotificationLogEntry {
  id?: string;
  eventId: string;
  jobId: string;
  jobType: 'event_update' | 'new_event';
  status: 'started' | 'completed' | 'failed';
  targetCount: number;
  sentCount: number;
  failedCount: number;
  invalidEndpoints: string[];
  errors: NotificationError[];
  processingTime?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface NotificationError {
  endpoint: string;
  error: string;
  statusCode?: number;
  timestamp: Date;
}

export interface NotificationMetrics {
  totalNotifications: number;
  successfulNotifications: number;
  failedNotifications: number;
  successRate: number;
  averageProcessingTime: number;
  invalidEndpointsCleanedUp: number;
  errorsByType: Record<string, number>;
  errorsByStatusCode: Record<number, number>;
}

/**
 * Service for structured logging of notification operations
 */
export class NotificationLoggerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log the start of a notification job
   */
  async logJobStart(
    jobId: string,
    eventId: string,
    jobType: 'event_update' | 'new_event',
    targetCount: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logEntry: NotificationLogEntry = {
      eventId,
      jobId,
      jobType,
      status: 'started',
      targetCount,
      sentCount: 0,
      failedCount: 0,
      invalidEndpoints: [],
      errors: [],
      timestamp: new Date(),
      metadata,
    };

    console.log(`[NOTIFICATION-START] Job ${jobId}:`, {
      eventId,
      jobType,
      targetCount,
      timestamp: logEntry.timestamp.toISOString(),
      metadata,
    });

    // Store in database if notification logging table exists
    try {
      await this.storeLogEntry(logEntry);
    } catch (error) {
      console.warn('Failed to store notification log entry:', error);
    }
  }

  /**
   * Log the completion of a notification job
   */
  async logJobCompletion(
    jobId: string,
    eventId: string,
    jobType: 'event_update' | 'new_event',
    result: {
      sent: number;
      failed: number;
      invalidEndpoints: string[];
      errors?: Array<{
        endpoint: string;
        error: string;
        statusCode?: number;
      }>;
      processingTime: number;
    },
    metadata?: Record<string, any>
  ): Promise<void> {
    const errors: NotificationError[] = (result.errors || []).map(error => ({
      endpoint: error.endpoint,
      error: error.error,
      statusCode: error.statusCode,
      timestamp: new Date(),
    }));

    const logEntry: NotificationLogEntry = {
      eventId,
      jobId,
      jobType,
      status: 'completed',
      targetCount: result.sent + result.failed,
      sentCount: result.sent,
      failedCount: result.failed,
      invalidEndpoints: result.invalidEndpoints,
      errors,
      processingTime: result.processingTime,
      timestamp: new Date(),
      metadata,
    };

    const successRate = logEntry.targetCount > 0 
      ? (logEntry.sentCount / logEntry.targetCount * 100).toFixed(2)
      : '0';

    console.log(`[NOTIFICATION-COMPLETE] Job ${jobId}:`, {
      eventId,
      jobType,
      sent: result.sent,
      failed: result.failed,
      successRate: `${successRate}%`,
      processingTime: `${result.processingTime}ms`,
      invalidEndpoints: result.invalidEndpoints.length,
      timestamp: logEntry.timestamp.toISOString(),
      metadata,
    });

    // Log errors if any
    if (errors.length > 0) {
      console.warn(`[NOTIFICATION-ERRORS] Job ${jobId}:`, {
        errorCount: errors.length,
        errors: errors.map(e => ({
          endpoint: this.maskEndpoint(e.endpoint),
          error: e.error,
          statusCode: e.statusCode,
        })),
      });
    }

    // Store in database
    try {
      await this.storeLogEntry(logEntry);
    } catch (error) {
      console.warn('Failed to store notification log entry:', error);
    }
  }

  /**
   * Log a failed notification job
   */
  async logJobFailure(
    jobId: string,
    eventId: string,
    jobType: 'event_update' | 'new_event',
    error: Error,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logEntry: NotificationLogEntry = {
      eventId,
      jobId,
      jobType,
      status: 'failed',
      targetCount: 0,
      sentCount: 0,
      failedCount: 0,
      invalidEndpoints: [],
      errors: [{
        endpoint: 'job-level-error',
        error: error.message,
        timestamp: new Date(),
      }],
      timestamp: new Date(),
      metadata: {
        ...metadata,
        errorStack: error.stack,
      },
    };

    console.error(`[NOTIFICATION-FAILED] Job ${jobId}:`, {
      eventId,
      jobType,
      error: error.message,
      stack: error.stack,
      timestamp: logEntry.timestamp.toISOString(),
      metadata,
    });

    // Store in database
    try {
      await this.storeLogEntry(logEntry);
    } catch (dbError) {
      console.warn('Failed to store notification log entry:', dbError);
    }
  }

  /**
   * Log cleanup of invalid subscriptions
   */
  async logSubscriptionCleanup(
    endpoints: string[],
    cleanedCount: number,
    jobId?: string
  ): Promise<void> {
    console.log(`[SUBSCRIPTION-CLEANUP]${jobId ? ` Job ${jobId}:` : ''}`, {
      endpointsToClean: endpoints.length,
      actuallyCleanedUp: cleanedCount,
      timestamp: new Date().toISOString(),
      endpoints: endpoints.map(e => this.maskEndpoint(e)),
    });

    // Store cleanup metrics
    try {
      await this.storeCleanupMetrics(endpoints.length, cleanedCount);
    } catch (error) {
      console.warn('Failed to store cleanup metrics:', error);
    }
  }

  /**
   * Get notification metrics for a time period
   */
  async getMetrics(
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<NotificationMetrics> {
    try {
      // Try to get metrics from database first
      const dbMetrics = await this.getMetricsFromDatabase(startDate, endDate);
      if (dbMetrics) {
        return dbMetrics;
      }
    } catch (error) {
      console.warn('Failed to get metrics from database, using in-memory fallback:', error);
    }

    // Fallback to basic metrics calculation
    return this.getBasicMetrics();
  }

  /**
   * Get recent notification errors
   */
  async getRecentErrors(limit: number = 50): Promise<NotificationError[]> {
    try {
      return await this.getErrorsFromDatabase(limit);
    } catch (error) {
      console.warn('Failed to get errors from database:', error);
      return [];
    }
  }

  /**
   * Store log entry in database (if notification_logs table exists)
   */
  private async storeLogEntry(entry: NotificationLogEntry): Promise<void> {
    // This would require a notification_logs table in the database
    // For now, we'll just log to console and skip database storage
    // In a real implementation, you would create the table and store the entry
    
    // Example implementation:
    // await this.prisma.notificationLog.create({
    //   data: {
    //     eventId: entry.eventId,
    //     jobId: entry.jobId,
    //     jobType: entry.jobType,
    //     status: entry.status,
    //     targetCount: entry.targetCount,
    //     sentCount: entry.sentCount,
    //     failedCount: entry.failedCount,
    //     invalidEndpoints: entry.invalidEndpoints,
    //     errors: JSON.stringify(entry.errors),
    //     processingTime: entry.processingTime,
    //     timestamp: entry.timestamp,
    //     metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    //   },
    // });
  }

  /**
   * Store cleanup metrics
   */
  private async storeCleanupMetrics(
    endpointsToClean: number,
    actuallyCleanedUp: number
  ): Promise<void> {
    // This would store cleanup metrics in a separate table
    // For now, we'll just track in memory or logs
  }

  /**
   * Get metrics from database
   */
  private async getMetricsFromDatabase(
    startDate: Date,
    endDate: Date
  ): Promise<NotificationMetrics | null> {
    // This would query the notification_logs table for metrics
    // For now, return null to use fallback
    return null;
  }

  /**
   * Get errors from database
   */
  private async getErrorsFromDatabase(limit: number): Promise<NotificationError[]> {
    // This would query the notification_logs table for recent errors
    // For now, return empty array
    return [];
  }

  /**
   * Get basic metrics as fallback
   */
  private getBasicMetrics(): NotificationMetrics {
    return {
      totalNotifications: 0,
      successfulNotifications: 0,
      failedNotifications: 0,
      successRate: 0,
      averageProcessingTime: 0,
      invalidEndpointsCleanedUp: 0,
      errorsByType: {},
      errorsByStatusCode: {},
    };
  }

  /**
   * Mask endpoint URL for privacy in logs
   */
  private maskEndpoint(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      const pathParts = url.pathname.split('/');
      if (pathParts.length > 2) {
        // Mask the middle part of the path
        pathParts[pathParts.length - 1] = '***';
      }
      return `${url.protocol}//${url.host}${pathParts.join('/')}`;
    } catch {
      // If URL parsing fails, just mask the end
      return endpoint.length > 20 
        ? endpoint.substring(0, 20) + '***'
        : endpoint;
    }
  }

  /**
   * Log system health metrics
   */
  async logHealthMetrics(metrics: {
    queueHealth: any;
    workerStats: any;
    subscriptionCount: number;
  }): Promise<void> {
    console.log('[NOTIFICATION-HEALTH]', {
      timestamp: new Date().toISOString(),
      queue: {
        redis: metrics.queueHealth.redis,
        waiting: metrics.queueHealth.waiting,
        active: metrics.queueHealth.active,
        failed: metrics.queueHealth.failed,
      },
      worker: {
        isRunning: metrics.workerStats.isRunning,
        concurrency: metrics.workerStats.concurrency,
      },
      subscriptions: {
        total: metrics.subscriptionCount,
      },
    });
  }
}