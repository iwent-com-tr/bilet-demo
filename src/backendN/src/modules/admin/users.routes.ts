import { Router } from 'express';
import controller from './users.controller';
import { authGuard } from '../../middlewares/authGuard';
import { adminRbac } from '../../middlewares/adminRbac';
import { auditLog } from '../audit/auditLog.middleware';

const router = Router();

router.get(
  '/',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('user', 'list_users'),
  controller.listUsers
);

router.post(
  '/export',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT'),
  auditLog('user', 'export_users'),
  controller.exportUsers
);

// Organizer management routes - MUST be before /:id route
router.get(
  '/organizers',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('organizer', 'list_organizers'),
  controller.listOrganizers
);

router.post(
  '/organizers/export',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT'),
  auditLog('organizer', 'export_organizers'),
  controller.exportOrganizers
);

router.get(
  '/organizers/:id',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('organizer', 'view_organizer'),
  controller.getOrganizerById
);

router.patch(
  '/organizers/:id/approval',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT'),
  auditLog('organizer', 'update_organizer_approval'),
  controller.updateOrganizerApproval
);

// Generic user routes - MUST be after specific routes
router.get(
  '/:id',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('user', 'view_user'),
  controller.getUserById
);

router.get(
  '/:id/attended-events',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('user', 'view_user_attended_events'),
  controller.getUserAttendedEvents
);

router.patch(
  '/:id/roles',
  authGuard.required,
  adminRbac('ADMIN'),
  auditLog('user', 'update_user_roles'),
  controller.updateUserRoles
);

export default router;
