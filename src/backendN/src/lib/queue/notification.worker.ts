import { Worker, Job } from 'bullmq';
import pLimit from 'p-limit';
import { PrismaClient } from '@prisma/client';
import { 
  workerOptions, 
  QUEUE_NAMES, 
  JOB_TYPES, 
  EventUpdateJobData, 
  NewEventJobData,
  NotificationJobData 
} from './index.js';
import { WebPushService, type NotificationPayload } from '../push/web-push.service.js';
import { PushSubscriptionService } from '../push/push-subscription.service.js';
import { UserTargetingService } from '../user-targeting.service.js';
import { NotificationLoggerService } from '../push/notification-logger.service.js';
import { MetricsCollectorService } from '../push/metrics-collector.service.js';
import { ErrorTrackingService } from '../push/error-tracking.service.js';

export interface JobResult {
  sent: number;
  failed: number;
  invalidEndpoints: string[];
  processingTime: number;
  eventId: string;
  jobType: string;
}

/**
 * Worker class for processing push notification jobs
 */
export class NotificationWorker {
  private worker: Worker;
  private webPushService: WebPushService;
  private pushSubscriptionService: PushSubscriptionService;
  private userTargetingService: UserTargetingService;
  private logger: NotificationLoggerService;
  private metricsCollector: MetricsCollectorService;
  private errorTracker: ErrorTrackingService;
  private prisma: PrismaClient;
  private concurrencyLimit: ReturnType<typeof pLimit>;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.pushSubscriptionService = new PushSubscriptionService(prisma);
    this.userTargetingService = new UserTargetingService(prisma);
    this.logger = new NotificationLoggerService(prisma);
    this.metricsCollector = new MetricsCollectorService(prisma);
    this.errorTracker = new ErrorTrackingService(prisma);
    
    // Get concurrency limit from environment or default to 200
    const concurrency = parseInt(process.env.NOTIFICATION_WORKER_CONCURRENCY || '200');
    this.webPushService = new WebPushService(Math.min(concurrency, 50), prisma); // Pass prisma for error tracking
    this.concurrencyLimit = pLimit(concurrency);

    // Create the worker
    this.worker = new Worker(
      QUEUE_NAMES.NOTIFICATIONS,
      this.processJob.bind(this),
      workerOptions
    );

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Process a notification job
   */
  private async processJob(job: Job<NotificationJobData>): Promise<JobResult> {
    const startTime = Date.now();
    const jobId = job.id?.toString() || 'unknown';
    const eventId = job.data.eventId;
    const jobType = job.data.type;
    
    try {
      // Log job start
      await this.logger.logJobStart(
        jobId,
        eventId,
        jobType,
        0, // Will be updated when we know target count
        { jobData: job.data }
      );

      console.log(`Processing job ${jobId}: ${jobType} for event ${eventId}`);
      
      let result: JobResult;
      
      switch (jobType) {
        case JOB_TYPES.EVENT_UPDATE:
          result = await this.processEventUpdateJob(job as Job<EventUpdateJobData>);
          break;
        case JOB_TYPES.NEW_EVENT:
          result = await this.processNewEventJob(job as Job<NewEventJobData>);
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }

      result.processingTime = Date.now() - startTime;
      
      // Log job completion
      await this.logger.logJobCompletion(
        jobId,
        eventId,
        jobType,
        {
          sent: result.sent,
          failed: result.failed,
          invalidEndpoints: result.invalidEndpoints,
          processingTime: result.processingTime,
        }
      );

      // Record performance metrics
      this.metricsCollector.recordJobPerformance({
        jobId,
        eventId,
        jobType,
        processingTime: result.processingTime,
        targetCount: result.sent + result.failed,
        sentCount: result.sent,
        failedCount: result.failed,
        timestamp: new Date(),
      });

      console.log(`Job ${jobId} completed:`, {
        sent: result.sent,
        failed: result.failed,
        invalidEndpoints: result.invalidEndpoints.length,
        processingTime: result.processingTime,
      });

      return result;
    } catch (error) {
      // Log job failure
      await this.logger.logJobFailure(
        jobId,
        eventId,
        jobType,
        error as Error,
        { jobData: job.data }
      );

      console.error(`Job ${jobId} failed:`, error);
      throw error;
    }
  }

  /**
   * Process event update notification job
   */
  private async processEventUpdateJob(job: Job<EventUpdateJobData>): Promise<JobResult> {
    const { eventId, changeType, changes } = job.data;

    // Fetch event details
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: { company: true, firstName: true, lastName: true }
        }
      }
    });

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Get subscriptions for users who have tickets for this event using targeting service
    const subscriptions = await this.userTargetingService.getSubscriptionsForEventTicketHolders(eventId);
    
    if (subscriptions.length === 0) {
      console.log(`No subscriptions found for event ${eventId}`);
      return {
        sent: 0,
        failed: 0,
        invalidEndpoints: [],
        processingTime: 0,
        eventId,
        jobType: JOB_TYPES.EVENT_UPDATE,
      };
    }

    // Generate notification payload
    const payload = this.generateEventUpdatePayload(event, changeType, changes);
    
    // Send notifications with concurrency control
    const result = await this.sendNotificationsWithConcurrency(
      subscriptions, 
      payload, 
      job.id?.toString(), 
      eventId
    );

    // Clean up invalid subscriptions
    if (result.invalidEndpoints.length > 0) {
      await this.cleanupInvalidSubscriptions(result.invalidEndpoints, job.id?.toString());
    }

    return {
      ...result,
      eventId,
      jobType: JOB_TYPES.EVENT_UPDATE,
      processingTime: 0, // Will be set by processJob
    };
  }

  /**
   * Process new event notification job
   */
  private async processNewEventJob(job: Job<NewEventJobData>): Promise<JobResult> {
    const { eventId } = job.data;

    // Fetch event details
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: { company: true, firstName: true, lastName: true }
        }
      }
    });

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Get subscriptions for users who want new event notifications
    const subscriptions = await this.userTargetingService.getSubscriptionsWithNotificationPreference(
      'FOLLOWED_VENUE_UPDATE', // Using existing notification category
      true
    );

    if (subscriptions.length === 0) {
      console.log(`No subscriptions found for new event notifications`);
      return {
        sent: 0,
        failed: 0,
        invalidEndpoints: [],
        processingTime: 0,
        eventId,
        jobType: JOB_TYPES.NEW_EVENT,
      };
    }

    // Generate notification payload
    const payload = this.generateNewEventPayload(event);
    
    // Send notifications with concurrency control
    const result = await this.sendNotificationsWithConcurrency(
      subscriptions, 
      payload, 
      job.id?.toString(), 
      eventId
    );

    // Clean up invalid subscriptions
    if (result.invalidEndpoints.length > 0) {
      await this.cleanupInvalidSubscriptions(result.invalidEndpoints, job.id?.toString());
    }

    return {
      ...result,
      eventId,
      jobType: JOB_TYPES.NEW_EVENT,
      processingTime: 0, // Will be set by processJob
    };
  }

  /**
   * Send notifications to multiple subscriptions with concurrency control
   */
  private async sendNotificationsWithConcurrency(
    subscriptions: any[],
    payload: NotificationPayload,
    jobId?: string,
    eventId?: string
  ): Promise<{ sent: number; failed: number; invalidEndpoints: string[] }> {
    const result = {
      sent: 0,
      failed: 0,
      invalidEndpoints: [] as string[],
    };

    // Convert database subscriptions to push subscription format
    const pushSubscriptions = this.pushSubscriptionService.toPushSubscriptionDataArray(subscriptions);

    // Use bulk send method which includes error tracking
    const bulkResult = await this.webPushService.sendBulkNotifications(
      pushSubscriptions,
      payload,
      {}, // Default options
      jobId,
      eventId
    );

    result.sent = bulkResult.sent;
    result.failed = bulkResult.failed;
    result.invalidEndpoints = bulkResult.invalidEndpoints;

    return result;
  }

  /**
   * Generate notification payload for event updates
   */
  private generateEventUpdatePayload(
    event: any,
    changeType: EventUpdateJobData['changeType'],
    changes: EventUpdateJobData['changes']
  ): NotificationPayload {
    const organizerName = event.organizer.company || 
      `${event.organizer.firstName} ${event.organizer.lastName}`;

    let title: string;
    let body: string;
    let changeDetails: any = undefined;

    switch (changeType) {
      case 'time_change':
        title = `📅 ${event.name} - Time Changed`;
        const timeChange = changes.find(c => c.field === 'startDate' || c.field === 'startTime');
        if (timeChange) {
          const oldDate = new Date(timeChange.oldValue).toLocaleDateString();
          const newDate = new Date(timeChange.newValue).toLocaleDateString();
          body = `Event time has been updated from ${oldDate} to ${newDate}`;
          changeDetails = {
            field: 'time',
            oldValue: timeChange.oldValue,
            newValue: timeChange.newValue,
          };
        } else {
          body = 'Event time has been updated. Check the event details for more information.';
        }
        break;

      case 'venue_change':
        title = `📍 ${event.name} - Venue Changed`;
        const venueChange = changes.find(c => c.field === 'venue' || c.field === 'address');
        if (venueChange) {
          body = `Venue changed from ${venueChange.oldValue} to ${venueChange.newValue}`;
          changeDetails = {
            field: 'venue',
            oldValue: venueChange.oldValue,
            newValue: venueChange.newValue,
          };
        } else {
          body = 'Event venue has been updated. Check the event details for more information.';
        }
        break;

      case 'cancellation':
        title = `❌ ${event.name} - Event Cancelled`;
        body = `Unfortunately, this event has been cancelled by ${organizerName}`;
        changeDetails = {
          field: 'status',
          oldValue: 'ACTIVE',
          newValue: 'CANCELLED',
        };
        break;

      default:
        title = `📢 ${event.name} - Event Updated`;
        body = `Event details have been updated by ${organizerName}`;
    }

    return {
      type: 'event_update',
      eventId: event.id,
      title,
      body,
      url: `/events/${event.slug}`,
      icon: event.banner || '/icons/event-icon.png',
      badge: '/icons/badge.png',
      actions: [
        {
          action: 'view',
          title: 'View Event',
        },
        {
          action: 'close',
          title: 'Dismiss',
        },
      ],
      change: changeDetails,
    };
  }

  /**
   * Generate notification payload for new events
   */
  private generateNewEventPayload(event: any): NotificationPayload {
    const organizerName = event.organizer.company || 
      `${event.organizer.firstName} ${event.organizer.lastName}`;

    const eventDate = new Date(event.startDate).toLocaleDateString();

    return {
      type: 'new_event',
      eventId: event.id,
      title: `🎉 New Event: ${event.name}`,
      body: `${organizerName} has created a new ${event.category.toLowerCase()} event on ${eventDate} in ${event.city}`,
      url: `/events/${event.slug}`,
      icon: event.banner || '/icons/event-icon.png',
      badge: '/icons/badge.png',
      actions: [
        {
          action: 'view',
          title: 'View Event',
        },
        {
          action: 'close',
          title: 'Dismiss',
        },
      ],
    };
  }

  /**
   * Clean up invalid push subscriptions
   */
  private async cleanupInvalidSubscriptions(endpoints: string[], jobId?: string): Promise<void> {
    if (endpoints.length === 0) return;

    try {
      const cleanedCount = await this.pushSubscriptionService.cleanupInvalidSubscriptions(endpoints);
      await this.logger.logSubscriptionCleanup(endpoints, cleanedCount, jobId);
      console.log(`Cleaned up ${cleanedCount} invalid push subscriptions`);
    } catch (error) {
      console.error('Failed to cleanup invalid subscriptions:', error);
    }
  }

  /**
   * Set up worker event listeners
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job, result: JobResult) => {
      console.log(`Job ${job.id} completed successfully:`, {
        eventId: result.eventId,
        jobType: result.jobType,
        sent: result.sent,
        failed: result.failed,
        processingTime: result.processingTime,
      });
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, {
        eventId: job?.data?.eventId,
        jobType: job?.data?.type,
        error: err.message,
        stack: err.stack,
      });
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`Job ${jobId} stalled`);
    });
  }

  /**
   * Get worker statistics
   */
  async getStats() {
    return {
      isRunning: this.worker.isRunning(),
      concurrency: workerOptions.concurrency,
    };
  }

  /**
   * Get comprehensive worker health and metrics
   */
  async getHealthMetrics() {
    const systemHealth = await this.metricsCollector.getSystemHealth();
    const errorStats = this.errorTracker.getErrorStats();
    const recentAlerts = this.errorTracker.getRecentAlerts(5);
    
    return {
      systemHealth,
      errorStats,
      recentAlerts,
      worker: {
        isRunning: this.worker.isRunning(),
        concurrency: workerOptions.concurrency,
      },
    };
  }

  /**
   * Perform maintenance tasks
   */
  async performMaintenance(): Promise<{
    cleanupResult: any;
    metricsCleared: number;
    alertsCleared: boolean;
  }> {
    // Perform batch cleanup
    const cleanupResult = await this.errorTracker.performBatchCleanup();
    
    // Clear old metrics data
    const metricsCleared = this.metricsCollector.clearOldData(24); // Clear data older than 24 hours
    
    // Clear old alerts
    this.errorTracker.clearAlerts();
    
    console.log('[MAINTENANCE] Completed maintenance tasks:', {
      cleanupResult,
      metricsCleared,
      timestamp: new Date().toISOString(),
    });

    return {
      cleanupResult,
      metricsCleared,
      alertsCleared: true,
    };
  }

  /**
   * Gracefully close the worker
   */
  async close(): Promise<void> {
    console.log('Closing notification worker...');
    await this.worker.close();
    console.log('Notification worker closed');
  }
}

// Export singleton instance
let notificationWorker: NotificationWorker | null = null;

export function createNotificationWorker(prisma: PrismaClient): NotificationWorker {
  if (!notificationWorker) {
    notificationWorker = new NotificationWorker(prisma);
  }
  return notificationWorker;
}

export function getNotificationWorker(): NotificationWorker | null {
  return notificationWorker;
}