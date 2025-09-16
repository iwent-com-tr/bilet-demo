import { Job } from 'bullmq';
import { 
  getNotificationQueue,
  initializeQueue,
  NotificationJobData, 
  EventUpdateJobData, 
  NewEventJobData,
  JOB_TYPES,
  EventUpdateJobDataSchema,
  NewEventJobDataSchema
} from './index.js';

export class NotificationService {
  private queue: any = null;
  
  constructor() {
    this.initializeQueue();
  }
  
  private async initializeQueue() {
    this.queue = await initializeQueue();
  }
  
  private async ensureQueue() {
    if (!this.queue) {
      this.queue = await initializeQueue();
    }
    return this.queue;
  }
  /**
   * Queue an event update notification job
   */
  async queueEventUpdateNotification(data: Omit<EventUpdateJobData, 'type'>): Promise<Job | null> {
    const queue = await this.ensureQueue();
    
    if (!queue) {
      console.warn('⚠️  Queue unavailable - event update notification will be skipped');
      console.warn('⚠️  Consider implementing direct notification fallback');
      return null;
    }
    
    const jobData: EventUpdateJobData = {
      type: JOB_TYPES.EVENT_UPDATE,
      ...data,
    };

    // Validate job data
    const validatedData = EventUpdateJobDataSchema.parse(jobData);

    // Add job to queue with priority based on change type
    const priority = this.getJobPriority(validatedData.changeType);
    
    return await queue.add(
      JOB_TYPES.EVENT_UPDATE,
      validatedData,
      {
        priority,
        // Use event ID as job ID to prevent duplicate jobs for same event
        jobId: `event_update_${validatedData.eventId}_${Date.now()}`,
        // Set delay for immediate processing
        delay: 0,
      }
    );
  }

  /**
   * Queue a new event notification job
   */
  async queueNewEventNotification(data: Omit<NewEventJobData, 'type'>): Promise<Job | null> {
    const queue = await this.ensureQueue();
    
    if (!queue) {
      console.warn('⚠️  Queue unavailable - new event notification will be skipped');
      console.warn('⚠️  Consider implementing direct notification fallback');
      return null;
    }
    
    const jobData: NewEventJobData = {
      type: JOB_TYPES.NEW_EVENT,
      ...data,
    };

    // Validate job data
    const validatedData = NewEventJobDataSchema.parse(jobData);

    return await queue.add(
      JOB_TYPES.NEW_EVENT,
      validatedData,
      {
        priority: 5, // Medium priority for new events
        jobId: `new_event_${validatedData.eventId}`,
        // Set delay for immediate processing
        delay: 0,
      }
    );
  }

  /**
   * Get job priority based on change type
   */
  private getJobPriority(changeType: EventUpdateJobData['changeType']): number {
    switch (changeType) {
      case 'cancellation':
        return 1; // Highest priority
      case 'time_change':
        return 2; // High priority
      case 'venue_change':
        return 3; // Medium priority
      default:
        return 5; // Default priority
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | undefined> {
    const queue = await this.ensureQueue();
    if (!queue) return undefined;
    
    return await queue.getJob(jobId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const queue = await this.ensureQueue();
    if (!queue) return false;
    
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const queue = await this.ensureQueue();
    
    if (!queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
        available: false
      };
    }
    
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
      available: true
    };
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(limit: number = 10): Promise<number> {
    const queue = await this.ensureQueue();
    
    if (!queue) {
      console.warn('⚠️  Queue unavailable - cannot retry failed jobs');
      return 0;
    }
    
    const failedJobs = await queue.getFailed(0, limit - 1);
    let retriedCount = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedCount++;
      } catch (error) {
        console.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    return retriedCount;
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(olderThan: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queue = await this.ensureQueue();
    
    if (!queue) {
      console.warn('⚠️  Queue unavailable - cannot clean old jobs');
      return;
    }
    
    await queue.clean(olderThan, 100, 'completed');
    await queue.clean(olderThan, 50, 'failed');
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    const queue = await this.ensureQueue();
    
    if (!queue) {
      console.warn('⚠️  Queue unavailable - cannot pause queue');
      return;
    }
    
    await queue.pause();
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    const queue = await this.ensureQueue();
    
    if (!queue) {
      console.warn('⚠️  Queue unavailable - cannot resume queue');
      return;
    }
    
    await queue.resume();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();