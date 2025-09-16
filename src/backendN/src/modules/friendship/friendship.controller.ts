import { Request, Response, NextFunction } from 'express';
import { FriendshipService, BlockService, MessageService } from './friendship.service';
import { CreateBlockDTO, CreateFriendRequestDTO, ListFriendshipsQueryDTO, ListMessagesQueryDTO, PathIdDTO, SendMessageDTO } from './friendship.dto';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListFriendshipsQueryDTO.parse(req.query);
    const userId = (req as any).user?.id as string;
    const result = await FriendshipService.list(userId, query);
    res.json(result);
  } catch (e) { next(e); }
}

export async function request(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateFriendRequestDTO.parse(req.body);
    const userId = (req as any).user?.id as string;
    const data = await FriendshipService.request(userId, input);
    
    res.status(201).json({ friendship: data });
  } catch (e) { next(e); }
}

export async function accept(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = PathIdDTO.parse(req.params);
    const userId = (req as any).user?.id as string;
    const data = await FriendshipService.accept(userId, id);
    
    res.json({ friendship: data });
  } catch (e) { next(e); }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = PathIdDTO.parse(req.params);
    const userId = (req as any).user?.id as string;
    const data = await FriendshipService.reject(userId, id);
    res.json({ friendship: data });
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = PathIdDTO.parse(req.params);
    const userId = (req as any).user?.id as string;
    const data = await FriendshipService.remove(userId, id);
    res.json({ friendship: data });
  } catch (e) { next(e); }
}

export async function count(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id as string;
    const data = await FriendshipService.count(userId);
    res.json({ count: data });
  } catch (e) { next(e); }
}

// Blocks
export async function listBlocks(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id as string;
    const data = await BlockService.list(userId);
    res.json({ data });
  } catch (e) { next(e); }
}

export async function createBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateBlockDTO.parse(req.body);
    const userId = (req as any).user?.id as string;
    const data = await BlockService.create(userId, input);
    
    // Remove any existing friendship when blocking
    try {
      await FriendshipService.removeExistingFriendship(userId, input.blockedId);
    } catch (friendshipError) {
      console.error('Failed to remove friendship when blocking:', friendshipError);
    }
    
    res.status(201).json({ block: data });
  } catch (e) { next(e); }
}

export async function removeBlock(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = PathIdDTO.parse(req.params);
    const userId = (req as any).user?.id as string;
    const data = await BlockService.remove(userId, id);
    res.json({ block: data });
  } catch (e) { next(e); }
}

// Messages
export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SendMessageDTO.parse(req.body);
    const userId = (req as any).user?.id as string;
    const message = await MessageService.send(userId, input);
    res.status(201).json({ message });
  } catch (e) { next(e); }
}

export async function listMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const input = ListMessagesQueryDTO.parse(req.query);
    const userId = (req as any).user?.id as string;
    const data = await MessageService.list(userId, input);
    res.json({ data });
  } catch (e) { next(e); }
}


