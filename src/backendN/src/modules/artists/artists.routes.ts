import { Router } from "express";
import * as ctrl from "./artists.controller";
import { authGuard } from "../../middlewares/authGuard";
import { uploadBanner, uploadBannerResponse } from "../publicServices/multer.service";
import { noCacheUserDependent } from "../../middlewares/noCacheUserDependant";

const router = Router();

router.post('/upload-banner', authGuard.required, uploadBanner.single('banner'), uploadBannerResponse);

router.get('/slug/:slug', noCacheUserDependent, authGuard.optional, ctrl.getBySlug);

router.post('/', authGuard.required, uploadBanner.single('banner'), ctrl.create);
router.get('/', noCacheUserDependent, authGuard.optional, ctrl.list);
router.get('/popular', noCacheUserDependent, authGuard.optional, ctrl.getPopularArtists);
router.get('/:id', noCacheUserDependent, authGuard.optional, ctrl.getById);
router.put('/:id', authGuard.required, uploadBanner.single('banner'), ctrl.update);
router.delete('/:id', authGuard.required, ctrl.remove);

// Send follow request
router.post('/follow/:id', authGuard.required, ctrl.sendFollowRequest);
router.delete('/follow/:id', authGuard.required, ctrl.cancelFollowRequest);

export default router;
