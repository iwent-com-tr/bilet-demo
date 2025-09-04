import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { 
  MetricsCollectorService, 
  type PerformanceMetrics,
  type SystemHealthMetrics 
} from './metrics-collector.service.js';
import { PushSubscriptionService } from './push-subscription.service.js';

// Mock dependencies
vi.mock('./push-subscription.service.js', () => ({
  PushSubscriptionService: vi.fn().mockImplementation(() => ({
    getTotalSubscriptionCount: vi.fn(),
  })),
}));

vi.mock('../queue/index.js', () => ({
  checkQueueHealth: vi.fn(),
}));

// Mock Prisma Client
const mockPrisma = {} as PrismaClient;

describe('MetricsCollectorService', () => {
  let service: MetricsCollectorService;
  let mockPushSubscriptionService: any;
  let mockCheckQueueHealth: any;
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console.log to avoid noise in tests
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    service = new MetricsCollectorService(mockPrisma);
    mockPushSubscriptionService = vi.mocked(PushSubscriptionService).mock.instances[0];
    
    // Import and mock checkQueueHealth
    const queueModule = vi.mocked(await import('../queue/index.js'));
    mockCheckQueueHealth = queueModule.checkQueueHealth;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consoleSpy.mockRestore();
  });

  describe('recordJobPerformance', () => {
    it('should record job performance metrics', () => {
      const metrics: PerformanceMetrics = {
        jobId: 'job-123',
        eventId: 'event-456',
        jobType: 'event_update',
        processingTime: 1500,
        targetCount: 100,
        sentCount: 95,
        failedCount: 5,
        timestamp: new Date(),
      };

      service.recordJobPerformance(metrics);

      const summary = service.getPerformanceSummary(1);
      expect(summary.recentJobs).toHaveLength(1);
      expect(summary.recentJobs[0]).toEqual(metrics);
    });

    it('should limit performance data to maximum size', () => {
      // Record more than the maximum size (1000)
      for (let i = 0; i < 1100; i++) {
        const metrics: PerformanceMetrics = {
          jobId: `job-${i}`,
          eventId: `event-${i}`,
          jobType: 'event_update',
          processingTime: 1000 + i,
          targetCount: 10,
          sentCount: 9,
          failedCount: 1,
          timestamp: new Date(),
        };
        service.recordJobPerformance(metrics);
      }

      const summary = service.getPerformanceSummary(2000); // Request more than available
      expect(summary.recentJobs.length).toBeLessThanOrEqual(1000);
    });

    it('should log performance metrics', () => {
      const metrics: PerformanceMetrics = {
        jobId: 'job-123',
        eventId: 'event-456',
        jobType: 'event_update',
        processingTime: 1500,
        targetCount: 100,
        sentCount: 95,
        failedCount: 5,
        timestamp: new Date(),
      };

      service.recordJobPerformance(metrics);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Job performance recorded:',
        expect.objectContaining({
          jobId: 'job-123',
          eventId: 'event-456',
          jobType: 'event_update',
          processingTime: '1500ms',
          successRate: '95.00%',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('collectMetrics', () => {
    beforeEach(() => {
      // Setup mock data
      mockPushSubscriptionService.getTotalSubscriptionCount
        .mockResolvedValueOnce(1000) // total subscriptions
        .mockResolvedValueOnce(800); // active subscriptions

      mockCheckQueueHealth.mockResolvedValue({
        redis: true,
        queue: true,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      });
    });

    it('should collect comprehensive metrics for a time period', async () => {
      // Add some performance data
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');
      
      const testMetrics: PerformanceMetrics[] = [
        {
          jobId: 'job-1',
          eventId: 'event-1',
          jobType: 'event_update',
          processingTime: 1000,
          targetCount: 50,
          sentCount: 45,
          failedCount: 5,
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        {
          jobId: 'job-2',
          eventId: 'event-2',
          jobType: 'new_event',
          processingTime: 2000,
          targetCount: 100,
          sentCount: 90,
          failedCount: 10,
          timestamp: new Date('2024-01-01T14:00:00Z'),
        },
      ];

      testMetrics.forEach(metrics => service.recordJobPerformance(metrics));

      const result = await service.collectMetrics(startDate, endDate);

      expect(result.totalNotificationsSent).toBe(150);
      expect(result.successfulNotifications).toBe(135);
      expect(result.failedNotifications).toBe(15);
      expect(result.successRate).toBe(90);
      expect(result.averageProcessingTime).toBe(1500);
      expect(result.minProcessingTime).toBe(1000);
      expect(result.maxProcessingTime).toBe(2000);
      expect(result.totalProcessingTime).toBe(3000);
      expect(result.totalSubscriptions).toBe(1000);
      expect(result.activeSubscriptions).toBe(800);
      expect(result.disabledSubscriptions).toBe(200);
      expect(result.periodStart).toEqual(startDate);
      expect(result.periodEnd).toEqual(endDate);
      expect(result.collectionTime).toBeInstanceOf(Date);
    });

    it('should handle empty performance data', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');

      const result = await service.collectMetrics(startDate, endDate);

      expect(result.totalNotificationsSent).toBe(0);
      expect(result.successfulNotifications).toBe(0);
      expect(result.failedNotifications).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.averageProcessingTime).toBe(0);
      expect(result.minProcessingTime).toBe(0);
      expect(result.maxProcessingTime).toBe(0);
    });

    it('should filter performance data by time period', async () => {
      // Add metrics outside the time period
      const outsideMetrics: PerformanceMetrics = {
        jobId: 'job-outside',
        eventId: 'event-outside',
        jobType: 'event_update',
        processingTime: 5000,
        targetCount: 200,
        sentCount: 180,
        failedCount: 20,
        timestamp: new Date('2023-12-31T23:59:59Z'), // Outside period
      };

      const insideMetrics: PerformanceMetrics = {
        jobId: 'job-inside',
        eventId: 'event-inside',
        jobType: 'event_update',
        processingTime: 1000,
        targetCount: 50,
        sentCount: 45,
        failedCount: 5,
        timestamp: new Date('2024-01-01T12:00:00Z'), // Inside period
      };

      service.recordJobPerformance(outsideMetrics);
      service.recordJobPerformance(insideMetrics);

      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');

      const result = await service.collectMetrics(startDate, endDate);

      // Should only include the inside metrics
      expect(result.totalNotificationsSent).toBe(50);
      expect(result.successfulNotifications).toBe(45);
      expect(result.averageProcessingTime).toBe(1000);
    });

    it('should log collection metrics', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');

      await service.collectMetrics(startDate, endDate);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[METRICS] Metrics collected in'),
        expect.objectContaining({
          period: expect.any(String),
          totalJobs: expect.any(Number),
          totalNotifications: expect.any(Number),
          successRate: expect.any(String),
          avgProcessingTime: expect.any(String),
          subscriptions: expect.objectContaining({
            total: 1000,
            active: 800,
            disabled: 200,
          }),
          queue: expect.objectContaining({
            waiting: 5,
            active: 2,
            failed: 3,
          }),
        })
      );
    });
  });

  describe('getSystemHealth', () => {
    it('should return healthy system status', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(1000);
      mockCheckQueueHealth.mockResolvedValue({
        redis: true,
        queue: true,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 2,
      });

      // Add some successful performance data
      const metrics: PerformanceMetrics = {
        jobId: 'job-1',
        eventId: 'event-1',
        jobType: 'event_update',
        processingTime: 1000,
        targetCount: 100,
        sentCount: 95,
        failedCount: 5,
        timestamp: new Date(),
      };
      service.recordJobPerformance(metrics);

      const health = await service.getSystemHealth();

      expect(health.overall).toBe('healthy');
      expect(health.components.redis).toBe('healthy');
      expect(health.components.queue).toBe('healthy');
      expect(health.components.worker).toBe('healthy');
      expect(health.components.database).toBe('healthy');
      expect(health.alerts).toHaveLength(0);
    });

    it('should return warning status for moderate issues', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(1000);
      mockCheckQueueHealth.mockResolvedValue({
        redis: true,
        queue: true,
        waiting: 60, // High backlog
        active: 0, // No active workers
        completed: 100,
        failed: 15, // Some failures
      });

      const health = await service.getSystemHealth();

      expect(health.overall).toBe('warning');
      expect(health.components.worker).toBe('unhealthy');
      expect(health.alerts.length).toBeGreaterThan(0);
      expect(health.alerts).toContain('High queue backlog: 60 jobs waiting');
    });

    it('should return critical status for severe issues', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(1000);
      mockCheckQueueHealth.mockResolvedValue({
        redis: false, // Redis down
        queue: false,
        waiting: 150, // Very high backlog
        active: 0,
        completed: 100,
        failed: 25, // High failures
      });

      const health = await service.getSystemHealth();

      expect(health.overall).toBe('critical');
      expect(health.components.redis).toBe('unhealthy');
      expect(health.components.queue).toBe('critical');
      expect(health.alerts).toContain('Redis connection is down');
      expect(health.alerts).toContain('High number of failed jobs: 25');
    });

    it('should calculate error rate correctly', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(1000);
      mockCheckQueueHealth.mockResolvedValue({
        redis: true,
        queue: true,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 2,
      });

      // Add metrics with high error rate
      const metrics: PerformanceMetrics = {
        jobId: 'job-1',
        eventId: 'event-1',
        jobType: 'event_update',
        processingTime: 1000,
        targetCount: 100,
        sentCount: 80, // 20% error rate
        failedCount: 20,
        timestamp: new Date(),
      };
      service.recordJobPerformance(metrics);

      const health = await service.getSystemHealth();

      expect(health.metrics.errorRate).toBe(20);
      expect(health.alerts).toContain('High error rate: 20.00%');
    });

    it('should detect slow processing', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(1000);
      mockCheckQueueHealth.mockResolvedValue({
        redis: true,
        queue: true,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 2,
      });

      // Add metrics with slow processing
      const metrics: PerformanceMetrics = {
        jobId: 'job-1',
        eventId: 'event-1',
        jobType: 'event_update',
        processingTime: 35000, // 35 seconds - very slow
        targetCount: 100,
        sentCount: 95,
        failedCount: 5,
        timestamp: new Date(),
      };
      service.recordJobPerformance(metrics);

      const health = await service.getSystemHealth();

      expect(health.alerts).toContain('Slow processing: 35.00s average');
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return performance summary for recent jobs', () => {
      const testMetrics: PerformanceMetrics[] = [
        {
          jobId: 'job-1',
          eventId: 'event-1',
          jobType: 'event_update',
          processingTime: 1000,
          targetCount: 50,
          sentCount: 45,
          failedCount: 5,
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        {
          jobId: 'job-2',
          eventId: 'event-2',
          jobType: 'new_event',
          processingTime: 2000,
          targetCount: 100,
          sentCount: 90,
          failedCount: 10,
          timestamp: new Date('2024-01-01T14:00:00Z'),
        },
        {
          jobId: 'job-3',
          eventId: 'event-3',
          jobType: 'event_update',
          processingTime: 1500,
          targetCount: 75,
          sentCount: 70,
          failedCount: 5,
          timestamp: new Date('2024-01-01T16:00:00Z'),
        },
      ];

      testMetrics.forEach(metrics => service.recordJobPerformance(metrics));

      const summary = service.getPerformanceSummary(2);

      expect(summary.recentJobs).toHaveLength(2);
      expect(summary.summary.totalJobs).toBe(2);
      expect(summary.summary.averageProcessingTime).toBe(1750); // (2000 + 1500) / 2
      expect(summary.summary.totalNotificationsSent).toBe(175); // 100 + 75
      expect(summary.summary.averageSuccessRate).toBe(91.43); // (90 + 70) / (100 + 75) * 100
    });

    it('should return jobs in descending order by timestamp', () => {
      const testMetrics: PerformanceMetrics[] = [
        {
          jobId: 'job-1',
          eventId: 'event-1',
          jobType: 'event_update',
          processingTime: 1000,
          targetCount: 50,
          sentCount: 45,
          failedCount: 5,
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        {
          jobId: 'job-2',
          eventId: 'event-2',
          jobType: 'new_event',
          processingTime: 2000,
          targetCount: 100,
          sentCount: 90,
          failedCount: 10,
          timestamp: new Date('2024-01-01T14:00:00Z'),
        },
      ];

      testMetrics.forEach(metrics => service.recordJobPerformance(metrics));

      const summary = service.getPerformanceSummary();

      expect(summary.recentJobs[0].jobId).toBe('job-2'); // Most recent first
      expect(summary.recentJobs[1].jobId).toBe('job-1');
    });

    it('should handle empty performance data', () => {
      const summary = service.getPerformanceSummary();

      expect(summary.recentJobs).toHaveLength(0);
      expect(summary.summary.totalJobs).toBe(0);
      expect(summary.summary.averageProcessingTime).toBe(0);
      expect(summary.summary.averageSuccessRate).toBe(0);
      expect(summary.summary.totalNotificationsSent).toBe(0);
    });
  });

  describe('clearOldData', () => {
    it('should clear old performance data', () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      const oldMetrics: PerformanceMetrics = {
        jobId: 'old-job',
        eventId: 'old-event',
        jobType: 'event_update',
        processingTime: 1000,
        targetCount: 50,
        sentCount: 45,
        failedCount: 5,
        timestamp: oldDate,
      };

      const recentMetrics: PerformanceMetrics = {
        jobId: 'recent-job',
        eventId: 'recent-event',
        jobType: 'event_update',
        processingTime: 1000,
        targetCount: 50,
        sentCount: 45,
        failedCount: 5,
        timestamp: recentDate,
      };

      service.recordJobPerformance(oldMetrics);
      service.recordJobPerformance(recentMetrics);

      const removedCount = service.clearOldData(24); // Clear data older than 24 hours

      expect(removedCount).toBe(1);
      
      const summary = service.getPerformanceSummary();
      expect(summary.recentJobs).toHaveLength(1);
      expect(summary.recentJobs[0].jobId).toBe('recent-job');
    });

    it('should log when clearing old data', () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const oldMetrics: PerformanceMetrics = {
        jobId: 'old-job',
        eventId: 'old-event',
        jobType: 'event_update',
        processingTime: 1000,
        targetCount: 50,
        sentCount: 45,
        failedCount: 5,
        timestamp: oldDate,
      };

      service.recordJobPerformance(oldMetrics);
      service.clearOldData(24);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[METRICS] Cleared 1 old performance entries'
      );
    });

    it('should not log when no data is cleared', () => {
      service.clearOldData(24);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[METRICS] Cleared')
      );
    });
  });

  describe('exportMetrics', () => {
    beforeEach(() => {
      mockPushSubscriptionService.getTotalSubscriptionCount
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(800);

      mockCheckQueueHealth.mockResolvedValue({
        redis: true,
        queue: true,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      });
    });

    it('should export metrics as JSON string', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');

      const metrics: PerformanceMetrics = {
        jobId: 'job-1',
        eventId: 'event-1',
        jobType: 'event_update',
        processingTime: 1000,
        targetCount: 50,
        sentCount: 45,
        failedCount: 5,
        timestamp: new Date('2024-01-01T12:00:00Z'),
      };
      service.recordJobPerformance(metrics);

      const exportedData = await service.exportMetrics(startDate, endDate);

      expect(typeof exportedData).toBe('string');
      
      const parsed = JSON.parse(exportedData);
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('systemHealth');
      expect(parsed).toHaveProperty('performanceSummary');
      expect(parsed).toHaveProperty('exportTime');
      
      expect(parsed.metrics.totalNotificationsSent).toBe(50);
      expect(parsed.systemHealth.overall).toBe('healthy');
      expect(parsed.performanceSummary.recentJobs).toHaveLength(1);
    });
  });

  describe('getMetricsForTimeRange', () => {
    beforeEach(() => {
      mockPushSubscriptionService.getTotalSubscriptionCount
        .mockResolvedValue(1000)
        .mockResolvedValue(800);

      mockCheckQueueHealth.mockResolvedValue({
        redis: true,
        queue: true,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      });
    });

    it('should get metrics for hour range', async () => {
      const result = await service.getMetricsForTimeRange('hour');
      
      expect(result.periodStart.getTime()).toBeLessThanOrEqual(Date.now() - 60 * 60 * 1000);
      expect(result.periodEnd.getTime()).toBeCloseTo(Date.now(), -3); // Within 1 second
    });

    it('should get metrics for day range', async () => {
      const result = await service.getMetricsForTimeRange('day');
      
      expect(result.periodStart.getTime()).toBeLessThanOrEqual(Date.now() - 24 * 60 * 60 * 1000);
      expect(result.periodEnd.getTime()).toBeCloseTo(Date.now(), -3);
    });

    it('should get metrics for week range', async () => {
      const result = await service.getMetricsForTimeRange('week');
      
      expect(result.periodStart.getTime()).toBeLessThanOrEqual(Date.now() - 7 * 24 * 60 * 60 * 1000);
      expect(result.periodEnd.getTime()).toBeCloseTo(Date.now(), -3);
    });

    it('should get metrics for month range', async () => {
      const result = await service.getMetricsForTimeRange('month');
      
      expect(result.periodStart.getTime()).toBeLessThanOrEqual(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(result.periodEnd.getTime()).toBeCloseTo(Date.now(), -3);
    });
  });
});