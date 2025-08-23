import { PrismaClient } from '@prisma/client';
import { PushSubscriptionService } from './push-subscription.service.js';
import { NotificationLoggerService } from './notification-logger.service.js';

export interface ErrorTrackingConfig {
  maxRetries: number;
  retryDelayMs: number;
  cleanupBatchSize: number;
  errorThresholdPercent: number;
  alertThresholdPercent: number;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByStatusCode: Record<number, number>;
  errorsByType: Record<string, number>;
  invalidEndpointsFound: number;
  subscriptionsCleanedUp: number;
  lastCleanupTime: Date | null;
}

export interface AlertCondition {
  type: 'high_failure_rate' | 'invalid_endpoints' | 'service_unavailable';
  severity: 'warning' | 'critical';
  message: string;
  data: any;
  timestamp: Date;
}

/**
 * Service for tracking errors and managing automatic cleanup
 */
export class ErrorTrackingService {
  private config: ErrorTrackingConfig;
  private pushSubscriptionService: PushSubscriptionService;
  private logger: NotificationLoggerService;
  private errorStats: ErrorStats;
  private alerts: AlertCondition[] = [];

  constructor(
    private prisma: PrismaClient,
    config?: Partial<ErrorTrackingConfig>
  ) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      cleanupBatchSize: 100,
      errorThresholdPercent: 10,
      alertThresholdPercent: 25,
      ...config,
    };

    this.pushSubscriptionService = new PushSubscriptionService(prisma);
    this.logger = new NotificationLoggerService(prisma);
    
    this.errorStats = {
      totalErrors: 0,
      errorsByStatusCode: {},
      errorsByType: {},
      invalidEndpointsFound: 0,
      subscriptionsCleanedUp: 0,
      lastCleanupTime: null,
    };
  }

  /**
   * Track an error from push notification sending
   */
  async trackError(
    endpoint: string,
    error: Error & { statusCode?: number },
    jobId?: string,
    eventId?: string
  ): Promise<void> {
    const statusCode = error.statusCode || 0;
    const errorType = this.categorizeError(error);

    // Update error statistics
    this.errorStats.totalErrors++;
    this.errorStats.errorsByStatusCode[statusCode] = 
      (this.errorStats.errorsByStatusCode[statusCode] || 0) + 1;
    this.errorStats.errorsByType[errorType] = 
      (this.errorStats.errorsByType[errorType] || 0) + 1;

    // Log the error
    console.error(`[ERROR-TRACKING] ${errorType}:`, {
      endpoint: this.maskEndpoint(endpoint),
      statusCode,
      error: error.message,
      jobId,
      eventId,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    await this.handleSpecificError(endpoint, error, jobId, eventId);

    // Check for alert conditions
    await this.checkAlertConditions();
  }

  /**
   * Handle specific error types with appropriate actions
   */
  private async handleSpecificError(
    endpoint: string,
    error: Error & { statusCode?: number },
    jobId?: string,
    eventId?: string
  ): Promise<void> {
    const statusCode = error.statusCode || 0;

    switch (statusCode) {
      case 404:
      case 410:
        // Invalid endpoint - mark for cleanup
        await this.markEndpointForCleanup(endpoint, statusCode, jobId);
        break;

      case 413:
        // Payload too large - log for payload optimization
        console.warn(`[PAYLOAD-TOO-LARGE] Endpoint: ${this.maskEndpoint(endpoint)}`, {
          jobId,
          eventId,
          suggestion: 'Consider reducing notification payload size',
        });
        break;

      case 429:
        // Rate limited - log for backoff adjustment
        console.warn(`[RATE-LIMITED] Endpoint: ${this.maskEndpoint(endpoint)}`, {
          jobId,
          eventId,
          suggestion: 'Consider reducing notification sending rate',
        });
        break;

      case 500:
      case 502:
      case 503:
        // Service unavailable - log for retry
        console.warn(`[SERVICE-UNAVAILABLE] Status: ${statusCode}`, {
          endpoint: this.maskEndpoint(endpoint),
          jobId,
          eventId,
          suggestion: 'Will retry with exponential backoff',
        });
        break;

      default:
        // Unknown error - log for investigation
        console.warn(`[UNKNOWN-ERROR] Status: ${statusCode}`, {
          endpoint: this.maskEndpoint(endpoint),
          error: error.message,
          jobId,
          eventId,
        });
    }
  }

  /**
   * Mark endpoint for cleanup
   */
  private async markEndpointForCleanup(
    endpoint: string,
    statusCode: number,
    jobId?: string
  ): Promise<void> {
    this.errorStats.invalidEndpointsFound++;

    console.log(`[MARK-FOR-CLEANUP] Endpoint marked for removal:`, {
      endpoint: this.maskEndpoint(endpoint),
      statusCode,
      jobId,
      timestamp: new Date().toISOString(),
    });

    // Immediately clean up the invalid subscription
    try {
      const cleaned = await this.pushSubscriptionService.cleanupInvalidSubscription(endpoint);
      if (cleaned) {
        this.errorStats.subscriptionsCleanedUp++;
        await this.logger.logSubscriptionCleanup([endpoint], 1, jobId);
      }
    } catch (cleanupError) {
      console.error(`[CLEANUP-ERROR] Failed to cleanup endpoint:`, {
        endpoint: this.maskEndpoint(endpoint),
        error: cleanupError,
      });
    }
  }

  /**
   * Perform batch cleanup of invalid subscriptions
   */
  async performBatchCleanup(): Promise<{
    processed: number;
    cleaned: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      cleaned: 0,
      errors: [] as string[],
    };

    try {
      // Clean up old disabled subscriptions (older than 7 days)
      const cleanedOld = await this.pushSubscriptionService.cleanupOldDisabledSubscriptions(7);
      result.cleaned += cleanedOld;
      result.processed += cleanedOld;

      this.errorStats.subscriptionsCleanedUp += cleanedOld;
      this.errorStats.lastCleanupTime = new Date();

      console.log(`[BATCH-CLEANUP] Completed:`, {
        oldSubscriptionsRemoved: cleanedOld,
        totalProcessed: result.processed,
        totalCleaned: result.cleaned,
        timestamp: new Date().toISOString(),
      });

      await this.logger.logSubscriptionCleanup([], cleanedOld);

    } catch (error) {
      const errorMessage = `Batch cleanup failed: ${error}`;
      result.errors.push(errorMessage);
      console.error(`[BATCH-CLEANUP-ERROR]`, error);
    }

    return result;
  }

  /**
   * Get current error statistics
   */
  getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  /**
   * Reset error statistics
   */
  resetErrorStats(): void {
    this.errorStats = {
      totalErrors: 0,
      errorsByStatusCode: {},
      errorsByType: {},
      invalidEndpointsFound: 0,
      subscriptionsCleanedUp: 0,
      lastCleanupTime: this.errorStats.lastCleanupTime,
    };
  }

  /**
   * Check for alert conditions
   */
  private async checkAlertConditions(): Promise<void> {
    const now = new Date();
    
    // Check failure rate (if we have enough data)
    if (this.errorStats.totalErrors >= 10) {
      const totalSubscriptions = await this.pushSubscriptionService.getTotalSubscriptionCount();
      if (totalSubscriptions > 0) {
        const failureRate = (this.errorStats.totalErrors / totalSubscriptions) * 100;
        
        if (failureRate >= this.config.alertThresholdPercent) {
          this.addAlert({
            type: 'high_failure_rate',
            severity: 'critical',
            message: `High notification failure rate: ${failureRate.toFixed(2)}%`,
            data: {
              failureRate,
              totalErrors: this.errorStats.totalErrors,
              totalSubscriptions,
              threshold: this.config.alertThresholdPercent,
            },
            timestamp: now,
          });
        } else if (failureRate >= this.config.errorThresholdPercent) {
          this.addAlert({
            type: 'high_failure_rate',
            severity: 'warning',
            message: `Elevated notification failure rate: ${failureRate.toFixed(2)}%`,
            data: {
              failureRate,
              totalErrors: this.errorStats.totalErrors,
              totalSubscriptions,
              threshold: this.config.errorThresholdPercent,
            },
            timestamp: now,
          });
        }
      }
    }

    // Check for high number of invalid endpoints
    if (this.errorStats.invalidEndpointsFound >= 50) {
      this.addAlert({
        type: 'invalid_endpoints',
        severity: 'warning',
        message: `High number of invalid endpoints found: ${this.errorStats.invalidEndpointsFound}`,
        data: {
          invalidEndpoints: this.errorStats.invalidEndpointsFound,
          cleanedUp: this.errorStats.subscriptionsCleanedUp,
        },
        timestamp: now,
      });
    }

    // Check for service unavailable errors
    const serviceUnavailableErrors = 
      (this.errorStats.errorsByStatusCode[500] || 0) +
      (this.errorStats.errorsByStatusCode[502] || 0) +
      (this.errorStats.errorsByStatusCode[503] || 0);

    if (serviceUnavailableErrors >= 10) {
      this.addAlert({
        type: 'service_unavailable',
        severity: 'warning',
        message: `Multiple push service unavailable errors: ${serviceUnavailableErrors}`,
        data: {
          serviceUnavailableErrors,
          errorsByStatusCode: this.errorStats.errorsByStatusCode,
        },
        timestamp: now,
      });
    }
  }

  /**
   * Add an alert
   */
  private addAlert(alert: AlertCondition): void {
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log the alert
    console.warn(`[ALERT-${alert.severity.toUpperCase()}] ${alert.type}:`, {
      message: alert.message,
      data: alert.data,
      timestamp: alert.timestamp.toISOString(),
    });
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): AlertCondition[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error & { statusCode?: number }): string {
    const statusCode = error.statusCode || 0;

    if (statusCode === 404 || statusCode === 410) {
      return 'invalid_endpoint';
    } else if (statusCode === 413) {
      return 'payload_too_large';
    } else if (statusCode === 429) {
      return 'rate_limited';
    } else if (statusCode >= 500) {
      return 'service_unavailable';
    } else if (statusCode >= 400) {
      return 'client_error';
    } else if (error.message.includes('timeout')) {
      return 'timeout';
    } else if (error.message.includes('network')) {
      return 'network_error';
    } else {
      return 'unknown_error';
    }
  }

  /**
   * Mask endpoint for privacy
   */
  private maskEndpoint(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      const pathParts = url.pathname.split('/');
      if (pathParts.length > 2) {
        pathParts[pathParts.length - 1] = '***';
      }
      return `${url.protocol}//${url.host}${pathParts.join('/')}`;
    } catch {
      return endpoint.length > 20 
        ? endpoint.substring(0, 20) + '***'
        : endpoint;
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    errorRate: number;
    recentAlerts: number;
    lastCleanup: Date | null;
  }> {
    const totalSubscriptions = await this.pushSubscriptionService.getTotalSubscriptionCount();
    const errorRate = totalSubscriptions > 0 
      ? (this.errorStats.totalErrors / totalSubscriptions) * 100 
      : 0;

    const recentAlerts = this.alerts.filter(
      alert => alert.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    ).length;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (errorRate >= this.config.alertThresholdPercent || recentAlerts >= 5) {
      status = 'critical';
    } else if (errorRate >= this.config.errorThresholdPercent || recentAlerts >= 2) {
      status = 'warning';
    }

    return {
      status,
      errorRate,
      recentAlerts,
      lastCleanup: this.errorStats.lastCleanupTime,
    };
  }
}