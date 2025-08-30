import { Router } from 'express';
import * as chatController from './chat.controller';
import * as moderationController from './moderation.controller';
import { authGuard } from '../../middlewares/authGuard';

const router = Router();

// Event chat routes
router.get('/event/:eventId/messages', authGuard.required, chatController.getEventMessages);
router.post('/event/:eventId/messages', authGuard.required, chatController.sendEventMessage);
router.get('/event/:eventId/participants', authGuard.required, chatController.getEventParticipants);

// User's chat lists
router.get('/my-event-chats', authGuard.required, chatController.getMyEventChats);
router.get('/my-private-chats', authGuard.required, chatController.getMyPrivateChats);

// Private message routes (for future implementation)
router.get('/private/:userId/messages', authGuard.required, chatController.getPrivateMessages);
router.post('/private/:userId/messages', authGuard.required, chatController.sendPrivateMessage);

// Moderation routes (event organizers only)
router.delete('/message/:messageId', authGuard.required, moderationController.deleteMessage);
router.post('/event/:eventId/mute/:userId', authGuard.required, moderationController.muteUser);
router.delete('/event/:eventId/mute/:userId', authGuard.required, moderationController.unmuteUser);
router.post('/event/:eventId/ban/:userId', authGuard.required, moderationController.banUser);
router.get('/event/:eventId/muted-users', authGuard.required, moderationController.getMutedUsers);
router.get('/event/:eventId/moderation-log', authGuard.required, moderationController.getModerationLog);

export default router;
