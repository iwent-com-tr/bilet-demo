// src/modules/users/user.routes.ts
import { Router } from 'express';
import * as ctrl from './user.controller';
import { authGuard } from '../../middlewares/authGuard';
import { rbac } from '../../middlewares/rbac';

const r = Router();

// Admin only routes
r.get('/users', authGuard.required, rbac('ADMIN'), ctrl.list);
r.patch('/users/:id', authGuard.required, rbac('ADMIN'), ctrl.adminUpdate);
r.delete('/users/:id', authGuard.required, rbac('ADMIN'), ctrl.remove);

// User profile routes
r.get('/me', authGuard.required, ctrl.me);
r.patch('/me', authGuard.required, ctrl.updateMe);
// Points of current user
r.get('/points', authGuard.required, ctrl.getMyPoints);

// Phone verification routes (authenticated users only)
r.post('/verify/send', authGuard.required, ctrl.sendVerificationCode);
r.post('/verify/confirm', authGuard.required, ctrl.verifyPhoneCode);
r.get('/verify/status', authGuard.required, ctrl.getVerificationStatus);
r.post('/verify/resend', authGuard.required, ctrl.resendVerificationCode);
r.put('/phone', authGuard.required, ctrl.updatePhoneNumber);

// Search users (available to all authenticated users)
r.get('/search', authGuard.required, ctrl.searchUsers);

// Favorites (place BEFORE dynamic :id routes)
r.get('/favorites', authGuard.required, ctrl.listFavorites);
r.post('/favorites', authGuard.required, ctrl.addFavorite);
r.delete('/favorites/:eventId', authGuard.required, ctrl.removeFavorite);

// Follow/Unfollow routes (place BEFORE dynamic :id routes)
r.get('/following', authGuard.required, ctrl.getFollowing);
r.post('/follow/artist/:artistId', authGuard.required, ctrl.followArtist);
r.delete('/follow/artist/:artistId', authGuard.required, ctrl.unfollowArtist);
r.post('/follow/venue/:venueId', authGuard.required, ctrl.followVenue);
r.delete('/follow/venue/:venueId', authGuard.required, ctrl.unfollowVenue);
r.post('/follow/organizer/:organizerId', authGuard.required, ctrl.followOrganizer);
r.delete('/follow/organizer/:organizerId', authGuard.required, ctrl.unfollowOrganizer);
r.get('/follow-status/:entityType/:entityId', authGuard.optional, ctrl.checkFollowStatus);

// Get user by ID (self or admin access)
r.get('/:id', authGuard.required, rbac('ADMIN', 'USER'), ctrl.getById);

// Get user by ID with relationship status (for profile views)
r.get('/:id/profile', authGuard.optional, ctrl.getByIdWithRelationship);

// Get user stats (self or admin access)
r.get('/:id/stats', authGuard.required, rbac('ADMIN', 'USER'), ctrl.getUserStats);

// Get online status for multiple users
r.post('/online-status', 
  authGuard.required,
  ctrl.getOnlineStatus
);

export default r;