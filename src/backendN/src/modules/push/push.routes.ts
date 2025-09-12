import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authGuard } from '../../middlewares/authGuard.js';
import { PushController } from './push.controller.js';
import { createHealthRoutes } from './health.routes.js';

import { 
  subscriptionRateLimit, 
  csrfProtection, 
  sanitizePayload, 
  validateSubscriptionOwnership 
} from './push.middleware.js';

export function createPushRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const pushController = new PushController();

  // Public endpoint to get VAPID public key (no rate limiting needed)
  router.get('/public-key', pushController.getPublicKey);

  // Protected endpoints requiring authentication with security middleware
  router.post('/subscribe', 
    subscriptionRateLimit,
    csrfProtection,
    sanitizePayload,
    authGuard.required, 
    pushController.subscribe
  );
  
  router.delete('/unsubscribe', 
    subscriptionRateLimit,
    csrfProtection,
    sanitizePayload,
    authGuard.required, 
    validateSubscriptionOwnership,
    pushController.unsubscribe
  );
  
  router.get('/subscriptions', 
    authGuard.required, 
    pushController.getUserSubscriptions
  );

  router.post('/test', 
    subscriptionRateLimit,
    csrfProtection,
    authGuard.required, 
    pushController.sendTestNotification
  );

  // Admin-only endpoint to send test notification to all active subscribers
  router.post('/test-all', 
    subscriptionRateLimit,
    csrfProtection,
    sanitizePayload,
    authGuard.required, 
    pushController.sendTestNotificationToAll
  );

  // Health and monitoring endpoints
  router.use('/health', createHealthRoutes(prisma));

  // Development endpoints removed for production

  return router;
}

// Backward compatibility - create with default prisma instance
const router = Router();
const pushController = new PushController();

// Apply security middleware to all routes
router.get('/public-key', pushController.getPublicKey);

router.post('/subscribe', 
  subscriptionRateLimit,
  sanitizePayload,
  authGuard.required, 
  pushController.subscribe
);

router.delete('/unsubscribe', 
  subscriptionRateLimit,
  csrfProtection,
  sanitizePayload,
  authGuard.required, 
  validateSubscriptionOwnership,
  pushController.unsubscribe
);

router.get('/subscriptions', 
  authGuard.required, 
  pushController.getUserSubscriptions
);

router.post('/test', 
  subscriptionRateLimit,
  authGuard.required, 
  pushController.sendTestNotification
);

router.post('/test-all', 
  subscriptionRateLimit,
  sanitizePayload,
  authGuard.required, 
  pushController.sendTestNotificationToAll
);

export default router;