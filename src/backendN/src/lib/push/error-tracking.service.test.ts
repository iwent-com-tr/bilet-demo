import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ErrorTrackingService, type ErrorTrackingConfig } from './error-tracking.service.js';
import { PushSubscriptionService } from './push-subscription.service.js';
import { NotificationLoggerService } from './notification-logger.service.js';

// Mock dependencies
vi.mock('./push-subscription.service.js', () => ({
  PushSubscriptionService: vi.fn().mockImplementation(() => ({
    cleanupInvalidSubscription: vi.fn(),
    cleanupOldDisabledSubscriptions: vi.fn(),
    getTotalSubscriptionCount: vi.fn(),
  })),
}));

vi.mock('./notification-logger.service.js', () => ({
  NotificationLoggerService: vi.fn().mockImplementation(() => ({
    logSubscriptionCleanup: vi.fn(),
  })),
}));

// Mock Prisma Client
const mockPrisma = {} as PrismaClient;

describe('ErrorTrackingService', () => {
  let service: ErrorTrackingService;
  let mockPushSubscriptionService: any;
  let mockLogger: any;
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods to avoid noise in tests
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    };

    service = new ErrorTrackingService(mockPrisma);
    mockPushSubscriptionService = vi.mocked(PushSubscriptionService).mock.instances[0];
    mockLogger = vi.mocked(NotificationLoggerService).mock.instances[0];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const service = new ErrorTrackingService(mockPrisma);
      expect(service).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<ErrorTrackingConfig> = {
        maxRetries: 5,
        errorThresholdPercent: 15,
      };
      
      const service = new ErrorTrackingService(mockPrisma, customConfig);
      expect(service).toBeDefined();
    });
  });

  describe('trackError', () => {
    it('should track error and update statistics', async () => {
      const error = new Error('Test error') as Error & { statusCode?: number };
      error.statusCode = 500;

      await service.trackError('https://example.com/endpoint', error, 'job-123', 'event-456');

      const stats = service.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByStatusCode[500]).toBe(1);
      expect(stats.errorsByType['service_unavailable']).toBe(1);
    });

    it('should handle 404 errors by marking endpoint for cleanup', async () => {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;

      mockPushSubscriptionService.cleanupInvalidSubscription.mockResolvedValue(true);

      await service.trackError('https://example.com/endpoint', error, 'job-123');

      expect(mockPushSubscriptionService.cleanupInvalidSubscription)
        .toHaveBeenCalledWith('https://example.com/endpoint');
      expect(mockLogger.logSubscriptionCleanup)
        .toHaveBeenCalledWith(['https://example.com/endpoint'], 1, 'job-123');

      const stats = service.getErrorStats();
      expect(stats.invalidEndpointsFound).toBe(1);
      expect(stats.subscriptionsCleanedUp).toBe(1);
    });

    it('should handle 410 errors by marking endpoint for cleanup', async () => {
      const error = new Error('Gone') as Error & { statusCode?: number };
      error.statusCode = 410;

      mockPushSubscriptionService.cleanupInvalidSubscription.mockResolvedValue(true);

      await service.trackError('https://example.com/endpoint', error);

      expect(mockPushSubscriptionService.cleanupInvalidSubscription)
        .toHaveBeenCalledWith('https://example.com/endpoint');

      const stats = service.getErrorStats();
      expect(stats.invalidEndpointsFound).toBe(1);
      expect(stats.subscriptionsCleanedUp).toBe(1);
    });

    it('should handle cleanup failures gracefully', async () => {
      const error = new Error('Not found') as Error & { statusCode?: number };
      error.statusCode = 404;

      mockPushSubscriptionService.cleanupInvalidSubscription.mockRejectedValue(
        new Error('Cleanup failed')
      );

      await service.trackError('https://example.com/endpoint', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[CLEANUP-ERROR] Failed to cleanup endpoint:',
        expect.objectContaining({
          endpoint: expect.any(String),
          error: expect.any(Error),
        })
      );
    });

    it('should log different error types appropriately', async () => {
      const testCases = [
        { statusCode: 413, expectedLog: '[PAYLOAD-TOO-LARGE]' },
        { statusCode: 429, expectedLog: '[RATE-LIMITED]' },
        { statusCode: 500, expectedLog: '[SERVICE-UNAVAILABLE]' },
        { statusCode: 502, expectedLog: '[SERVICE-UNAVAILABLE]' },
        { statusCode: 503, expectedLog: '[SERVICE-UNAVAILABLE]' },
        { statusCode: 999, expectedLog: '[UNKNOWN-ERROR]' },
      ];

      for (const testCase of testCases) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = testCase.statusCode;

        await service.trackError('https://example.com/endpoint', error);

        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining(testCase.expectedLog),
          expect.any(Object)
        );
      }
    });

    it('should check alert conditions after tracking error', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(100);

      // Track enough errors to trigger alert threshold
      for (let i = 0; i < 15; i++) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = 500;
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      const alerts = service.getRecentAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('high_failure_rate');
    });
  });

  describe('performBatchCleanup', () => {
    it('should perform batch cleanup successfully', async () => {
      mockPushSubscriptionService.cleanupOldDisabledSubscriptions.mockResolvedValue(5);

      const result = await service.performBatchCleanup();

      expect(result.processed).toBe(5);
      expect(result.cleaned).toBe(5);
      expect(result.errors).toHaveLength(0);
      expect(mockPushSubscriptionService.cleanupOldDisabledSubscriptions)
        .toHaveBeenCalledWith(7);
      expect(mockLogger.logSubscriptionCleanup)
        .toHaveBeenCalledWith([], 5);

      const stats = service.getErrorStats();
      expect(stats.subscriptionsCleanedUp).toBe(5);
      expect(stats.lastCleanupTime).toBeInstanceOf(Date);
    });

    it('should handle cleanup errors gracefully', async () => {
      const cleanupError = new Error('Cleanup failed');
      mockPushSubscriptionService.cleanupOldDisabledSubscriptions.mockRejectedValue(cleanupError);

      const result = await service.performBatchCleanup();

      expect(result.processed).toBe(0);
      expect(result.cleaned).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Batch cleanup failed');
    });
  });

  describe('error statistics', () => {
    it('should return current error statistics', () => {
      const stats = service.getErrorStats();

      expect(stats).toEqual({
        totalErrors: 0,
        errorsByStatusCode: {},
        errorsByType: {},
        invalidEndpointsFound: 0,
        subscriptionsCleanedUp: 0,
        lastCleanupTime: null,
      });
    });

    it('should reset error statistics', async () => {
      // Add some errors first
      const error = new Error('Test error') as Error & { statusCode?: number };
      error.statusCode = 500;
      await service.trackError('https://example.com/endpoint', error);

      let stats = service.getErrorStats();
      expect(stats.totalErrors).toBe(1);

      service.resetErrorStats();

      stats = service.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByStatusCode).toEqual({});
      expect(stats.errorsByType).toEqual({});
    });
  });

  describe('alert management', () => {
    it('should add alerts for high failure rate', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(100);

      // Track enough errors to trigger critical alert (25% threshold)
      for (let i = 0; i < 30; i++) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = 500;
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      const alerts = service.getRecentAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const criticalAlert = alerts.find(alert => alert.severity === 'critical');
      expect(criticalAlert).toBeDefined();
      expect(criticalAlert?.type).toBe('high_failure_rate');
      expect(criticalAlert?.message).toContain('High notification failure rate');
    });

    it('should add alerts for high number of invalid endpoints', async () => {
      // Track enough invalid endpoint errors
      for (let i = 0; i < 55; i++) {
        const error = new Error('Not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        mockPushSubscriptionService.cleanupInvalidSubscription.mockResolvedValue(true);
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      const alerts = service.getRecentAlerts();
      const invalidEndpointAlert = alerts.find(alert => alert.type === 'invalid_endpoints');
      expect(invalidEndpointAlert).toBeDefined();
      expect(invalidEndpointAlert?.message).toContain('High number of invalid endpoints');
    });

    it('should add alerts for service unavailable errors', async () => {
      // Track enough service unavailable errors
      for (let i = 0; i < 12; i++) {
        const error = new Error('Service unavailable') as Error & { statusCode?: number };
        error.statusCode = 503;
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      const alerts = service.getRecentAlerts();
      const serviceAlert = alerts.find(alert => alert.type === 'service_unavailable');
      expect(serviceAlert).toBeDefined();
      expect(serviceAlert?.message).toContain('Multiple push service unavailable errors');
    });

    it('should limit alerts to 100 entries', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(100);

      // Generate more than 100 alerts
      for (let i = 0; i < 150; i++) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = 500;
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      const allAlerts = service.getRecentAlerts(200); // Request more than limit
      expect(allAlerts.length).toBeLessThanOrEqual(100);
    });

    it('should clear alerts', async () => {
      // Generate some alerts first
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(100);
      for (let i = 0; i < 15; i++) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = 500;
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      expect(service.getRecentAlerts().length).toBeGreaterThan(0);

      service.clearAlerts();

      expect(service.getRecentAlerts().length).toBe(0);
    });

    it('should return recent alerts in descending order', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(100);

      // Generate alerts with some delay
      for (let i = 0; i < 3; i++) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = 500;
        await service.trackError(`https://example.com/endpoint${i}`, error);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const alerts = service.getRecentAlerts();
      expect(alerts.length).toBeGreaterThan(1);
      
      // Check that alerts are in descending order by timestamp
      for (let i = 1; i < alerts.length; i++) {
        expect(alerts[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          alerts[i].timestamp.getTime()
        );
      }
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status with low error rate', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(1000);

      // Track a few errors (below threshold)
      for (let i = 0; i < 5; i++) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = 500;
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      const health = await service.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.errorRate).toBeLessThan(10);
    });

    it('should return warning status with moderate error rate', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(100);

      // Track errors to reach warning threshold (10-25%)
      for (let i = 0; i < 15; i++) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = 500;
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      const health = await service.getHealthStatus();
      expect(health.status).toBe('warning');
      expect(health.errorRate).toBeGreaterThanOrEqual(10);
      expect(health.errorRate).toBeLessThan(25);
    });

    it('should return critical status with high error rate', async () => {
      mockPushSubscriptionService.getTotalSubscriptionCount.mockResolvedValue(100);

      // Track errors to reach critical threshold (>25%)
      for (let i = 0; i < 30; i++) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = 500;
        await service.trackError(`https://example.com/endpoint${i}`, error);
      }

      const health = await service.getHealthStatus();
      expect(health.status).toBe('critical');
      expect(health.errorRate).toBeGreaterThanOrEqual(25);
    });
  });

  describe('endpoint masking', () => {
    it('should mask endpoint URLs for privacy', async () => {
      const error = new Error('Test error') as Error & { statusCode?: number };
      error.statusCode = 500;

      await service.trackError('https://fcm.googleapis.com/fcm/send/very-long-endpoint-id', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          endpoint: 'https://fcm.googleapis.com/fcm/send/***',
        })
      );
    });

    it('should handle invalid URLs gracefully', async () => {
      const error = new Error('Test error') as Error & { statusCode?: number };
      error.statusCode = 500;

      await service.trackError('invalid-url-format', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          endpoint: 'invalid-url-format',
        })
      );
    });

    it('should truncate very long endpoints', async () => {
      const error = new Error('Test error') as Error & { statusCode?: number };
      error.statusCode = 500;

      const longEndpoint = 'a'.repeat(50);
      await service.trackError(longEndpoint, error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          endpoint: longEndpoint.substring(0, 20) + '***',
        })
      );
    });
  });

  describe('error categorization', () => {
    it('should categorize errors correctly', async () => {
      const testCases = [
        { statusCode: 404, expectedType: 'invalid_endpoint' },
        { statusCode: 410, expectedType: 'invalid_endpoint' },
        { statusCode: 413, expectedType: 'payload_too_large' },
        { statusCode: 429, expectedType: 'rate_limited' },
        { statusCode: 500, expectedType: 'service_unavailable' },
        { statusCode: 502, expectedType: 'service_unavailable' },
        { statusCode: 503, expectedType: 'service_unavailable' },
        { statusCode: 400, expectedType: 'client_error' },
        { statusCode: 0, expectedType: 'unknown_error' },
      ];

      for (const testCase of testCases) {
        const error = new Error('Test error') as Error & { statusCode?: number };
        error.statusCode = testCase.statusCode;

        await service.trackError(`https://example.com/endpoint${testCase.statusCode}`, error);

        const stats = service.getErrorStats();
        expect(stats.errorsByType[testCase.expectedType]).toBeGreaterThan(0);
      }
    });

    it('should categorize timeout errors', async () => {
      const error = new Error('Request timeout occurred');
      await service.trackError('https://example.com/endpoint', error);

      const stats = service.getErrorStats();
      expect(stats.errorsByType['timeout']).toBe(1);
    });

    it('should categorize network errors', async () => {
      const error = new Error('Network connection failed');
      await service.trackError('https://example.com/endpoint', error);

      const stats = service.getErrorStats();
      expect(stats.errorsByType['network_error']).toBe(1);
    });
  });
});