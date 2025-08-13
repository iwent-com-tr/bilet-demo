import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard';
import * as C from './friendship.controller';

const router = Router();

// All routes require authenticated user
router.use(authGuard.required);

// Friendships
router.get('/', C.list);
router.post('/', C.request);
router.post('/:id/accept', C.accept);
router.post('/:id/reject', C.reject);
router.delete('/:id', C.remove);

// Friend count
router.get('/count', C.count);

// Blocks
router.get('/block', C.listBlocks);
router.post('/block', C.createBlock);
router.delete('/block/:id', C.removeBlock);

// Messages
router.get('/message', C.listMessages);
router.post('/message', C.sendMessage);

export default router;


