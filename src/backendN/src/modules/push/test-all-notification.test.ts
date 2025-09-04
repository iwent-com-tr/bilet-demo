import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { PushController } from './push.controller.js';

// Mock the dependencies
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock('../../lib/push/push-subscription.service.js');
vi.mock('../../lib/push/web-push.service.js');

// Import the mocked prisma after mocking
import { prisma } from '../../lib/prisma.js';
import { PushSubscriptionService } from '../../lib/push/push-subscription.service.js';
import { WebPushService } from '../../lib/push/web-push.service.js';

describe('PushController - sendTestNotificationToAll', () => {
  let pushController: PushController;
  let mockPushSubscriptionService: any;
  let mockWebPushService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockResponseJson: any;
  let mockResponseStatus: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup response mocks
    mockResponseJson = vi.fn().mockReturnThis();
    mockResponseStatus = vi.fn().mockReturnThis();
    
    mockResponse = {
      json: mockResponseJson,
      status: mockResponseStatus,
    };

    // Create controller instance
    pushController = new PushController();
    
    // Get the mocked services
    mockPushSubscriptionService = vi.mocked(PushSubscriptionService).mock.instances[0];
    mockWebPushService = vi.mocked(WebPushService).mock.instances[0];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockRequest = {
        body: {},
        user: undefined,
      } as any;

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponseStatus).toHaveBeenCalledWith(401);
      expect(mockResponseJson).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    });

    it('should return 403 if user is not an admin', async () => {
      mockRequest = {
        body: {},
        user: { id: 'regular-user-id' },
      } as any;

      // Mock prisma to return a non-admin user
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'regular-user-id',
        userType: 'USER',
        email: 'user@test.com',
        firstName: 'Regular',
        lastName: 'User',
      });

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponseStatus).toHaveBeenCalledWith(403);
      expect(mockResponseJson).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'FORBIDDEN',
      });
    });

    it('should return 403 if user does not exist', async () => {
      mockRequest = {
        body: {},
        user: { id: 'non-existent-user-id' },
      } as any;

      // Mock prisma to return null (user not found)
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponseStatus).toHaveBeenCalledWith(403);
      expect(mockResponseJson).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'FORBIDDEN',
      });
    });
  });

  describe('Subscription Handling', () => {
    beforeEach(() => {
      mockRequest = {
        body: {},
        user: { id: 'admin-user-id' },
      } as any;
      
      // Mock prisma to return admin user
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'admin-user-id',
        userType: 'ADMIN',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
      });
    });

    it('should return 404 if no active subscriptions exist', async () => {
      mockPushSubscriptionService.getSubscriptions.mockResolvedValue([]);

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponseStatus).toHaveBeenCalledWith(404);
      expect(mockResponseJson).toHaveBeenCalledWith({
        error: 'No active push subscriptions found',
        code: 'NO_SUBSCRIPTIONS',
        message: 'No users have enabled push notifications',
      });

      expect(mockPushSubscriptionService.getSubscriptions).toHaveBeenCalledWith({
        enabled: true,
      });
    });

    it('should successfully send notification to all active subscribers', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
          p256dh: 'key-1',
          auth: 'auth-1',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-2',
          p256dh: 'key-2',
          auth: 'auth-2',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ];

      const mockPushSubscriptionData = [
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
          keys: { p256dh: 'key-1', auth: 'auth-1' },
        },
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-2',
          keys: { p256dh: 'key-2', auth: 'auth-2' },
        },
      ];

      const mockBulkResult = {
        sent: 2,
        failed: 0,
        invalidEndpoints: [],
        errors: [],
      };

      mockPushSubscriptionService.getSubscriptions.mockResolvedValue(mockSubscriptions);
      mockPushSubscriptionService.toPushSubscriptionDataArray.mockReturnValue(mockPushSubscriptionData);
      mockWebPushService.sendBulkNotifications.mockResolvedValue(mockBulkResult);
      mockPushSubscriptionService.cleanupInvalidSubscriptions.mockResolvedValue(0);

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponseJson).toHaveBeenCalledWith({
        message: 'Test notification sent to all active subscribers',
        totalSubscribers: 2,
        sent: 2,
        failed: 0,
        invalidEndpoints: 0,
        deliveryRate: '100.00%',
        payload: {
          title: 'Test Notification to All Users 🔔',
          body: 'This is a test push notification sent to all active subscribers!',
          url: '/',
        },
      });

      expect(mockWebPushService.sendBulkNotifications).toHaveBeenCalledWith(
        mockPushSubscriptionData,
        expect.objectContaining({
          type: 'admin_test_notification',
          title: 'Test Notification to All Users 🔔',
          body: 'This is a test push notification sent to all active subscribers!',
          url: '/',
          icon: '/favicon-16x16.png',
          badge: '/favicon-16x16.png',
        }),
        {
          ttl: 86400,
          urgency: 'normal',
          topic: 'admin_test_broadcast',
        }
      );
    });
  });

  describe('Custom Payload Handling', () => {
    beforeEach(() => {
      // Mock prisma to return admin user
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'admin-user-id',
        userType: 'ADMIN',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
      });
      
      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
          p256dh: 'key-1',
          auth: 'auth-1',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ];

      const mockBulkResult = {
        sent: 1,
        failed: 0,
        invalidEndpoints: [],
        errors: [],
      };

      mockPushSubscriptionService.getSubscriptions.mockResolvedValue(mockSubscriptions);
      mockPushSubscriptionService.toPushSubscriptionDataArray.mockReturnValue([
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
          keys: { p256dh: 'key-1', auth: 'auth-1' },
        },
      ]);
      mockWebPushService.sendBulkNotifications.mockResolvedValue(mockBulkResult);
      mockPushSubscriptionService.cleanupInvalidSubscriptions.mockResolvedValue(0);
    });

    it('should use custom title, body, and url when provided', async () => {
      mockRequest = {
        body: {
          title: 'Custom Test Title',
          body: 'Custom test message',
          url: '/custom-path',
          icon: 'https://example.com/custom-icon.png',
          badge: 'https://example.com/custom-badge.png',
        },
        user: { id: 'admin-user-id' },
      } as any;

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockWebPushService.sendBulkNotifications).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          title: 'Custom Test Title',
          body: 'Custom test message',
          url: '/custom-path',
          icon: 'https://example.com/custom-icon.png',
          badge: 'https://example.com/custom-badge.png',
        }),
        expect.any(Object)
      );

      expect(mockResponseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: {
            title: 'Custom Test Title',
            body: 'Custom test message',
            url: '/custom-path',
          },
        })
      );
    });

    it('should use default values when custom payload is not provided', async () => {
      mockRequest = {
        body: {},
        user: { id: 'admin-user-id' },
      } as any;

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockWebPushService.sendBulkNotifications).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          title: 'Test Notification to All Users 🔔',
          body: 'This is a test push notification sent to all active subscribers!',
          url: '/',
          icon: '/favicon-16x16.png',
          badge: '/favicon-16x16.png',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Cleanup', () => {
    beforeEach(() => {
      mockRequest = {
        body: {},
        user: { id: 'admin-user-id' },
      } as any;
      
      // Mock prisma to return admin user
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'admin-user-id',
        userType: 'ADMIN',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
      });
    });

    it('should handle partial failures and cleanup invalid endpoints', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          userId: 'user-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
          p256dh: 'key-1',
          auth: 'auth-1',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-2',
          p256dh: 'key-2',
          auth: 'auth-2',
          enabled: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ];

      const mockBulkResult = {
        sent: 1,
        failed: 1,
        invalidEndpoints: ['https://fcm.googleapis.com/fcm/send/endpoint-2'],
        errors: [
          {
            endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-2',
            error: 'Invalid endpoint',
            statusCode: 404,
          },
        ],
      };

      mockPushSubscriptionService.getSubscriptions.mockResolvedValue(mockSubscriptions);
      mockPushSubscriptionService.toPushSubscriptionDataArray.mockReturnValue([
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-1',
          keys: { p256dh: 'key-1', auth: 'auth-1' },
        },
        {
          endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint-2',
          keys: { p256dh: 'key-2', auth: 'auth-2' },
        },
      ]);
      mockWebPushService.sendBulkNotifications.mockResolvedValue(mockBulkResult);
      mockPushSubscriptionService.cleanupInvalidSubscriptions.mockResolvedValue(1);

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockPushSubscriptionService.cleanupInvalidSubscriptions).toHaveBeenCalledWith([
        'https://fcm.googleapis.com/fcm/send/endpoint-2',
      ]);

      expect(mockResponseJson).toHaveBeenCalledWith({
        message: 'Test notification sent to all active subscribers',
        totalSubscribers: 2,
        sent: 1,
        failed: 1,
        invalidEndpoints: 1,
        deliveryRate: '50.00%',
        payload: {
          title: 'Test Notification to All Users 🔔',
          body: 'This is a test push notification sent to all active subscribers!',
          url: '/',
        },
      });
    });

    it('should handle service errors gracefully', async () => {
      mockPushSubscriptionService.getSubscriptions.mockRejectedValue(new Error('Database error'));

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponseStatus).toHaveBeenCalledWith(500);
      expect(mockResponseJson).toHaveBeenCalledWith({
        error: 'Failed to send test notification to all subscribers',
        code: 'BROADCAST_TEST_ERROR',
      });
    });
  });

  describe('Delivery Rate Calculation', () => {
    beforeEach(() => {
      mockRequest = {
        body: {},
        user: { id: 'admin-user-id' },
      } as any;
      
      // Mock prisma to return admin user
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'admin-user-id',
        userType: 'ADMIN',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
      });
    });

    it('should calculate correct delivery rate for successful sends', async () => {
      const mockSubscriptions = Array.from({ length: 10 }, (_, i) => ({
        id: `sub-${i}`,
        userId: `user-${i}`,
        endpoint: `https://fcm.googleapis.com/fcm/send/endpoint-${i}`,
        p256dh: `key-${i}`,
        auth: `auth-${i}`,
        enabled: true,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      }));

      const mockBulkResult = {
        sent: 8,
        failed: 2,
        invalidEndpoints: [],
        errors: [],
      };

      mockPushSubscriptionService.getSubscriptions.mockResolvedValue(mockSubscriptions);
      mockPushSubscriptionService.toPushSubscriptionDataArray.mockReturnValue(
        mockSubscriptions.map(sub => ({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }))
      );
      mockWebPushService.sendBulkNotifications.mockResolvedValue(mockBulkResult);
      mockPushSubscriptionService.cleanupInvalidSubscriptions.mockResolvedValue(0);

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryRate: '80.00%',
          totalSubscribers: 10,
          sent: 8,
          failed: 2,
        })
      );
    });

    it('should handle zero subscriptions correctly', async () => {
      mockPushSubscriptionService.getSubscriptions.mockResolvedValue([]);

      await pushController.sendTestNotificationToAll(mockRequest as Request, mockResponse as Response);

      expect(mockResponseStatus).toHaveBeenCalledWith(404);
    });
  });
});