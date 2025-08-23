import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HealthController } from './health.controller.js';
import { getNotificationWorker } from '../../lib/queue/notification.worker.js';
import { checkQueueHealth, getQueueStats } from '../../lib/queue/index.js';

// Mock the dependencies
vi.mock('../../lib/queue/notification.worker.js');
vi.mock('../../lib/queue/index.js');
vi.mock('../../lib/push/push-subscription.service.js');
vi.mock('../../lib/push/metrics-collector.service.js');
vi.mock('../../lib/push/error-tracking.service.js');

describe('HealthController', () => {
  let healthController: HealthController;
  let mockPrisma: PrismaClient;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: MockedFunction<any>;
  let mockStatus: MockedFunction<any>;

  beforeEach(() => {
    mockPrisma = {} as PrismaClient;
    
    // Mock response object
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockRes = {
      json: mockJson,
      status: mockStatus,
      setHeader: vi.fn(),
      send: vi.fn(),
      sendFile: vi.fn(),
    };

    mockReq = {
      query: {},
    };

    // Reset all mocks
    vi.clearAllMocks();

    healthController = new HealthController(mockPrisma);
  });

  describe('getSystemHealth', () => {
    it('should return system health data successfully', async () => {
      const mockSystemHealth = {
        overall: 'healthy',
        components: {
          redis: 'healthy',
          queue: 'healthy',
          worker: 'healthy',
          database: 'healthy',
        },
        metrics: {
          queueBacklog: 5,
          errorRate: 2.5,
          averageProcessingTime: 1500,
          subscriptionCount: 100,
        },
        alerts: [],
        lastUpdated: new Date(),
      };

      // Mock the metrics collector
      const mockMetricsCollector = {
        getSystemHealth: vi.fn().mockResolvedValue(mockSystemHealth),
      };

      // Replace the metrics collector in the controller
      (healthController as any).metricsCollector = mockMetricsCollector;

      await healthController.getSystemHealth(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: mockSystemHealth,
      });
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('System health check failed');
      
      const mockMetricsCollector = {
        getSystemHealth: vi.fn().mockRejectedValue(mockError),
      };

      (healthController as any).metricsCollector = mockMetricsCollector;

      await healthController.getSystemHealth(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to retrieve system health',
        error: 'System health check failed',
      });
    });
  });

  describe('getQueueHealth', () => {
    it('should return queue health data successfully', async () => {
      const mockQueueHealth = {
        redis: true,
        queue: true,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
      };

      const mockQueueStats = {
        redis: true,
        queue: true,
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        paused: false,
        name: 'notifications',
      };

      vi.mocked(checkQueueHealth).mockResolvedValue(mockQueueHealth);
      vi.mocked(getQueueStats).mockResolvedValue(mockQueueStats);

      await healthController.getQueueHealth(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: {
          health: mockQueueHealth,
          stats: mockQueueStats,
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle queue health check errors', async () => {
      const mockError = new Error('Queue health check failed');
      
      vi.mocked(checkQueueHealth).mockRejectedValue(mockError);

      await healthController.getQueueHealth(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to retrieve queue health',
        error: 'Queue health check failed',
      });
    });
  });

  describe('getWorkerStatus', () => {
    it('should return worker status when worker is available', async () => {
      const mockWorker = {
        getStats: vi.fn().mockResolvedValue({
          isRunning: true,
          concurrency: 5,
        }),
        getHealthMetrics: vi.fn().mockResolvedValue({
          systemHealth: { overall: 'healthy' },
          errorStats: { totalErrors: 0 },
          recentAlerts: [],
          worker: { isRunning: true, concurrency: 5 },
        }),
      };

      vi.mocked(getNotificationWorker).mockReturnValue(mockWorker as any);

      await healthController.getWorkerStatus(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: {
          worker: {
            isRunning: true,
            concurrency: 5,
          },
          health: {
            systemHealth: { overall: 'healthy' },
            errorStats: { totalErrors: 0 },
            recentAlerts: [],
            worker: { isRunning: true, concurrency: 5 },
          },
          timestamp: expect.any(String),
        },
      });
    });

    it('should return error when worker is not initialized', async () => {
      vi.mocked(getNotificationWorker).mockReturnValue(null);

      await healthController.getWorkerStatus(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Notification worker not initialized',
        data: {
          isRunning: false,
          initialized: false,
        },
      });
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for valid period', async () => {
      mockReq.query = { period: 'day' };

      const mockMetrics = {
        totalNotificationsSent: 1000,
        successfulNotifications: 950,
        failedNotifications: 50,
        successRate: 95,
        averageProcessingTime: 1500,
        periodStart: new Date(),
        periodEnd: new Date(),
        collectionTime: new Date(),
      };

      const mockPerformanceSummary = {
        recentJobs: [],
        summary: {
          totalJobs: 10,
          averageProcessingTime: 1500,
          averageSuccessRate: 95,
          totalNotificationsSent: 1000,
        },
      };

      const mockMetricsCollector = {
        getMetricsForTimeRange: vi.fn().mockResolvedValue(mockMetrics),
        getPerformanceSummary: vi.fn().mockReturnValue(mockPerformanceSummary),
      };

      (healthController as any).metricsCollector = mockMetricsCollector;

      await healthController.getMetrics(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: {
          metrics: mockMetrics,
          performanceSummary: mockPerformanceSummary,
          period: 'day',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return error for invalid period', async () => {
      mockReq.query = { period: 'invalid' };

      await healthController.getMetrics(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid period. Must be one of: hour, day, week, month',
      });
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics successfully', async () => {
      const mockErrorStats = {
        totalErrors: 25,
        errorsByStatusCode: { '404': 10, '500': 15 },
        errorsByType: { 'invalid_endpoint': 10, 'service_unavailable': 15 },
        invalidEndpointsFound: 10,
        subscriptionsCleanedUp: 8,
        lastCleanupTime: new Date(),
      };

      const mockRecentAlerts = [
        {
          type: 'high_failure_rate',
          severity: 'warning',
          message: 'High error rate detected',
          timestamp: new Date(),
        },
      ];

      const mockHealthStatus = {
        status: 'warning',
        errorRate: 15,
        recentAlerts: 1,
        lastCleanup: new Date(),
      };

      const mockErrorTracker = {
        getErrorStats: vi.fn().mockReturnValue(mockErrorStats),
        getRecentAlerts: vi.fn().mockReturnValue(mockRecentAlerts),
        getHealthStatus: vi.fn().mockResolvedValue(mockHealthStatus),
      };

      (healthController as any).errorTracker = mockErrorTracker;

      await healthController.getErrorStats(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: {
          errorStats: mockErrorStats,
          recentAlerts: mockRecentAlerts,
          healthStatus: mockHealthStatus,
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('getSubscriptionStats', () => {
    it('should return subscription statistics successfully', async () => {
      const mockPushSubscriptionService = {
        getTotalSubscriptionCount: vi.fn()
          .mockResolvedValueOnce(150) // total
          .mockResolvedValueOnce(140), // active
      };

      (healthController as any).pushSubscriptionService = mockPushSubscriptionService;

      await healthController.getSubscriptionStats(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: {
          total: 150,
          active: 140,
          disabled: 10,
          activePercentage: '93.33',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle zero subscriptions', async () => {
      const mockPushSubscriptionService = {
        getTotalSubscriptionCount: vi.fn()
          .mockResolvedValueOnce(0) // total
          .mockResolvedValueOnce(0), // active
      };

      (healthController as any).pushSubscriptionService = mockPushSubscriptionService;

      await healthController.getSubscriptionStats(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: {
          total: 0,
          active: 0,
          disabled: 0,
          activePercentage: '0',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('performMaintenance', () => {
    it('should perform maintenance successfully', async () => {
      const mockMaintenanceResult = {
        cleanupResult: { cleaned: 5, processed: 5, errors: [] },
        metricsCleared: 10,
        alertsCleared: true,
      };

      const mockWorker = {
        performMaintenance: vi.fn().mockResolvedValue(mockMaintenanceResult),
      };

      vi.mocked(getNotificationWorker).mockReturnValue(mockWorker as any);

      await healthController.performMaintenance(mockReq as Request, mockRes as Response);

      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        message: 'Maintenance tasks completed successfully',
        data: mockMaintenanceResult,
      });
    });

    it('should return error when worker is not available', async () => {
      vi.mocked(getNotificationWorker).mockReturnValue(null);

      await healthController.performMaintenance(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Notification worker not available for maintenance',
      });
    });
  });

  describe('clearAlerts', () => {
    it('should clear alerts successfully', async () => {
      const mockErrorTracker = {
        clearAlerts: vi.fn(),
      };

      (healthController as any).errorTracker = mockErrorTracker;

      await healthController.clearAlerts(mockReq as Request, mockRes as Response);

      expect(mockErrorTracker.clearAlerts).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        message: 'All alerts cleared successfully',
        timestamp: expect.any(String),
      });
    });
  });

  describe('resetErrorStats', () => {
    it('should reset error statistics successfully', async () => {
      const mockErrorTracker = {
        resetErrorStats: vi.fn(),
      };

      (healthController as any).errorTracker = mockErrorTracker;

      await healthController.resetErrorStats(mockReq as Request, mockRes as Response);

      expect(mockErrorTracker.resetErrorStats).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        message: 'Error statistics reset successfully',
        timestamp: expect.any(String),
      });
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics with default date range', async () => {
      const mockExportData = JSON.stringify({
        metrics: { totalNotifications: 1000 },
        exportTime: new Date().toISOString(),
      });

      const mockMetricsCollector = {
        exportMetrics: vi.fn().mockResolvedValue(mockExportData),
      };

      (healthController as any).metricsCollector = mockMetricsCollector;

      await healthController.exportMetrics(mockReq as Request, mockRes as Response);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment; filename="metrics-'));
      expect(mockRes.send).toHaveBeenCalledWith(mockExportData);
    });

    it('should return error for invalid date format', async () => {
      mockReq.query = { startDate: 'invalid-date' };

      await healthController.exportMetrics(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid startDate format',
      });
    });

    it('should return error for unsupported format', async () => {
      mockReq.query = { format: 'xml' };

      await healthController.exportMetrics(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unsupported format. Only JSON is currently supported.',
      });
    });
  });
});