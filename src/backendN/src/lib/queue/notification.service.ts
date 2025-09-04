import { Job } from 'bullmq';
import { 
  notificationQueue, 
  NotificationJobData, 
  EventUpdateJobData, 
  NewEventJobData,
  JOB_TYPES,
  EventUpdateJobDataSchema,
  NewEventJobDataSchema
} from './index.js';

export class NotificationService {
  /**
   * Queue an event update notification job
   */
  async queueEventUpdateNotification(data: Omit<EventUpdateJobData, 'type'>): Promise<Job> {
    const jobData: EventUpdateJobData = {
      type: JOB_TYPES.EVENT_UPDATE,
      ...data,
    };

    // Validate job data
    const validatedData = EventUpdateJobDataSchema.parse(jobData);

    // Add job to queue with priority based on change type
    const priority = this.getJobPriority(validatedData.changeType);
    
    return await notificationQueue.add(
      JOB_TYPES.EVENT_UPDATE,
      validatedData,
      {
        priority,
        // Use event ID as job ID to prevent duplicate jobs for same event
        jobId: `event_update_${validatedData.eventId}_${Date.now()}`,
        // Set TTL for job relevance (24 hours)
        ttl: 24 * 60 * 60 * 1000,
      }
    );
  }

  /**
   * Queue a new event notification job
   */
  async queueNewEventNotification(data: Omit<NewEventJobData, 'type'>): Promise<Job> {
    const jobData: NewEventJobData = {
      type: JOB_TYPES.NEW_EVENT,
      ...data,
    };

    // Validate job data
    const validatedData = NewEventJobDataSchema.parse(jobData);

    return await notificationQueue.add(
      JOB_TYPES.NEW_EVENT,
      validatedData,
      {
        priority: 5, // Medium priority for new events
        jobId: `new_event_${validatedData.eventId}`,
        // Set TTL for job relevance (48 hours for new events)
        ttl: 48 * 60 * 60 * 1000,
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
    return await notificationQueue.getJob(jobId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
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
    const waiting = await notificationQueue.getWaiting();
    const active = await notificationQueue.getActive();
    const completed = await notificationQueue.getCompleted();
    const failed = await notificationQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(limit: number = 10): Promise<number> {
    const failedJobs = await notificationQueue.getFailed(0, limit - 1);
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
    await notificationQueue.clean(olderThan, 100, 'completed');
    await notificationQueue.clean(olderThan, 50, 'failed');
  }

  /**
   * Pause the queue
   */
  async pauseQueue(): Promise<void> {
    await notificationQueue.pause();
  }

  /**
   * Resume the queue
   */
  async resumeQueue(): Promise<void> {
    await notificationQueue.resume();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();