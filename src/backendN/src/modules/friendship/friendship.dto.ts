import { z } from 'zod';

export const ListFriendshipsQueryDTO = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListFriendshipsQuery = z.infer<typeof ListFriendshipsQueryDTO>;

export const CreateFriendRequestDTO = z.object({
  toUserId: z.string().uuid(),
});
export type CreateFriendRequestInput = z.infer<typeof CreateFriendRequestDTO>;

export const PathIdDTO = z.object({ id: z.string().uuid() });

// Blocks
export const CreateBlockDTO = z.object({
  blockedId: z.string().uuid(),
});
export type CreateBlockInput = z.infer<typeof CreateBlockDTO>;

// Messages
export const SendMessageDTO = z.object({
  toUserId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});
export type SendMessageInput = z.infer<typeof SendMessageDTO>;

export const ListMessagesQueryDTO = z.object({
  withUserId: z.string().uuid(),
  sinceId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQueryDTO>;


