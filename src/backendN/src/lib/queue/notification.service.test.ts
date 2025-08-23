import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Job } from 'bullmq';
import { NotificationService } from './notification.service.js';
import { 
  notificationQueue, 
  JOB_TYPES,
  type EventUpdateJobData,
  type NewEventJobData
} from './index.js';

// Mock the queue
vi.mock('./index.js', () => ({
  notificationQueue: {
    add: vi.fn(),
    getJob: vi.fn(),
    getWaiting: vi.fn(),
    getActive: vi.fn(),
    getCompleted: vi.fn(),
    getFailed: vi.fn(),
    clean: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  },
  JOB_TYPES: {
    EVENT_UPDATE: 'event_update',
    NEW_EVENT: 'new_event',
  },
  EventUpdateJobDataSchema: {
    parse: vi.fn((data) => data),
  },
  NewEventJobDataSchema: {
    parse: vi.fn((data) => data),
  },
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let mockJob: Partial<Job>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationService();
    
    mockJob = {
      id: 'test-job-id',
      data: {},
      remove: vi.fn(),
      retry: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queueEventUpdateNotification', () => {
    it('should queue event update notification with correct data', async () => {
      const jobData = {
        eventId: 'event-123',
        changeType: 'time_change' as const,
        changes: [{
          field: 'startDate',
          oldValue: '2024-01-01T10:00:00Z',
          newValue: '2024-01-01T11:00:00Z',
        }],
        timestamp: new Date(),
      };

      const mockQueuedJob = { ...mockJob, data: { type: JOB_TYPES.EVENT_UPDATE, ...jobData } };
      vi.mocked(notificationQueue.add).mockResolvedValue(mockQueuedJob as Job);

      const result = await service.queueEventUpdateNotification(jobData);

      expect(notificationQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.EVENT_UPDATE,
        { type: JOB_TYPES.EVENT_UPDATE, ...jobData },
        {
          priority: 2, // High priority for time changes
          jobId: expect.stringMatching(/^event_update_event-123_\d+$/),
          ttl: 24 * 60 * 60 * 1000,
        }
      );

      expect(result).toEqual(mockQueuedJob);
    });

    it('should set highest priority for cancellation notifications', async () => {
      const jobData = {
        eventId: 'event-123',
        changeType: 'cancellation' as const,
        changes: [{
          field: 'status',
          oldValue: 'ACTIVE',
          newValue: 'CANCELLED',
        }],
        timestamp: new Date(),
      };

      vi.mocked(notificationQueue.add).mockResolvedValue(mockJob as Job);

      await service.queueEventUpdateNotification(jobData);

      expect(notificationQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.EVENT_UPDATE,
        expect.any(Object),
        expect.objectContaining({
          priority: 1, // Highest priority for cancellations
        })
      );
    });

    it('should set medium priority for venue changes', async () => {
      const jobData = {
        eventId: 'event-123',
        changeType: 'venue_change' as const,
        changes: [{
          field: 'venue',
          oldValue: 'Old Venue',
          newValue: 'New Venue',
        }],
        timestamp: new Date(),
      };

      vi.mocked(notificationQueue.add).mockResolvedValue(mockJob as Job);

      await service.queueEventUpdateNotification(jobData);

      expect(notificationQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.EVENT_UPDATE,
        expect.any(Object),
        expect.objectContaining({
          priority: 3, // Medium priority for venue changes
        })
      );
    });

    it('should set default priority for other changes', async () => {
      const jobData = {
        eventId: 'event-123',
        changeType: 'other' as any,
        changes: [{
          field: 'description',
          oldValue: 'Old description',
          newValue: 'New description',
        }],
        timestamp: new Date(),
      };

      vi.mocked(notificationQueue.add).mockResolvedValue(mockJob as Job);

      await service.queueEventUpdateNotification(jobData);

      expect(notificationQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.EVENT_UPDATE,
        expect.any(Object),
        expect.objectContaining({
          priority: 5, // Default priority
        })
      );
    });
  });

  describe('queueNewEventNotification', () => {
    it('should queue new event notification with correct data', async () => {
      const jobData = {
        eventId: 'event-456',
        timestamp: new Date(),
      };

      const mockQueuedJob = { ...mockJob, data: { type: JOB_TYPES.NEW_EVENT, ...jobData } };
      vi.mocked(notificationQueue.add).mockResolvedValue(mockQueuedJob as Job);

      const result = await service.queueNewEventNotification(jobData);

      expect(notificationQueue.add).toHaveBeenCalledWith(
        JOB_TYPES.NEW_EVENT,
        { type: JOB_TYPES.NEW_EVENT, ...jobData },
        {
          priority: 5, // Medium priority for new events
          jobId: 'new_event_event-456',
          ttl: 48 * 60 * 60 * 1000, // 48 hours for new events
        }
      );

      expect(result).toEqual(mockQueuedJob);
    });
  });

  describe('getJob', () => {
    it('should retrieve job by ID', async () => {
      vi.mocked(notificationQueue.getJob).mockResolvedValue(mockJob as Job);

      const result = await service.getJob('test-job-id');

      expect(notificationQueue.getJob).toHaveBeenCalledWith('test-job-id');
      expect(result).toEqual(mockJob);
    });

    it('should return undefined if job not found', async () => {
      vi.mocked(notificationQueue.getJob).mockResolvedValue(undefined);

      const result = await service.getJob('non-existent-job');

      expect(result).toBeUndefined();
    });
  });

  describe('cancelJob', () => {
    it('should cancel existing job', async () => {
      vi.mocked(notificationQueue.getJob).mockResolvedValue(mockJob as Job);
      vi.mocked(mockJob.remove!).mockResolvedValue();

      const result = await service.cancelJob('test-job-id');

      expect(notificationQueue.getJob).toHaveBeenCalledWith('test-job-id');
      expect(mockJob.remove).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if job not found', async () => {
      vi.mocked(notificationQueue.getJob).mockResolvedValue(undefined);

      const result = await service.cancelJob('non-existent-job');

      expect(result).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockWaiting = [{ id: '1' }, { id: '2' }];
      const mockActive = [{ id: '3' }];
      const mockCompleted = [{ id: '4' }, { id: '5' }, { id: '6' }];
      const mockFailed = [{ id: '7' }];

      vi.mocked(notificationQueue.getWaiting).mockResolvedValue(mockWaiting as Job[]);
      vi.mocked(notificationQueue.getActive).mockResolvedValue(mockActive as Job[]);
      vi.mocked(notificationQueue.getCompleted).mockResolvedValue(mockCompleted as Job[]);
      vi.mocked(notificationQueue.getFailed).mockResolvedValue(mockFailed as Job[]);

      const result = await service.getQueueStats();

      expect(result).toEqual({
        waiting: 2,
        active: 1,
        completed: 3,
        failed: 1,
        total: 7,
      });
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry failed jobs successfully', async () => {
      const failedJobs = [
        { ...mockJob, id: 'failed-1', retry: vi.fn().mockResolvedValue(undefined) },
        { ...mockJob, id: 'failed-2', retry: vi.fn().mockResolvedValue(undefined) },
      ];

      vi.mocked(notificationQueue.getFailed).mockResolvedValue(failedJobs as Job[]);

      const result = await service.retryFailedJobs(10);

      expect(notificationQueue.getFailed).toHaveBeenCalledWith(0, 9);
      expect(failedJobs[0].retry).toHaveBeenCalled();
      expect(failedJobs[1].retry).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should handle retry failures gracefully', async () => {
      const failedJobs = [
        { ...mockJob, id: 'failed-1', retry: vi.fn().mockResolvedValue(undefined) },
        { ...mockJob, id: 'failed-2', retry: vi.fn().mockRejectedValue(new Error('Retry failed')) },
      ];

      vi.mocked(notificationQueue.getFailed).mockResolvedValue(failedJobs as Job[]);

      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.retryFailedJobs(10);

      expect(result).toBe(1); // Only one job successfully retried
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to retry job failed-2:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should respect the limit parameter', async () => {
      const failedJobs = Array.from({ length: 5 }, (_, i) => ({
        ...mockJob,
        id: `failed-${i}`,
        retry: vi.fn().mockResolvedValue(undefined),
      }));

      vi.mocked(notificationQueue.getFailed).mockResolvedValue(failedJobs as Job[]);

      await service.retryFailedJobs(3);

      expect(notificationQueue.getFailed).toHaveBeenCalledWith(0, 2); // limit - 1
    });
  });

  describe('cleanOldJobs', () => {
    it('should clean old completed and failed jobs', async () => {
      vi.mocked(notificationQueue.clean).mockResolvedValue([]);

      await service.cleanOldJobs(12 * 60 * 60 * 1000); // 12 hours

      expect(notificationQueue.clean).toHaveBeenCalledWith(12 * 60 * 60 * 1000, 100, 'completed');
      expect(notificationQueue.clean).toHaveBeenCalledWith(12 * 60 * 60 * 1000, 50, 'failed');
    });

    it('should use default time if not provided', async () => {
      vi.mocked(notificationQueue.clean).mockResolvedValue([]);

      await service.cleanOldJobs();

      expect(notificationQueue.clean).toHaveBeenCalledWith(24 * 60 * 60 * 1000, 100, 'completed');
      expect(notificationQueue.clean).toHaveBeenCalledWith(24 * 60 * 60 * 1000, 50, 'failed');
    });
  });

  describe('pauseQueue', () => {
    it('should pause the queue', async () => {
      vi.mocked(notificationQueue.pause).mockResolvedValue();

      await service.pauseQueue();

      expect(notificationQueue.pause).toHaveBeenCalled();
    });
  });

  describe('resumeQueue', () => {
    it('should resume the queue', async () => {
      vi.mocked(notificationQueue.resume).mockResolvedValue();

      await service.resumeQueue();

      expect(notificationQueue.resume).toHaveBeenCalled();
    });
  });
});