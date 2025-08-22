import { Router } from 'express';
import controller from './settings.controller';
import { authGuard } from '../../middlewares/authGuard';
import { rbac as requireRoles } from '../../middlewares/rbac';

const router = Router();
// Definitions (public – add auth if desired)
router.get('/definitions', controller.getDefinitions.bind(controller));
router.get('/definitions/sections/:sectionKey', controller.getSection.bind(controller));

// Me – requires auth
router.get('/me', authGuard.required, controller.getMe.bind(controller));
router.patch('/me', authGuard.required, controller.patchMe.bind(controller));

router.get('/me/notifications', authGuard.required, controller.getMyNotificationPrefs.bind(controller));
router.put('/me/notifications/:category', authGuard.required, controller.putMyNotificationPref.bind(controller));

router.get('/me/social', authGuard.required, controller.listMySocial.bind(controller));
router.post('/me/social/:provider/connect', authGuard.required, controller.connectMySocial.bind(controller));
router.delete('/me/social/:provider/disconnect', authGuard.required, controller.disconnectMySocial.bind(controller));

// Admin – per-user operations
router.get('/users/:userId/settings', authGuard.required, requireRoles('ADMIN'), controller.getUserSettings.bind(controller));
router.patch('/users/:userId/settings', authGuard.required, requireRoles('ADMIN'), controller.patchUserSettings.bind(controller));
router.get('/users/:userId/notifications', authGuard.required, requireRoles('ADMIN'), controller.getUserNotificationPrefs.bind(controller));
router.put('/users/:userId/notifications/:category', authGuard.required, requireRoles('ADMIN'), controller.putUserNotificationPref.bind(controller));

export default router;
