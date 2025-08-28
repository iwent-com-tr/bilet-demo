import { Request, Response, NextFunction } from 'express';
import { ChatService } from './chat.service';

export const getEventMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    const messages = await ChatService.getEventMessages(eventId, userId, { limit, before });
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

export const getEventParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventId } = req.params;
    const userId = (req as any).user?.id;

    const participants = await ChatService.getEventParticipants(eventId, userId);
    
    res.json({
      success: true,
      participants
    });
  } catch (error) {
    next(error);
  }
};

export const getMyEventChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const userType = (req as any).user?.userType;

    const chats = await ChatService.getMyEventChats(userId, userType);
    
    res.json({
      success: true,
      chats
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPrivateChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;

    const chats = await ChatService.getMyPrivateChats(userId);
    
    res.json({
      success: true,
      chats
    });
  } catch (error) {
    next(error);
  }
};

export const getPrivateMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: otherUserId } = req.params;
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    const messages = await ChatService.getPrivateMessages(userId, otherUserId, { limit, before });
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

export const sendPrivateMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: receiverId } = req.params;
    const senderId = (req as any).user?.id;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    const sentMessage = await ChatService.sendPrivateMessage(senderId, receiverId, message.trim());
    
    res.json({
      success: true,
      message: sentMessage
    });
  } catch (error) {
    next(error);
  }
};
