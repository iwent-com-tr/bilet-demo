import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard';
import { rbac } from '../../middlewares/rbac';
import * as ctrl from './organizer.controller';

// ===== Router =====
const r = Router();

// Public list organizers — Admin only
r.get('/', authGuard.optional, rbac('ADMIN'), ctrl.list);

// Public get organizer public profile by id (safe information only)
r.get('/public/:id', authGuard.optional, ctrl.getPublicById);

// Public get organizer for search
r.get('/public/', authGuard.optional, ctrl.listPublic);

// Admin creates an organizer account (separate from public register)
r.post('/', authGuard.required, rbac('ADMIN'), ctrl.adminCreate);

// Public get organizer profile by id
r.get('/:id', ctrl.getById);

// Update organizer (self or admin). Self allowed via rbac self-check.
r.patch('/:id', authGuard.required, rbac('ADMIN', 'ORGANIZER'), ctrl.update);

// Soft delete — Admin only
r.delete('/:id', authGuard.required, rbac('ADMIN'), ctrl.remove);

// Approve organizer — Admin only
r.post('/:id/approve', authGuard.required, rbac('ADMIN'), ctrl.approve);

// Phone verification for organizers (authenticated organizers)
r.post('/verify/send', authGuard.required, rbac('ORGANIZER'), ctrl.sendVerificationCode);
r.post('/verify/confirm', authGuard.required, rbac('ORGANIZER'), ctrl.verifyPhoneCode);
r.get('/verify/status', authGuard.required, rbac('ORGANIZER'), ctrl.getVerificationStatus);
r.post('/verify/resend', authGuard.required, rbac('ORGANIZER'), ctrl.resendVerificationCode);

// Event report generation — Organizer only (for their own events)
r.get('/event/:eventId/report', authGuard.required, rbac('ORGANIZER'), ctrl.generateEventReport);

// Get events for a specific organizer (with filters) — Self or Admin access
r.get('/:organizerId/events', authGuard.required, ctrl.getOrganizerEvents);
// Send follow request
r.post('/follow/:id', authGuard.required, ctrl.sendFollowRequest);
r.delete('/follow/:id', authGuard.required, ctrl.cancelFollowRequest);

export default r;


