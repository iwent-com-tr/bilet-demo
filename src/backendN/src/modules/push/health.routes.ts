import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { HealthController } from './health.controller.js';
import { authGuard } from '../../middlewares/authGuard.js';
import { rbac } from '../../middlewares/rbac.js';

export function createHealthRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const healthController = new HealthController(prisma);

  // Public health check endpoint (basic status)
  router.get('/health', async (req, res) => {
    try {
      res.json({
        status: 'success',
        message: 'Push notification system is operational',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'System health check failed',
      });
    }
  });

  // Protected endpoints - require authentication
  router.use(authGuard.required);

  // Admin-only endpoints - require admin role
  const adminOnly = rbac('ADMIN');

  // System health endpoints
  router.get('/system', healthController.getSystemHealth.bind(healthController));
  router.get('/queue', healthController.getQueueHealth.bind(healthController));
  router.get('/worker', healthController.getWorkerStatus.bind(healthController));
  router.get('/subscriptions', healthController.getSubscriptionStats.bind(healthController));

  // Metrics endpoints
  router.get('/metrics', healthController.getMetrics.bind(healthController));
  router.get('/errors', healthController.getErrorStats.bind(healthController));
  router.get('/dashboard', healthController.getDashboardData.bind(healthController));

  // Export functionality
  router.get('/export', healthController.exportMetrics.bind(healthController));

  // Dashboard UI
  router.get('/dashboard-ui', (req, res) => {
    res.sendFile('dashboard.html', { root: __dirname });
  });

  // Admin-only maintenance endpoints
  router.post('/maintenance', adminOnly, healthController.performMaintenance.bind(healthController));
  router.post('/alerts/clear', adminOnly, healthController.clearAlerts.bind(healthController));
  router.post('/errors/reset', adminOnly, healthController.resetErrorStats.bind(healthController));

  return router;
}