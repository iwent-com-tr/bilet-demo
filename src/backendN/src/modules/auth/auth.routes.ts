// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import * as ctrl from './auth.controller';
import * as citiesCtrl from './cities.controller';
import { authGuard } from '../../middlewares/authGuard';

const r = Router();

// User authentication
r.post('/register', ctrl.register);
r.post('/login', ctrl.login);
r.post('/refresh', authGuard.optional, ctrl.refresh); // optional: to bind refresh to a user context
r.post('/logout', authGuard.required, ctrl.logout);

// Organizer authentication
r.post('/register-organizer', ctrl.registerOrganizer);
r.post('/login-organizer', ctrl.loginOrganizer);
r.get('/organizer-me', authGuard.required, ctrl.organizerMe);

// Profile management
r.get('/me', authGuard.required, ctrl.me);
r.put('/profile', authGuard.required, ctrl.updateProfile);

// City and county data
r.get('/cities', citiesCtrl.getCitiesList);
r.get('/counties', citiesCtrl.getCounties);

export default r;
