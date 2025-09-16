import { Router, Request, Response } from 'express';
import ServiceIntegrationManager from '../lib/service-integration-manager';
import { prisma } from '../lib/prisma';

const router = Router();
const serviceManager = new ServiceIntegrationManager(prisma);

/**
 * GET /health - Basic health check
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /health/detailed - Comprehensive service health
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  try {
    const health = await serviceManager.performHealthCheck();
    const statusCode = health.overall === 'critical' ? 503 : 200;
    
    res.status(statusCode).json({
      status: health.overall,
      timestamp: health.timestamp,
      services: health.services,
      version: process.env.VERSION || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health/services - Services by category
 */
router.get('/services', async (_req: Request, res: Response) => {
  try {
    const categorized = serviceManager.getServicesByCategory();
    
    res.json({
      timestamp: new Date().toISOString(),
      categories: categorized
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get service categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /health/service/:name - Individual service health
 */
router.get('/service/:name', async (req: Request, res: Response) => {
  try {
    const serviceName = req.params.name;
    const service = serviceManager.getServiceHealth(serviceName);
    
    if (!service) {
      res.status(404).json({
        error: 'Service not found',
        availableServices: Object.keys(serviceManager.getServicesHealth().services)
      });
      return;
    }
    
    res.json({
      service: serviceName,
      ...service,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get service health',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;