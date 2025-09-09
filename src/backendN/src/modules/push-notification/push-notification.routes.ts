import { Router } from 'express';
import { PushNotificationController } from './push-notification.controller';
import { authGuard } from '../../middlewares/authGuard';
import { rateLimiter } from '../../middlewares/rateLimiter';

const router = Router();
const pushController = new PushNotificationController();

// Rate limiters for different endpoint types
const subscriptionLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: 'Too many subscription requests, please try again later',
});

const webhookLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 webhook requests per minute
  message: 'Webhook rate limit exceeded',
});

const adminLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 admin requests per window
  message: 'Too many admin requests, please try again later',
});

const testLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 test notifications per minute per user
  message: 'Too many test notifications, please wait before sending more',
});

// ======================
// User Subscription Management
// ======================

/**
 * Sync OneSignal subscription with backend
 * POST /api/v1/push/sync
 */
router.post('/sync', 
  subscriptionLimiter,
  authGuard.required,
  pushController.syncSubscription.bind(pushController)
);

/**
 * Get user subscription details
 * GET /api/v1/push/subscription
 */
router.get('/subscription',
  subscriptionLimiter,
  authGuard.required,
  pushController.getSubscription.bind(pushController)
);

/**
 * Remove user subscription
 * DELETE /api/v1/push/subscription
 */
router.delete('/subscription',
  subscriptionLimiter,
  authGuard.required,
  pushController.removeSubscription.bind(pushController)
);

/**
 * Update user tags for segmentation
 * POST /api/v1/push/tags
 */
router.post('/tags',
  subscriptionLimiter,
  authGuard.required,
  pushController.updateTags.bind(pushController)
);

// ======================
// OneSignal Webhooks
// ======================

/**
 * OneSignal webhooks - These endpoints receive notifications from OneSignal
 * when events occur (notification displayed, clicked, or dismissed)
 * 
 * Configure these URLs in your OneSignal dashboard:
 * - Displayed: https://yourdomain.com/api/v1/onesignal/display
 * - Clicked: https://yourdomain.com/api/v1/onesignal/clicked  
 * - Dismissed: https://yourdomain.com/api/v1/onesignal/dismissed
 * 
 * Make sure to set ONESIGNAL_WEBHOOK_SECRET in your .env file for security
 */
router.post('/onesignal/display',
  webhookLimiter,
  pushController.handleWebhook.bind(pushController)
);

router.post('/onesignal/clicked',
  webhookLimiter,
  pushController.handleWebhook.bind(pushController)
);

router.post('/onesignal/dismissed',
  webhookLimiter,
  pushController.handleWebhook.bind(pushController)
);

// ======================
// Ticket Holder Notifications
// ======================

/**
 * Send notification to event ticket holders
 * POST /api/v1/push/notify/ticket-holders
 */
router.post('/notify/ticket-holders',
  adminLimiter,
  authGuard.required,
  pushController.notifyTicketHolders.bind(pushController)
);

/**
 * Send event reminder to ticket holders
 * POST /api/v1/push/notify/event-reminder
 */
router.post('/notify/event-reminder',
  adminLimiter,
  authGuard.required,
  pushController.sendEventReminder.bind(pushController)
);

/**
 * Send notification to segmented users
 * POST /api/v1/push/notify/segment
 */
router.post('/notify/segment',
  adminLimiter,
  authGuard.required,
  pushController.notifySegment.bind(pushController)
);

// ======================
// Admin Endpoints
// ======================

/**
 * Get ticket holder statistics
 * GET /api/v1/admin/push/ticket-stats
 */
router.get('/admin/push/ticket-stats',
  adminLimiter,
  authGuard.required,
  pushController.getTicketHolderStats.bind(pushController)
);

/**
 * Get notification statistics
 * GET /api/v1/admin/push/stats
 */
router.get('/admin/push/stats',
  adminLimiter,
  authGuard.required,
  pushController.getStats.bind(pushController)
);

/**
 * Health check endpoint
 * GET /api/v1/admin/push/health
 */
router.get('/admin/push/health',
  adminLimiter,
  pushController.healthCheck.bind(pushController)
);

/**
 * Send test notification
 * POST /api/v1/admin/push/test
 */
router.post('/admin/push/test',
  testLimiter,
  authGuard.required,
  pushController.sendTestNotification.bind(pushController)
);

// ======================
// API Documentation
// ======================

/**
 * API Documentation for Push Notification endpoints
 * GET /api/v1/push/docs
 */
router.get('/docs', (req, res) => {
  res.json({
    title: 'Push Notification API Documentation',
    version: '1.0.0',
    description: 'OneSignal v16 integration for bilet-demo platform',
    endpoints: {
      user: {
        'POST /api/v1/push/sync': 'Sync OneSignal subscription with backend',
        'GET /api/v1/push/subscription': 'Get user subscription details',
        'DELETE /api/v1/push/subscription': 'Remove user subscription',
        'POST /api/v1/push/tags': 'Update user tags for segmentation',
      },
      notifications: {
        'POST /api/v1/push/notify/ticket-holders': 'Send notification to event ticket holders',
        'POST /api/v1/push/notify/event-reminder': 'Send event reminder to ticket holders',
        'POST /api/v1/push/notify/segment': 'Send notification to segmented users (admin only)',
      },
      webhooks: {
        'POST /api/v1/onesignal/display': 'OneSignal webhook for notification displayed',
        'POST /api/v1/onesignal/clicked': 'OneSignal webhook for notification clicked',
        'POST /api/v1/onesignal/dismissed': 'OneSignal webhook for notification dismissed',
      },
      admin: {
        'GET /api/v1/admin/push/stats': 'Get notification statistics',
        'GET /api/v1/admin/push/health': 'Health check endpoint',
        'GET /api/v1/admin/push/ticket-stats': 'Get ticket holder statistics',
        'POST /api/v1/admin/push/test': 'Send test notification (admin only)',
      },
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      required: true,
      exceptions: ['webhook endpoints'],
    },
    rateLimits: {
      subscription: '100 requests per 15 minutes',
      webhooks: '1000 requests per minute',
      admin: '50 requests per 15 minutes',
      test: '10 requests per minute',
    },
  });
});

export default router;