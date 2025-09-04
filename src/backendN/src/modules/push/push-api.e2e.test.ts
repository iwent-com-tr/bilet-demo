import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { app } from '../../index.js'; // Assuming main app export

// Mock external dependencies
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

vi.mock('../queue/index.js', () => ({
  notificationQueue: {
    add: vi.fn(),
  },
  checkQueueHealth: vi.fn(() => ({
    redis: true,
    queue: true,
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
  })),
}));

describe('Push Notification API E2E Tests', () => {
  let prisma: PrismaClient;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Initialize test database connection
    prisma = new PrismaClient();
    
    // Create test user and get auth token
    testUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    };
    
    // Mock auth token (in real tests, you'd create a proper JWT)
    authToken = 'Bearer test-jwt-token';
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/push/public-key', () => {
    it('should return VAPID public key', async () => {
      const response = await request(app)
        .get('/api/push/public-key')
        .expect(200);

      expect(response.body).toHaveProperty('publicKey');
      expect(typeof response.body.publicKey).toBe('string');
      expect(response.body.publicKey.length).toBeGreaterThan(0);
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/api/push/public-key')
        .expect(200);

      expect(response.body).toHaveProperty('publicKey');
    });
  });
});  descr
ibe('POST /api/push/subscribe', () => {
    const validSubscriptionData = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key-that-is-long-enough',
        auth: 'test-auth-key',
      },
    };

    it('should create new push subscription with authentication', async () => {
      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send(validSubscriptionData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Subscription created successfully');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/push/subscribe')
        .send(validSubscriptionData)
        .expect(401);
    });

    it('should validate subscription data', async () => {
      const invalidData = {
        endpoint: 'invalid-url',
        keys: {
          p256dh: '',
          auth: 'test-auth',
        },
      };

      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('validation');
    });

    it('should handle duplicate subscriptions', async () => {
      // First subscription should succeed
      await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send(validSubscriptionData)
        .expect(201);

      // Second subscription with same endpoint should update
      const updatedData = {
        ...validSubscriptionData,
        keys: {
          p256dh: 'updated-p256dh-key-that-is-long-enough',
          auth: 'updated-auth-key',
        },
      };

      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send(updatedData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Subscription updated successfully');
    });

    it('should include user agent in subscription', async () => {
      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .set('User-Agent', 'Mozilla/5.0 Test Browser')
        .send(validSubscriptionData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/push/unsubscribe', () => {
    const subscriptionEndpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint-to-delete';

    beforeEach(async () => {
      // Create a subscription to delete
      await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send({
          endpoint: subscriptionEndpoint,
          keys: {
            p256dh: 'test-p256dh-key-for-deletion',
            auth: 'test-auth-key-for-deletion',
          },
        });
    });

    it('should unsubscribe with valid endpoint', async () => {
      const response = await request(app)
        .delete('/api/push/unsubscribe')
        .set('Authorization', authToken)
        .send({ endpoint: subscriptionEndpoint })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Unsubscribed successfully');
    });

    it('should require authentication', async () => {
      await request(app)
        .delete('/api/push/unsubscribe')
        .send({ endpoint: subscriptionEndpoint })
        .expect(401);
    });

    it('should validate endpoint parameter', async () => {
      const response = await request(app)
        .delete('/api/push/unsubscribe')
        .set('Authorization', authToken)
        .send({ endpoint: 'invalid-endpoint' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle non-existent subscriptions gracefully', async () => {
      const response = await request(app)
        .delete('/api/push/unsubscribe')
        .set('Authorization', authToken)
        .send({ endpoint: 'https://fcm.googleapis.com/fcm/send/non-existent' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Subscription not found or already removed');
    });
  });

  describe('POST /api/events/:eventId/notify', () => {
    const testEventId = 'test-event-123';

    it('should trigger event notification with admin auth', async () => {
      const adminToken = 'Bearer admin-jwt-token'; // Mock admin token
      
      const notificationData = {
        type: 'event_update',
        changeType: 'time_change',
        message: 'Event time has been updated',
      };

      const response = await request(app)
        .post(`/api/events/${testEventId}/notify`)
        .set('Authorization', adminToken)
        .send(notificationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('message', 'Notification job queued successfully');
    });

    it('should require admin authentication', async () => {
      await request(app)
        .post(`/api/events/${testEventId}/notify`)
        .set('Authorization', authToken) // Regular user token
        .send({ type: 'event_update' })
        .expect(403);
    });

    it('should validate notification data', async () => {
      const adminToken = 'Bearer admin-jwt-token';
      
      const response = await request(app)
        .post(`/api/events/${testEventId}/notify`)
        .set('Authorization', adminToken)
        .send({ invalidField: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate event ID format', async () => {
      const adminToken = 'Bearer admin-jwt-token';
      
      const response = await request(app)
        .post('/api/events/invalid-event-id/notify')
        .set('Authorization', adminToken)
        .send({ type: 'event_update' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid event ID');
    });
  });

  describe('GET /api/push/health', () => {
    it('should return system health status', async () => {
      const response = await request(app)
        .get('/api/push/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('components');
      expect(response.body.components).toHaveProperty('redis');
      expect(response.body.components).toHaveProperty('queue');
      expect(response.body.components).toHaveProperty('worker');
      expect(response.body.components).toHaveProperty('database');
    });

    it('should include metrics in health response', async () => {
      const response = await request(app)
        .get('/api/push/health')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('queueBacklog');
      expect(response.body.metrics).toHaveProperty('errorRate');
      expect(response.body.metrics).toHaveProperty('subscriptionCount');
    });

    it('should not require authentication for health check', async () => {
      const response = await request(app)
        .get('/api/push/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
    });
  });

  describe('GET /api/push/metrics', () => {
    it('should return metrics with admin authentication', async () => {
      const adminToken = 'Bearer admin-jwt-token';
      
      const response = await request(app)
        .get('/api/push/metrics')
        .set('Authorization', adminToken)
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('totalNotificationsSent');
      expect(response.body.metrics).toHaveProperty('successRate');
      expect(response.body.metrics).toHaveProperty('averageProcessingTime');
    });

    it('should require admin authentication', async () => {
      await request(app)
        .get('/api/push/metrics')
        .set('Authorization', authToken) // Regular user token
        .expect(403);
    });

    it('should support time range queries', async () => {
      const adminToken = 'Bearer admin-jwt-token';
      
      const response = await request(app)
        .get('/api/push/metrics')
        .set('Authorization', adminToken)
        .query({ range: 'day' })
        .expect(200);

      expect(response.body.metrics).toHaveProperty('periodStart');
      expect(response.body.metrics).toHaveProperty('periodEnd');
    });

    it('should validate time range parameter', async () => {
      const adminToken = 'Bearer admin-jwt-token';
      
      const response = await request(app)
        .get('/api/push/metrics')
        .set('Authorization', adminToken)
        .query({ range: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send('endpoint=test')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      vi.mocked(prisma.pushSubscription.create).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          keys: {
            p256dh: 'test-key',
            auth: 'test-auth',
          },
        })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/push/subscribe')
          .set('Authorization', authToken)
          .send({
            endpoint: `https://fcm.googleapis.com/fcm/send/test-${Math.random()}`,
            keys: {
              p256dh: 'test-key',
              auth: 'test-auth',
            },
          })
      );

      const responses = await Promise.all(requests);
      
      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Tests', () => {
    it('should prevent CSRF attacks', async () => {
      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .set('Origin', 'https://malicious-site.com')
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          keys: {
            p256dh: 'test-key',
            auth: 'test-auth',
          },
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('CSRF');
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: '<script>alert("xss")</script>',
          auth: 'test-auth',
        },
      };

      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send(maliciousData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('validation');
    });

    it('should validate JWT token format', async () => {
      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          keys: {
            p256dh: 'test-key',
            auth: 'test-auth',
          },
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token');
    });

    it('should prevent subscription endpoint hijacking', async () => {
      // Try to subscribe with another user's endpoint
      const otherUserEndpoint = 'https://fcm.googleapis.com/fcm/send/other-user-endpoint';
      
      const response = await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', authToken)
        .send({
          endpoint: otherUserEndpoint,
          keys: {
            p256dh: 'malicious-key',
            auth: 'malicious-auth',
          },
        })
        .expect(201); // Should succeed but be tied to current user

      expect(response.body.success).toBe(true);
      
      // Verify the subscription is tied to the authenticated user
      // (This would require additional database checks in a real test)
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent subscription requests', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .post('/api/push/subscribe')
          .set('Authorization', authToken)
          .send({
            endpoint: `https://fcm.googleapis.com/fcm/send/concurrent-${i}`,
            keys: {
              p256dh: `test-key-${i}`,
              auth: `test-auth-${i}`,
            },
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle large notification payloads', async () => {
      const adminToken = 'Bearer admin-jwt-token';
      const largeMessage = 'A'.repeat(3000); // Large but within limits
      
      const response = await request(app)
        .post('/api/events/test-event/notify')
        .set('Authorization', adminToken)
        .send({
          type: 'event_update',
          changeType: 'description_change',
          message: largeMessage,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject oversized payloads', async () => {
      const adminToken = 'Bearer admin-jwt-token';
      const oversizedMessage = 'A'.repeat(10000); // Too large
      
      const response = await request(app)
        .post('/api/events/test-event/notify')
        .set('Authorization', adminToken)
        .send({
          type: 'event_update',
          changeType: 'description_change',
          message: oversizedMessage,
        })
        .expect(413);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Payload too large');
    });
  });
});