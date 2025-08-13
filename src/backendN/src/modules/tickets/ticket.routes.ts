import { Router } from 'express';
import * as ctrl from './ticket.controller';
import { authGuard } from '../../middlewares/authGuard';
import { rbac } from '../../middlewares/rbac';

const r = Router();

// List tickets — Admin only
r.get('/', authGuard.required, rbac('ADMIN'), ctrl.list);

// Create ticket — authenticated user (purchase)
r.post('/', authGuard.required, ctrl.create);

// Attended events count for current user
r.get('/attended/count', authGuard.required, ctrl.getMyAttendedCount);

// Get current user's tickets
r.get('/my-tickets', authGuard.required, ctrl.getMyTickets);

// Get ticket by id — owner or admin (enforced in future via rbac self-check + controller)
r.get('/:id', authGuard.required, ctrl.getById);

// Update status — Organizer/Admin
r.patch('/:id', authGuard.required, rbac('ADMIN', 'ORGANIZER'), ctrl.updateStatus);

// Verify ticket — Organizer/Admin
r.post('/:id/verify', authGuard.required, rbac('ADMIN', 'ORGANIZER'), ctrl.verify);

// Send ticket to unregistered participant email — authenticated user
r.post('/send-unregistered', authGuard.required, ctrl.sendTicketUnregistered);

export default r;


