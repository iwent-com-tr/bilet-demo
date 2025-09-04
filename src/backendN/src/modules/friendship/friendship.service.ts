import { prisma } from '../../lib/prisma';
import type { CreateFriendRequestInput, ListFriendshipsQuery, CreateBlockInput, SendMessageInput, ListMessagesQuery } from './friendship.dto';

export class FriendshipService {
  static async list(userId: string, query: ListFriendshipsQuery) {
    const where: any = {
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
    };
    if (query.status) where.status = query.status;
    const [total, data] = await prisma.$transaction([
      prisma.friendship.count({ where }),
      prisma.friendship.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return { page: query.page, limit: query.limit, total, data };
  }

  static async request(userId: string, input: CreateFriendRequestInput) {
    if (userId === input.toUserId) {
      const e: any = new Error('cannot friend self'); e.status = 400; e.code = 'BAD_REQUEST'; throw e;
    }
    // Prevent duplicates
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { fromUserId: userId, toUserId: input.toUserId },
          { fromUserId: input.toUserId, toUserId: userId },
        ],
      },
    });
    if (existing) return existing;
    return prisma.friendship.create({ data: { fromUserId: userId, toUserId: input.toUserId, status: 'PENDING' } });
  }

  static async accept(userId: string, friendshipId: string) {
    const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!f) { const e: any = new Error('not found'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
    if (f.toUserId !== userId) { const e: any = new Error('forbidden'); e.status = 403; e.code = 'FORBIDDEN'; throw e; }
    return prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'ACCEPTED' } });
  }

  static async reject(userId: string, friendshipId: string) {
    const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!f) { const e: any = new Error('not found'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
    if (f.toUserId !== userId) { const e: any = new Error('forbidden'); e.status = 403; e.code = 'FORBIDDEN'; throw e; }
    return prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'REJECTED' } });
  }

  static async remove(userId: string, friendshipId: string) {
    const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!f) { const e: any = new Error('not found'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
    if (f.fromUserId !== userId && f.toUserId !== userId) { const e: any = new Error('forbidden'); e.status = 403; e.code = 'FORBIDDEN'; throw e; }
    return prisma.friendship.delete({ where: { id: friendshipId } });
  }
  static async count(userId: string) {
    return prisma.friendship.count({ where: { status: 'ACCEPTED', OR: [{ fromUserId: userId }, { toUserId: userId }] } });
  }

  static async removeExistingFriendship(userId: string, otherUserId: string) {
    // Find any existing friendship between the two users
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { fromUserId: userId, toUserId: otherUserId },
          { fromUserId: otherUserId, toUserId: userId }
        ]
      }
    });

    if (existingFriendship) {
      await prisma.friendship.delete({
        where: { id: existingFriendship.id }
      });
      console.log(`Removed friendship between users ${userId} and ${otherUserId} due to blocking`);
    }
  }
}

export class BlockService {
  static async list(userId: string) {
    return prisma.block.findMany({ where: { blockerId: userId }, orderBy: { createdAt: 'desc' } });
  }
  static async create(userId: string, input: CreateBlockInput) {
    if (userId === input.blockedId) { const e: any = new Error('cannot block self'); e.status = 400; e.code = 'BAD_REQUEST'; throw e; }
    const existing = await prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: userId, blockedId: input.blockedId } } });
    if (existing) return existing;
    return prisma.block.create({ data: { blockerId: userId, blockedId: input.blockedId } });
  }
  static async remove(userId: string, blockId: string) {
    const b = await prisma.block.findUnique({ where: { id: blockId } });
    if (!b) { const e: any = new Error('not found'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
    if (b.blockerId !== userId) { const e: any = new Error('forbidden'); e.status = 403; e.code = 'FORBIDDEN'; throw e; }
    return prisma.block.delete({ where: { id: blockId } });
  }
}

export class MessageService {
  static async send(userId: string, input: SendMessageInput) {
    if (userId === input.toUserId) { const e: any = new Error('cannot message self'); e.status = 400; e.code = 'BAD_REQUEST'; throw e; }
    const friends = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { fromUserId: userId, toUserId: input.toUserId },
          { fromUserId: input.toUserId, toUserId: userId },
        ],
      },
      select: { id: true },
    });
    if (!friends) { const e: any = new Error('not friends'); e.status = 403; e.code = 'FORBIDDEN'; throw e; }

    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: input.toUserId },
          { blockerId: input.toUserId, blockedId: userId },
        ],
      },
      select: { id: true },
    });
    if (blocked) { const e: any = new Error('blocked'); e.status = 403; e.code = 'FORBIDDEN'; throw e; }

    return prisma.privateMessage.create({ data: { senderId: userId, receiverId: input.toUserId, message: input.message } });
  }

  static async list(userId: string, query: ListMessagesQuery) {
    const whereAny = {
      OR: [
        { senderId: userId, receiverId: query.withUserId },
        { senderId: query.withUserId, receiverId: userId },
      ],
    } as any;
    const where = query.sinceId
      ? { ...whereAny, id: { gt: query.sinceId } }
      : whereAny;
    const rows = await prisma.privateMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: query.limit,
    });
    return rows;
  }

}


