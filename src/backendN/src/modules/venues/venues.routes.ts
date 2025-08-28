import { Router } from "express";
import * as ctrl from "./venues.controller";
import { authGuard } from "../../middlewares/authGuard";
import { uploadBanner, uploadBannerResponse } from "../publicServices/multer.service";

const router = Router();

router.post('/upload-banner', authGuard.required, uploadBanner.single('banner'), uploadBannerResponse);

router.get('/slug/:slug', authGuard.optional, ctrl.getBySlug);

router.post('/', authGuard.required, uploadBanner.single('banner'), ctrl.create);
router.get('/', authGuard.optional, ctrl.list);
router.get('/:id', authGuard.optional, ctrl.getById);
router.put('/:id', authGuard.required, uploadBanner.single('banner'), ctrl.update);
router.delete('/:id', authGuard.required, ctrl.remove);

// Send follow request
router.post('/follow/:id', authGuard.required, ctrl.sendFollowRequest);
router.delete('/follow/:id', authGuard.required, ctrl.cancelFollowRequest);

export default router;