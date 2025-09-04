import { PrismaClient } from '@prisma/client';
import { MetricsCollectorService } from './metrics-collector.service.js';
import { ErrorTrackingService } from './error-tracking.service.js';
import { checkQueueHealth } from '../queue/index.js';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface AlertCondition {
  type: 'metric_threshold' | 'queue_backlog' | 'error_rate' | 'worker_down' | 'redis_down';
  metric?: string;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold?: number;
  timeWindow?: number; // minutes
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface AlertingConfig {
  checkIntervalMinutes: number;
  maxAlertsPerRule: number;
  alertRetentionDays: number;
  webhookUrl?: string;
  emailRecipients?: string[];
}

/**
 * Service for monitoring system metrics and triggering alerts
 */
export class AlertingService {
  private config: AlertingConfig;
  private metricsCollector: MetricsCollectorService;
  private errorTracker: ErrorTrackingService;
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private checkInterval?: NodeJS.Timeout;

  constructor(
    private prisma: PrismaClient,
    config?: Partial<AlertingConfig>
  ) {
    this.config = {
      checkIntervalMinutes: 5,
      maxAlertsPerRule: 10,
      alertRetentionDays: 7,
      ...config,
    };

    this.metricsCollector = new MetricsCollectorService(prisma);
    this.errorTracker = new ErrorTrackingService(prisma);

    // Initialize default alert rules
    this.initializeDefaultRules();
  }

  /**
   * Start the alerting service
   */
  start(): void {
    if (this.checkInterval) {
      this.stop();
    }

    console.log(`[ALERTING] Starting alerting service with ${this.config.checkIntervalMinutes}min interval`);
    
    // Run initial check
    this.checkAlerts().catch(error => {
      console.error('[ALERTING] Initial alert check failed:', error);
    });

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAlerts().catch(error => {
        console.error('[ALERTING] Periodic alert check failed:', error);
      });
    }, this.config.checkIntervalMinutes * 60 * 1000);
  }

  /**
   * Stop the alerting service
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      console.log('[ALERTING] Alerting service stopped');
    }
  }

  /**
   * Check all alert rules and trigger alerts if conditions are met
   */
  async checkAlerts(): Promise<void> {
    const now = new Date();
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown period
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (now.getTime() - rule.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      try {
        const shouldAlert = await this.evaluateRule(rule);
        
        if (shouldAlert) {
          await this.triggerAlert(rule);
          rule.lastTriggered = now;
        }
      } catch (error) {
        console.error(`[ALERTING] Failed to evaluate rule ${rule.id}:`, error);
      }
    }

    // Clean up old alerts
    this.cleanupOldAlerts();
  }

  /**
   * Evaluate if an alert rule should trigger
   */
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    const condition = rule.condition;

    switch (condition.type) {
      case 'queue_backlog':
        return await this.checkQueueBacklog(condition.threshold || 100);

      case 'error_rate':
        return await this.checkErrorRate(
          condition.threshold || 10,
          condition.timeWindow || 60
        );

      case 'worker_down':
        return await this.checkWorkerStatus();

      case 'redis_down':
        return await this.checkRedisStatus();

      case 'metric_threshold':
        return await this.checkMetricThreshold(
          condition.metric!,
          condition.operator!,
          condition.threshold!,
          condition.timeWindow || 60
        );

      default:
        console.warn(`[ALERTING] Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Check queue backlog
   */
  private async checkQueueBacklog(threshold: number): Promise<boolean> {
    const queueHealth = await checkQueueHealth();
    return queueHealth.waiting > threshold;
  }

  /**
   * Check error rate
   */
  private async checkErrorRate(thresholdPercent: number, timeWindowMinutes: number): Promise<boolean> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindowMinutes * 60 * 1000);
    
    const metrics = await this.metricsCollector.collectMetrics(startTime, endTime);
    const errorRate = metrics.totalNotificationsSent > 0 
      ? ((metrics.totalNotificationsSent - metrics.successfulNotifications) / metrics.totalNotificationsSent) * 100
      : 0;

    return errorRate > thresholdPercent;
  }

  /**
   * Check worker status
   */
  private async checkWorkerStatus(): Promise<boolean> {
    const queueHealth = await checkQueueHealth();
    return queueHealth.active === 0; // No active workers
  }

  /**
   * Check Redis status
   */
  private async checkRedisStatus(): Promise<boolean> {
    const queueHealth = await checkQueueHealth();
    return !queueHealth.redis;
  }

  /**
   * Check metric threshold
   */
  private async checkMetricThreshold(
    metric: string,
    operator: string,
    threshold: number,
    timeWindowMinutes: number
  ): Promise<boolean> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeWindowMinutes * 60 * 1000);
    
    const metrics = await this.metricsCollector.collectMetrics(startTime, endTime);
    
    let value: number;
    switch (metric) {
      case 'success_rate':
        value = metrics.successRate;
        break;
      case 'avg_processing_time':
        value = metrics.averageProcessingTime;
        break;
      case 'total_notifications':
        value = metrics.totalNotificationsSent;
        break;
      case 'failed_notifications':
        value = metrics.failedNotifications;
        break;
      default:
        console.warn(`[ALERTING] Unknown metric: ${metric}`);
        return false;
    }

    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: await this.generateAlertMessage(rule),
      data: await this.gatherAlertData(rule),
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(alert);

    // Keep only the most recent alerts per rule
    const ruleAlerts = this.alerts.filter(a => a.ruleId === rule.id && !a.resolved);
    if (ruleAlerts.length > this.config.maxAlertsPerRule) {
      const oldestAlerts = ruleAlerts
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .slice(0, ruleAlerts.length - this.config.maxAlertsPerRule);
      
      for (const oldAlert of oldestAlerts) {
        oldAlert.resolved = true;
        oldAlert.resolvedAt = new Date();
      }
    }

    console.warn(`[ALERT-${alert.severity.toUpperCase()}] ${alert.ruleName}: ${alert.message}`, {
      alertId: alert.id,
      data: alert.data,
      timestamp: alert.timestamp.toISOString(),
    });

    // Send alert notifications
    await this.sendAlertNotifications(alert);
  }

  /**
   * Generate alert message
   */
  private async generateAlertMessage(rule: AlertRule): Promise<string> {
    const condition = rule.condition;
    
    switch (condition.type) {
      case 'queue_backlog':
        const queueHealth = await checkQueueHealth();
        return `Queue backlog is high: ${queueHealth.waiting} jobs waiting (threshold: ${condition.threshold})`;

      case 'error_rate':
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (condition.timeWindow || 60) * 60 * 1000);
        const metrics = await this.metricsCollector.collectMetrics(startTime, endTime);
        const errorRate = metrics.totalNotificationsSent > 0 
          ? ((metrics.totalNotificationsSent - metrics.successfulNotifications) / metrics.totalNotificationsSent) * 100
          : 0;
        return `High error rate: ${errorRate.toFixed(2)}% (threshold: ${condition.threshold}%)`;

      case 'worker_down':
        return 'No active notification workers detected';

      case 'redis_down':
        return 'Redis connection is down';

      case 'metric_threshold':
        return `Metric ${condition.metric} ${condition.operator} ${condition.threshold}`;

      default:
        return `Alert condition met for rule: ${rule.name}`;
    }
  }

  /**
   * Gather alert data
   */
  private async gatherAlertData(rule: AlertRule): Promise<any> {
    const systemHealth = await this.metricsCollector.getSystemHealth();
    const errorStats = this.errorTracker.getErrorStats();
    
    return {
      rule: {
        id: rule.id,
        name: rule.name,
        condition: rule.condition,
      },
      systemHealth,
      errorStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert): Promise<void> {
    // In a real implementation, you would send notifications via:
    // - Webhook
    // - Email
    // - Slack
    // - SMS
    // - Push notifications to admin devices
    
    if (this.config.webhookUrl) {
      try {
        // Example webhook notification
        console.log(`[ALERTING] Would send webhook to: ${this.config.webhookUrl}`, {
          alert: {
            id: alert.id,
            severity: alert.severity,
            message: alert.message,
            timestamp: alert.timestamp,
          },
        });
      } catch (error) {
        console.error('[ALERTING] Failed to send webhook notification:', error);
      }
    }

    if (this.config.emailRecipients && this.config.emailRecipients.length > 0) {
      try {
        // Example email notification
        console.log(`[ALERTING] Would send email to: ${this.config.emailRecipients.join(', ')}`, {
          subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
          message: alert.message,
        });
      } catch (error) {
        console.error('[ALERTING] Failed to send email notification:', error);
      }
    }
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoffTime = new Date(Date.now() - this.config.alertRetentionDays * 24 * 60 * 60 * 1000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffTime);
    
    const removedCount = initialCount - this.alerts.length;
    if (removedCount > 0) {
      console.log(`[ALERTING] Cleaned up ${removedCount} old alerts`);
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'high_queue_backlog',
        name: 'High Queue Backlog',
        description: 'Alert when queue has too many waiting jobs',
        condition: {
          type: 'queue_backlog',
          threshold: 100,
        },
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 15,
      },
      {
        id: 'critical_queue_backlog',
        name: 'Critical Queue Backlog',
        description: 'Alert when queue backlog is critically high',
        condition: {
          type: 'queue_backlog',
          threshold: 500,
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 10,
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when notification error rate is high',
        condition: {
          type: 'error_rate',
          threshold: 15,
          timeWindow: 30,
        },
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 20,
      },
      {
        id: 'critical_error_rate',
        name: 'Critical Error Rate',
        description: 'Alert when notification error rate is critically high',
        condition: {
          type: 'error_rate',
          threshold: 30,
          timeWindow: 15,
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 10,
      },
      {
        id: 'worker_down',
        name: 'Worker Down',
        description: 'Alert when no notification workers are active',
        condition: {
          type: 'worker_down',
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
      },
      {
        id: 'redis_down',
        name: 'Redis Down',
        description: 'Alert when Redis connection is lost',
        condition: {
          type: 'redis_down',
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
      },
      {
        id: 'slow_processing',
        name: 'Slow Processing',
        description: 'Alert when average processing time is too high',
        condition: {
          type: 'metric_threshold',
          metric: 'avg_processing_time',
          operator: 'gt',
          threshold: 30000, // 30 seconds
          timeWindow: 30,
        },
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 30,
      },
    ];

    console.log(`[ALERTING] Initialized ${this.rules.length} default alert rules`);
  }

  /**
   * Get all alerts
   */
  getAlerts(includeResolved: boolean = false): Alert[] {
    return this.alerts.filter(alert => includeResolved || !alert.resolved);
  }

  /**
   * Get alert rules
   */
  getRules(): AlertRule[] {
    return [...this.rules];
  }

  /**
   * Add or update alert rule
   */
  setRule(rule: AlertRule): void {
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
      console.log(`[ALERTING] Updated alert rule: ${rule.id}`);
    } else {
      this.rules.push(rule);
      console.log(`[ALERTING] Added alert rule: ${rule.id}`);
    }
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    
    if (this.rules.length < initialLength) {
      console.log(`[ALERTING] Removed alert rule: ${ruleId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`[ALERTING] Resolved alert: ${alertId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get alerting statistics
   */
  getStats(): {
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    alertsByRule: Record<string, number>;
    alertsBySeverity: Record<string, number>;
  } {
    const totalAlerts = this.alerts.length;
    const activeAlerts = this.alerts.filter(a => !a.resolved).length;
    const resolvedAlerts = this.alerts.filter(a => a.resolved).length;

    const alertsByRule: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};

    for (const alert of this.alerts) {
      alertsByRule[alert.ruleId] = (alertsByRule[alert.ruleId] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    }

    return {
      totalAlerts,
      activeAlerts,
      resolvedAlerts,
      alertsByRule,
      alertsBySeverity,
    };
  }
}