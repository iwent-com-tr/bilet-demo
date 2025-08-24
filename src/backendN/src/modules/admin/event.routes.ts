import { Router } from 'express';
import controller from './event.controller';
import { authGuard } from '../../middlewares/authGuard';
import { adminRbac } from '../../middlewares/adminRbac';
import { auditLog } from '../audit/auditLog.middleware';

const router = Router();

// List events with filters
router.get(
  '/',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('event', 'list_events'),
  controller.listEvents
);

// Export events to XLSX
router.post(
  '/export',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT'),
  auditLog('event', 'export_events'),
  controller.exportEvents
);

// Get single event with computed stats
router.get(
  '/:id',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('event', 'view_event'),
  controller.getEventById
);

// Dedicated stats endpoint
router.get(
  '/:id/stats',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('event', 'view_event_stats'),
  controller.getEventStats
);

export default router;

