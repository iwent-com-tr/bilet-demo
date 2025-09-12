import { Request, Response, NextFunction } from 'express';
import { ChatModerationService } from './moderation.service';

export const deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    const moderatorId = (req as any).user?.id;

    await ChatModerationService.deleteMessage(messageId, moderatorId);
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const muteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, userId } = req.params;
    const { duration } = req.body; // in minutes
    const moderatorId = (req as any).user?.id;

    await ChatModerationService.muteUserInEvent(eventId, userId, moderatorId, duration);
    
    res.json({
      success: true,
      message: 'User muted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const unmuteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, userId } = req.params;
    const moderatorId = (req as any).user?.id;

    await ChatModerationService.unmuteUserInEvent(eventId, userId, moderatorId);
    
    res.json({
      success: true,
      message: 'User unmuted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const banUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId, userId } = req.params;
    const moderatorId = (req as any).user?.id;

    await ChatModerationService.banUserFromEvent(eventId, userId, moderatorId);
    
    res.json({
      success: true,
      message: 'User banned successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMutedUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const moderatorId = (req as any).user?.id;

    const mutedUsers = await ChatModerationService.getMutedUsers(eventId, moderatorId);
    
    res.json({
      success: true,
      mutedUsers
    });
  } catch (error) {
    next(error);
  }
};

export const getModerationLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const moderatorId = (req as any).user?.id;

    const log = await ChatModerationService.getModerationLog(eventId, moderatorId);
    
    res.json({
      success: true,
      log
    });
  } catch (error) {
    next(error);
  }
};

