import { Router } from 'express';
import * as chatController from './chat.controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

// Event chat routes
router.get('/event/:eventId/messages', authGuard.required, chatController.getEventMessages);
router.get('/event/:eventId/participants', authGuard.required, chatController.getEventParticipants);

// User's chat lists
router.get('/my-event-chats', authGuard.required, chatController.getMyEventChats);
router.get('/my-private-chats', authGuard.required, chatController.getMyPrivateChats);

// Private message routes (for future implementation)
router.get('/private/:userId/messages', authGuard.required, chatController.getPrivateMessages);
router.post('/private/:userId/messages', authGuard.required, chatController.sendPrivateMessage);

export default router;
