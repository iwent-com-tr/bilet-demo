import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { DevController } from './dev.controller.js';

// Mock the DevToolsService
vi.mock('../../lib/push/dev-tools.service.js', () => ({
  DevToolsService: vi.fn().mockImplementation(() => ({
    getTestTemplates: vi.fn(),
    sendTestNotification: vi.fn(),
    testUserSubscriptions: vi.fn(),
    enableMockMode: vi.fn(),
    disableMockMode: vi.fn(),
    debugPayload: vi.fn(),
    getDevStats: vi.fn(),
  })),
}));

// Mock prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: {},
}));

describe('DevController', () => {
  let devController: DevController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockDevToolsService: any;

  beforeEach(() => {
    devController = new DevController();
    mockDevToolsService = (devController as any).devToolsService;

    mockRequest = {
      body: {},
      params: {},
    };

    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      send: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('getTestTemplates', () => {
    it('should return test templates successfully', async () => {
      const mockTemplates = [
        {
          id: 'test-template',
          name: 'Test Template',
          description: 'Test description',
          payload: {
            type: 'test',
            eventId: 'test',
            title: 'Test',
            body: 'Test message',
            url: '/test',
          },
        },
      ];

      mockDevToolsService.getTestTemplates.mockReturnValue(mockTemplates);

      await devController.getTestTemplates(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        templates: mockTemplates,
        count: 1,
      });
    });

    it('should handle errors gracefully', async () => {
      mockDevToolsService.getTestTemplates.mockImplementation(() => {
        throw new Error('Service error');
      });

      await devController.getTestTemplates(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to get test templates',
        code: 'TEMPLATES_ERROR',
      });
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification successfully', async () => {
      mockRequest.body = {
        userId: 'user-123',
        templateId: 'event_time_change',
        customPayload: {
          title: 'Custom Title',
        },
      };

      const mockResult = {
        sent: 1,
        failed: 0,
        subscriptions: 1,
        errors: [],
      };

      mockDevToolsService.sendTestNotification.mockResolvedValue(mockResult);

      await devController.sendTestNotification(mockRequest as Request, mockResponse as Response);

      expect(mockDevToolsService.sendTestNotification).toHaveBeenCalledWith(
        'user-123',
        'event_time_change',
        { title: 'Custom Title' }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Test notification sent',
        result: mockResult,
      });
    });

    it('should validate request data', async () => {
      mockRequest.body = {
        userId: 'invalid-uuid',
        templateId: '',
      };

      await devController.sendTestNotification(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should handle service errors', async () => {
      mockRequest.body = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        templateId: 'event_time_change',
      };

      mockDevToolsService.sendTestNotification.mockRejectedValue(new Error('Service error'));

      await devController.sendTestNotification(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to send test notification',
        code: 'TEST_NOTIFICATION_ERROR',
      });
    });
  });

  describe('testUserSubscriptions', () => {
    it('should test user subscriptions successfully', async () => {
      mockRequest.body = {
        userId: 'user-123',
      };

      const mockResults = [
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test1',
          valid: true,
          responseTime: 150,
        },
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test2',
          valid: false,
          error: 'Invalid endpoint',
          responseTime: 100,
        },
      ];

      mockDevToolsService.testUserSubscriptions.mockResolvedValue(mockResults);

      await devController.testUserSubscriptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Subscription test completed',
        results: mockResults,
        summary: {
          total: 2,
          valid: 1,
          invalid: 1,
          averageResponseTime: 125,
        },
      });
    });

    it('should require user ID', async () => {
      mockRequest.body = {};

      await devController.testUserSubscriptions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
    });
  });

  describe('configureMockService', () => {
    it('should enable mock service with options', async () => {
      mockRequest.body = {
        enabled: true,
        options: {
          simulateFailures: true,
          failureRate: 0.2,
        },
      };

      await devController.configureMockService(mockRequest as Request, mockResponse as Response);

      expect(mockDevToolsService.enableMockMode).toHaveBeenCalledWith({
        simulateFailures: true,
        failureRate: 0.2,
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Mock push service enabled',
        config: {
          simulateFailures: true,
          failureRate: 0.2,
        },
      });
    });

    it('should disable mock service', async () => {
      mockRequest.body = {
        enabled: false,
      };

      await devController.configureMockService(mockRequest as Request, mockResponse as Response);

      expect(mockDevToolsService.disableMockMode).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Mock push service disabled',
      });
    });

    it('should validate mock configuration', async () => {
      mockRequest.body = {
        enabled: true,
        options: {
          failureRate: 1.5, // Invalid rate > 1
        },
      };

      await devController.configureMockService(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid mock configuration',
          code: 'VALIDATION_ERROR',
        })
      );
    });
  });

  describe('debugPayload', () => {
    it('should debug payload successfully', async () => {
      mockRequest.body = {
        payload: {
          type: 'test',
          eventId: 'test-event',
          title: 'Test Notification',
          body: 'Test message',
          url: '/test',
        },
      };

      const mockDebugInfo = {
        size: 150,
        sizeFormatted: '150 Bytes',
        validation: { valid: true, errors: [] },
        structure: { hasTitle: true, hasBody: true },
        recommendations: [],
      };

      mockDevToolsService.debugPayload.mockReturnValue(mockDebugInfo);

      await devController.debugPayload(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Payload analysis completed',
        debug: mockDebugInfo,
      });
    });

    it('should validate payload structure', async () => {
      mockRequest.body = {
        payload: {
          type: 'test',
          // Missing required fields
        },
      };

      await devController.debugPayload(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid payload data',
          code: 'VALIDATION_ERROR',
        })
      );
    });
  });

  describe('getDevStats', () => {
    it('should return development statistics', async () => {
      const mockStats = {
        totalSubscriptions: 100,
        activeSubscriptions: 85,
        recentNotifications: 50,
        errorRate: 0.05,
        topErrors: [
          { error: 'Push subscription no longer valid: 404', count: 3 },
        ],
      };

      mockDevToolsService.getDevStats.mockResolvedValue(mockStats);

      await devController.getDevStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Development statistics retrieved',
        stats: mockStats,
        timestamp: expect.any(String),
      });
    });

    it('should handle service errors', async () => {
      mockDevToolsService.getDevStats.mockRejectedValue(new Error('Database error'));

      await devController.getDevStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to get development statistics',
        code: 'DEV_STATS_ERROR',
      });
    });
  });

  describe('getDashboard', () => {
    it('should serve dashboard HTML', async () => {
      await devController.getDashboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
      expect(mockResponse.send).toHaveBeenCalledWith(expect.stringContaining('Push Notifications Development Dashboard'));
    });

    it('should handle dashboard errors', async () => {
      // Mock the private method to throw an error
      vi.spyOn(devController as any, 'generateDashboardHtml').mockImplementation(() => {
        throw new Error('Template error');
      });

      await devController.getDashboard(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to serve dashboard',
        code: 'DASHBOARD_ERROR',
      });
    });
  });

  describe('dashboard HTML generation', () => {
    it('should generate valid HTML dashboard', async () => {
      const html = (devController as any).generateDashboardHtml();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Push Notifications Development Dashboard</title>');
      expect(html).toContain('Send Test Notification');
      expect(html).toContain('Test User Subscriptions');
      expect(html).toContain('Mock Service Configuration');
      expect(html).toContain('Debug Payload');
      expect(html).toContain('Available Templates');
    });

    it('should include all necessary form elements', async () => {
      const html = (devController as any).generateDashboardHtml();

      expect(html).toContain('id="testNotificationForm"');
      expect(html).toContain('id="testSubscriptionsForm"');
      expect(html).toContain('id="mockConfigForm"');
      expect(html).toContain('id="debugPayloadForm"');
      expect(html).toContain('name="userId"');
      expect(html).toContain('name="templateId"');
    });

    it('should include JavaScript functionality', async () => {
      const html = (devController as any).generateDashboardHtml();

      expect(html).toContain('loadStats()');
      expect(html).toContain('loadTemplates()');
      expect(html).toContain('addEventListener');
      expect(html).toContain('fetch(');
    });
  });
});