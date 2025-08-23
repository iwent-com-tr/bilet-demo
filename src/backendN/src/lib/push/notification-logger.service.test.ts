import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { 
  NotificationLoggerService,
  type NotificationLogEntry,
  type NotificationError 
} from './notification-logger.service.js';

// Mock Prisma Client
const mockPrisma = {} as PrismaClient;

describe('NotificationLoggerService', () => {
  let service: NotificationLoggerService;
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    service = new NotificationLoggerService(mockPrisma);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('logJobStart', () => {
    it('should log job start with correct information', async () => {
      const jobId = 'job-123';
      const eventId = 'event-456';
      const jobType = 'event_update';
      const targetCount = 100;
      const metadata = { changeType: 'time_change' };

      await service.logJobStart(jobId, eventId, jobType, targetCount, metadata);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NOTIFICATION-START] Job job-123:',
        expect.objectContaining({
          eventId: 'event-456',
          jobType: 'event_update',
          targetCount: 100,
          timestamp: expect.any(String),
          metadata: { changeType: 'time_change' },
        })
      );
    });

    it('should log job start without metadata', async () => {
      await service.logJobStart('job-123', 'event-456', 'new_event', 50);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NOTIFICATION-START] Job job-123:',
        expect.objectContaining({
          eventId: 'event-456',
          jobType: 'new_event',
          targetCount: 50,
          timestamp: expect.any(String),
          metadata: undefined,
        })
      );
    });

    it('should handle database storage errors gracefully', async () => {
      // Mock storeLogEntry to throw an error
      const originalStoreLogEntry = service['storeLogEntry'];
      service['storeLogEntry'] = vi.fn().mockRejectedValue(new Error('Database error'));

      await service.logJobStart('job-123', 'event-456', 'event_update', 100);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to store notification log entry:',
        expect.any(Error)
      );

      // Restore original method
      service['storeLogEntry'] = originalStoreLogEntry;
    });
  });

  describe('logJobCompletion', () => {
    it('should log successful job completion', async () => {
      const jobId = 'job-123';
      const eventId = 'event-456';
      const jobType = 'event_update';
      const result = {
        sent: 95,
        failed: 5,
        invalidEndpoints: ['endpoint1', 'endpoint2'],
        processingTime: 1500,
      };

      await service.logJobCompletion(jobId, eventId, jobType, result);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NOTIFICATION-COMPLETE] Job job-123:',
        expect.objectContaining({
          eventId: 'event-456',
          jobType: 'event_update',
          sent: 95,
          failed: 5,
          successRate: '95.00%',
          processingTime: '1500ms',
          invalidEndpoints: 2,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log job completion with errors', async () => {
      const result = {
        sent: 80,
        failed: 20,
        invalidEndpoints: ['endpoint1'],
        errors: [
          {
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
            error: 'Not found',
            statusCode: 404,
          },
          {
            endpoint: 'https://fcm.googleapis.com/fcm/send/another-endpoint',
            error: 'Gone',
            statusCode: 410,
          },
        ],
        processingTime: 2000,
      };

      await service.logJobCompletion('job-123', 'event-456', 'event_update', result);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NOTIFICATION-COMPLETE] Job job-123:',
        expect.objectContaining({
          sent: 80,
          failed: 20,
          successRate: '80.00%',
        })
      );

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[NOTIFICATION-ERRORS] Job job-123:',
        expect.objectContaining({
          errorCount: 2,
          errors: expect.arrayContaining([
            expect.objectContaining({
              endpoint: 'https://fcm.googleapis.com/fcm/send/***',
              error: 'Not found',
              statusCode: 404,
            }),
            expect.objectContaining({
              endpoint: 'https://fcm.googleapis.com/fcm/send/***',
              error: 'Gone',
              statusCode: 410,
            }),
          ]),
        })
      );
    });

    it('should calculate success rate correctly for zero targets', async () => {
      const result = {
        sent: 0,
        failed: 0,
        invalidEndpoints: [],
        processingTime: 100,
      };

      await service.logJobCompletion('job-123', 'event-456', 'event_update', result);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NOTIFICATION-COMPLETE] Job job-123:',
        expect.objectContaining({
          successRate: '0%',
        })
      );
    });

    it('should include metadata in completion log', async () => {
      const result = {
        sent: 50,
        failed: 0,
        invalidEndpoints: [],
        processingTime: 800,
      };
      const metadata = { retryCount: 1 };

      await service.logJobCompletion('job-123', 'event-456', 'new_event', result, metadata);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NOTIFICATION-COMPLETE] Job job-123:',
        expect.objectContaining({
          metadata: { retryCount: 1 },
        })
      );
    });
  });

  describe('logJobFailure', () => {
    it('should log job failure with error details', async () => {
      const error = new Error('Job processing failed');
      error.stack = 'Error: Job processing failed\n    at test.js:1:1';
      const metadata = { attemptNumber: 3 };

      await service.logJobFailure('job-123', 'event-456', 'event_update', error, metadata);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[NOTIFICATION-FAILED] Job job-123:',
        expect.objectContaining({
          eventId: 'event-456',
          jobType: 'event_update',
          error: 'Job processing failed',
          stack: 'Error: Job processing failed\n    at test.js:1:1',
          timestamp: expect.any(String),
          metadata: { attemptNumber: 3 },
        })
      );
    });

    it('should log job failure without metadata', async () => {
      const error = new Error('Simple failure');

      await service.logJobFailure('job-123', 'event-456', 'new_event', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[NOTIFICATION-FAILED] Job job-123:',
        expect.objectContaining({
          error: 'Simple failure',
          metadata: undefined,
        })
      );
    });

    it('should handle database storage errors during failure logging', async () => {
      const error = new Error('Job failed');
      const originalStoreLogEntry = service['storeLogEntry'];
      service['storeLogEntry'] = vi.fn().mockRejectedValue(new Error('DB error'));

      await service.logJobFailure('job-123', 'event-456', 'event_update', error);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to store notification log entry:',
        expect.any(Error)
      );

      service['storeLogEntry'] = originalStoreLogEntry;
    });
  });

  describe('logSubscriptionCleanup', () => {
    it('should log subscription cleanup with job ID', async () => {
      const endpoints = [
        'https://fcm.googleapis.com/fcm/send/endpoint1',
        'https://fcm.googleapis.com/fcm/send/endpoint2',
        'https://fcm.googleapis.com/fcm/send/endpoint3',
      ];
      const cleanedCount = 2;
      const jobId = 'job-123';

      await service.logSubscriptionCleanup(endpoints, cleanedCount, jobId);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[SUBSCRIPTION-CLEANUP] Job job-123:',
        expect.objectContaining({
          endpointsToClean: 3,
          actuallyCleanedUp: 2,
          timestamp: expect.any(String),
          endpoints: [
            'https://fcm.googleapis.com/fcm/send/***',
            'https://fcm.googleapis.com/fcm/send/***',
            'https://fcm.googleapis.com/fcm/send/***',
          ],
        })
      );
    });

    it('should log subscription cleanup without job ID', async () => {
      const endpoints = ['https://example.com/endpoint'];
      const cleanedCount = 1;

      await service.logSubscriptionCleanup(endpoints, cleanedCount);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[SUBSCRIPTION-CLEANUP]',
        expect.objectContaining({
          endpointsToClean: 1,
          actuallyCleanedUp: 1,
          endpoints: ['https://example.com/***'],
        })
      );
    });

    it('should handle empty endpoints array', async () => {
      await service.logSubscriptionCleanup([], 0);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[SUBSCRIPTION-CLEANUP]',
        expect.objectContaining({
          endpointsToClean: 0,
          actuallyCleanedUp: 0,
          endpoints: [],
        })
      );
    });

    it('should handle cleanup metrics storage errors', async () => {
      const originalStoreCleanupMetrics = service['storeCleanupMetrics'];
      service['storeCleanupMetrics'] = vi.fn().mockRejectedValue(new Error('Storage error'));

      await service.logSubscriptionCleanup(['endpoint'], 1);

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to store cleanup metrics:',
        expect.any(Error)
      );

      service['storeCleanupMetrics'] = originalStoreCleanupMetrics;
    });
  });

  describe('getMetrics', () => {
    it('should return basic metrics when database fails', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');

      // Mock database methods to fail
      service['getMetricsFromDatabase'] = vi.fn().mockRejectedValue(new Error('DB error'));

      const metrics = await service.getMetrics(startDate, endDate);

      expect(metrics).toEqual({
        totalNotifications: 0,
        successfulNotifications: 0,
        failedNotifications: 0,
        successRate: 0,
        averageProcessingTime: 0,
        invalidEndpointsCleanedUp: 0,
        errorsByType: {},
        errorsByStatusCode: {},
      });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to get metrics from database, using in-memory fallback:',
        expect.any(Error)
      );
    });

    it('should return database metrics when available', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');
      const mockMetrics = {
        totalNotifications: 100,
        successfulNotifications: 95,
        failedNotifications: 5,
        successRate: 95,
        averageProcessingTime: 1500,
        invalidEndpointsCleanedUp: 2,
        errorsByType: { 'invalid_endpoint': 2 },
        errorsByStatusCode: { 404: 2 },
      };

      service['getMetricsFromDatabase'] = vi.fn().mockResolvedValue(mockMetrics);

      const metrics = await service.getMetrics(startDate, endDate);

      expect(metrics).toEqual(mockMetrics);
      expect(service['getMetricsFromDatabase']).toHaveBeenCalledWith(startDate, endDate);
    });

    it('should use current date as default end date', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      service['getMetricsFromDatabase'] = vi.fn().mockResolvedValue(null);

      await service.getMetrics(startDate);

      expect(service['getMetricsFromDatabase']).toHaveBeenCalledWith(
        startDate,
        expect.any(Date)
      );
    });
  });

  describe('getRecentErrors', () => {
    it('should return empty array when database fails', async () => {
      service['getErrorsFromDatabase'] = vi.fn().mockRejectedValue(new Error('DB error'));

      const errors = await service.getRecentErrors(10);

      expect(errors).toEqual([]);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to get errors from database:',
        expect.any(Error)
      );
    });

    it('should return database errors when available', async () => {
      const mockErrors: NotificationError[] = [
        {
          endpoint: 'https://example.com/endpoint1',
          error: 'Not found',
          statusCode: 404,
          timestamp: new Date(),
        },
        {
          endpoint: 'https://example.com/endpoint2',
          error: 'Gone',
          statusCode: 410,
          timestamp: new Date(),
        },
      ];

      service['getErrorsFromDatabase'] = vi.fn().mockResolvedValue(mockErrors);

      const errors = await service.getRecentErrors(10);

      expect(errors).toEqual(mockErrors);
      expect(service['getErrorsFromDatabase']).toHaveBeenCalledWith(10);
    });

    it('should use default limit of 50', async () => {
      service['getErrorsFromDatabase'] = vi.fn().mockResolvedValue([]);

      await service.getRecentErrors();

      expect(service['getErrorsFromDatabase']).toHaveBeenCalledWith(50);
    });
  });

  describe('logHealthMetrics', () => {
    it('should log health metrics with correct format', async () => {
      const metrics = {
        queueHealth: {
          redis: true,
          waiting: 5,
          active: 2,
          failed: 1,
        },
        workerStats: {
          isRunning: true,
          concurrency: 10,
        },
        subscriptionCount: 1000,
      };

      await service.logHealthMetrics(metrics);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[NOTIFICATION-HEALTH]',
        expect.objectContaining({
          timestamp: expect.any(String),
          queue: {
            redis: true,
            waiting: 5,
            active: 2,
            failed: 1,
          },
          worker: {
            isRunning: true,
            concurrency: 10,
          },
          subscriptions: {
            total: 1000,
          },
        })
      );
    });
  });

  describe('endpoint masking', () => {
    it('should mask valid URLs correctly', () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/very-long-endpoint-id';
      const masked = service['maskEndpoint'](endpoint);
      
      expect(masked).toBe('https://fcm.googleapis.com/fcm/send/***');
    });

    it('should mask URLs with multiple path segments', () => {
      const endpoint = 'https://example.com/path/to/endpoint/12345';
      const masked = service['maskEndpoint'](endpoint);
      
      expect(masked).toBe('https://example.com/path/to/endpoint/***');
    });

    it('should handle URLs with short paths', () => {
      const endpoint = 'https://example.com/endpoint';
      const masked = service['maskEndpoint'](endpoint);
      
      expect(masked).toBe('https://example.com/***');
    });

    it('should handle invalid URLs by truncating', () => {
      const endpoint = 'invalid-url-that-is-very-long-and-should-be-truncated';
      const masked = service['maskEndpoint'](endpoint);
      
      expect(masked).toBe('invalid-url-that-is-v***');
    });

    it('should handle short invalid URLs without truncation', () => {
      const endpoint = 'short-url';
      const masked = service['maskEndpoint'](endpoint);
      
      expect(masked).toBe('short-url');
    });

    it('should handle URLs with query parameters', () => {
      const endpoint = 'https://example.com/fcm/send/endpoint123?param=value';
      const masked = service['maskEndpoint'](endpoint);
      
      expect(masked).toBe('https://example.com/fcm/send/***');
    });

    it('should handle URLs with fragments', () => {
      const endpoint = 'https://example.com/fcm/send/endpoint123#fragment';
      const masked = service['maskEndpoint'](endpoint);
      
      expect(masked).toBe('https://example.com/fcm/send/***');
    });
  });

  describe('private methods', () => {
    it('should return basic metrics from getBasicMetrics', () => {
      const metrics = service['getBasicMetrics']();
      
      expect(metrics).toEqual({
        totalNotifications: 0,
        successfulNotifications: 0,
        failedNotifications: 0,
        successRate: 0,
        averageProcessingTime: 0,
        invalidEndpointsCleanedUp: 0,
        errorsByType: {},
        errorsByStatusCode: {},
      });
    });

    it('should return null from getMetricsFromDatabase', async () => {
      const startDate = new Date();
      const endDate = new Date();
      
      const result = await service['getMetricsFromDatabase'](startDate, endDate);
      
      expect(result).toBeNull();
    });

    it('should return empty array from getErrorsFromDatabase', async () => {
      const result = await service['getErrorsFromDatabase'](10);
      
      expect(result).toEqual([]);
    });

    it('should not throw from storeLogEntry', async () => {
      const entry: NotificationLogEntry = {
        eventId: 'event-123',
        jobId: 'job-456',
        jobType: 'event_update',
        status: 'completed',
        targetCount: 100,
        sentCount: 95,
        failedCount: 5,
        invalidEndpoints: [],
        errors: [],
        timestamp: new Date(),
      };

      await expect(service['storeLogEntry'](entry)).resolves.not.toThrow();
    });

    it('should not throw from storeCleanupMetrics', async () => {
      await expect(service['storeCleanupMetrics'](5, 3)).resolves.not.toThrow();
    });
  });
});