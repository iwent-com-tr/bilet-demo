import { Router } from 'express';
import * as ctrl from './event.controller';
import { authGuard } from '../../middlewares/authGuard';
import { uploadBanner } from './event.upload';

const r = Router();

// Public list and get
r.get('/', ctrl.list);
r.get('/slug/:slug', ctrl.getBySlug);
r.get('/:id', ctrl.getById);

// Get events by organizer ID for organizer dashboard
r.get('/organizer/:organizerId', authGuard.required, ctrl.getEventsByOrganizer);

// Banner upload endpoint — for standalone banner uploads
r.post('/upload-banner', authGuard.required, uploadBanner.single('banner'), ctrl.uploadBanner);

// Create — Organizer or Admin only (checked inside controller)
// Accept multipart with optional `banner` file
r.post('/', authGuard.required, uploadBanner.single('banner'), ctrl.create);

// Update and delete — Owner organizer or Admin (checked inside controller)
r.patch('/:id', authGuard.required, ctrl.update);
r.delete('/:id', authGuard.required, ctrl.remove);

// Publish / Unpublish — Owner organizer or Admin
r.post('/:id/publish', authGuard.required, ctrl.publish);
r.post('/:id/unpublish', authGuard.required, ctrl.unpublish);

// Details: public GET, protected PUT
r.get('/:id/details', ctrl.getDetails);
r.put('/:id/details', authGuard.required, ctrl.updateDetails);

// Stats: protected GET for organizer and admin
r.get('/:id/stats', authGuard.required, ctrl.getEventStats);

export default r;


