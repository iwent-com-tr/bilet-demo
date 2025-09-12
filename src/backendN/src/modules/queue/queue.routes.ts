import { Router } from 'express';
import { queueController } from './queue.controller.js';
import { authGuard } from '../../middlewares/authGuard.js';
import { rbac } from '../../middlewares/rbac.js';

const router = Router();

// Public health check endpoint (no auth required)
router.get('/health', queueController.getHealth);

// Protected endpoints (require authentication)
router.use(authGuard.required);

// Queue statistics (authenticated users can view)
router.get('/stats', queueController.getStats);

// Admin-only endpoints (require admin role)
router.use(rbac('ADMIN'));

// Retry failed jobs
router.post('/retry-failed', queueController.retryFailedJobs);

// Clean old jobs
router.delete('/clean', queueController.cleanOldJobs);

// Pause/resume queue
router.post('/pause', queueController.pauseQueue);
router.post('/resume', queueController.resumeQueue);

export default router;