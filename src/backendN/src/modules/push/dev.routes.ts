import { Router } from 'express';
import { DevController } from './dev.controller.js';

/**
 * Development routes for push notification testing
 * Only available in development environment
 */
export function createDevRoutes(): Router {
  const router = Router();
  const devController = new DevController();

  // Check if we're in development environment
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  
  if (!isDevelopment) {
    // Return empty router in production
    return router;
  }

  // Development dashboard
  router.get('/dashboard', devController.getDashboard);

  // Test templates
  router.get('/templates', devController.getTestTemplates);

  // Send test notification
  router.post('/test-notification', devController.sendTestNotification);

  // Test user subscriptions
  router.post('/test-subscriptions', devController.testUserSubscriptions);

  // Mock service configuration
  router.post('/mock-config', devController.configureMockService);

  // Debug payload
  router.post('/debug-payload', devController.debugPayload);

  // Development statistics
  router.get('/stats', devController.getDevStats);

  return router;
}

export default createDevRoutes();