import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// Create Redis connection
export const redis = new IORedis(redisConfig);

// Queue names
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
} as const;

// Job types
export const JOB_TYPES = {
  EVENT_UPDATE: 'event_update',
  NEW_EVENT: 'new_event',
} as const;

// Zod schemas for job data validation
export const EventUpdateJobDataSchema = z.object({
  type: z.literal(JOB_TYPES.EVENT_UPDATE),
  eventId: z.string().uuid(),
  changeType: z.enum(['time_change', 'venue_change', 'cancellation']),
  changes: z.array(z.object({
    field: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
  })),
  timestamp: z.date().default(() => new Date()),
});

export const NewEventJobDataSchema = z.object({
  type: z.literal(JOB_TYPES.NEW_EVENT),
  eventId: z.string().uuid(),
  timestamp: z.date().default(() => new Date()),
});

export const NotificationJobDataSchema = z.union([
  EventUpdateJobDataSchema,
  NewEventJobDataSchema,
]);

// TypeScript types
export type EventUpdateJobData = z.infer<typeof EventUpdateJobDataSchema>;
export type NewEventJobData = z.infer<typeof NewEventJobDataSchema>;
export type NotificationJobData = z.infer<typeof NotificationJobDataSchema>;

// Queue configuration with retry logic and exponential backoff
const queueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 5, // Maximum retry attempts
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
  },
};

// Worker configuration
const workerOptions: WorkerOptions = {
  connection: redis,
  concurrency: parseInt(process.env.NOTIFICATION_WORKER_CONCURRENCY || '5'),
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

// Create notification queue
export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, queueOptions);

// Queue health check
export async function checkQueueHealth(): Promise<{
  redis: boolean;
  queue: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  try {
    // Check Redis connection
    const redisStatus = redis.status === 'ready';
    
    // Check queue status
    const waiting = await notificationQueue.getWaiting();
    const active = await notificationQueue.getActive();
    const completed = await notificationQueue.getCompleted();
    const failed = await notificationQueue.getFailed();

    return {
      redis: redisStatus,
      queue: true,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  } catch (error) {
    console.error('Queue health check failed:', error);
    return {
      redis: false,
      queue: false,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };
  }
}

// Queue monitoring utilities
export async function getQueueStats() {
  const stats = await checkQueueHealth();
  const isPaused = await notificationQueue.isPaused();
  
  return {
    ...stats,
    paused: isPaused,
    name: QUEUE_NAMES.NOTIFICATIONS,
  };
}

// Graceful shutdown
export async function closeQueue() {
  try {
    await notificationQueue.close();
    await redis.quit();
    console.log('Queue and Redis connections closed gracefully');
  } catch (error) {
    console.error('Error closing queue connections:', error);
  }
}

// Export worker options for use in worker implementation
export { workerOptions };