import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { PushController } from './push.controller.js';
import { 
  requireAdmin, 
  requireAdminOrOrganizer, 
  notificationRateLimit,
  broadcastRateLimit,
  csrfProtection,
  sanitizePayload
} from './push.middleware.js';

const router = Router();
const pushController = new PushController();

// Admin/Organizer only endpoint for manual event notifications
router.post(
  '/:eventId/notify', 
  notificationRateLimit,
  csrfProtection,
  sanitizePayload,
  authGuard.required, 
  requireAdminOrOrganizer,
  pushController.sendEventNotification
);

// Admin only endpoint for bulk notifications to all users
router.post(
  '/notify/broadcast', 
  broadcastRateLimit,
  csrfProtection,
  sanitizePayload,
  authGuard.required, 
  requireAdmin,
  pushController.sendBroadcastNotification
);

export default router;