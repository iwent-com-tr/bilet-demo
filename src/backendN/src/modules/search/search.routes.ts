import { Router } from 'express';
import * as ctrl from './search.controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

router.get('/events', authGuard.optional, ctrl.searchEvents);
router.get('/artists', authGuard.optional, ctrl.searchArtists);
router.get('/venues', authGuard.optional, ctrl.searchVenues);
router.get('/organizers', authGuard.optional, ctrl.searchOrganizers);

export default router;