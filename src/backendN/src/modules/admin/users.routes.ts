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

router.get(
  '/:id',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT', 'READONLY'),
  auditLog('user', 'view_user'),
  controller.getUserById
);

router.post(
  '/export',
  authGuard.required,
  adminRbac('ADMIN', 'SUPPORT'),
  auditLog('user', 'export_users'),
  controller.exportUsers
);

export default router;
