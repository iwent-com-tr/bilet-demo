import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
};

// Create Redis connection with error handling
export const redis = new IORedis(redisConfig);

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connection established');
});

redis.on('ready', () => {
  console.log('🚀 Redis ready for operations');
});

redis.on('error', (error) => {
  console.warn('⚠️  Redis connection error:', error.message);
});

redis.on('close', () => {
  console.log('📴 Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

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

// Create notification queue only if Redis is available
let notificationQueue: Queue | null = null;

// Initialize queue with Redis availability check
export async function initializeQueue(): Promise<Queue | null> {
  try {
    await redis.ping();
    
    if (!notificationQueue) {
      notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, queueOptions);
      console.log('✅ Notification queue initialized');
    }
    
    return notificationQueue;
  } catch (error) {
    console.warn('⚠️  Queue initialization failed - Redis unavailable:', error instanceof Error ? error.message : 'Unknown error');
    console.warn('⚠️  Background job processing will be disabled');
    return null;
  }
}

// Export queue getter that handles null case
export function getNotificationQueue(): Queue | null {
  return notificationQueue;
}

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
    
    if (!redisStatus || !notificationQueue) {
      return {
        redis: redisStatus,
        queue: false,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }
    
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
  
  if (!notificationQueue) {
    return {
      ...stats,
      paused: false,
      name: QUEUE_NAMES.NOTIFICATIONS,
    };
  }
  
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
    if (notificationQueue) {
      await notificationQueue.close();
      console.log('Queue closed gracefully');
    }
    
    if (redis.status !== 'end') {
      await redis.quit();
      console.log('Redis connection closed gracefully');
    }
  } catch (error) {
    console.error('Error closing queue connections:', error);
  }
}

// Export worker options for use in worker implementation
export { workerOptions };