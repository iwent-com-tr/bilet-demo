import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../lib/prisma';
import { verifyAccess } from '../lib/jwt';

type Principal = {
  id: string;
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
};

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Chat server not initialized');
  return io;
}

export function eventRoom(eventId: string): string { return `event:${eventId}`; }
export function userRoom(userId: string): string { return `user:${userId}`; }

export function setupChat(server: http.Server): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(server, {
    path: '/chat',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
  });

  // Authenticate sockets and attach principal to socket.data
  io.use(async (socket, next) => {
    try {
      const authToken = (socket.handshake.auth as any)?.token
        || (socket.handshake.headers?.authorization?.split(' ')[1])
        || (socket.handshake.query?.token as string | undefined);

      if (!authToken) {
        const err: any = new Error('unauthorized');
        err.status = 401; err.code = 'UNAUTHORIZED';
        return next(err);
      }

      const payload = verifyAccess(authToken);
      const userId = payload.sub;
      if (!userId) {
        const err: any = new Error('unauthorized');
        err.status = 401; err.code = 'UNAUTHORIZED';
        return next(err);
      }

      // Resolve principal: try User first, then Organizer
      const dbUser = await prisma.user.findUnique({ where: { id: userId } });
      if (dbUser) {
        (socket.data as any).principal = { id: dbUser.id, role: (dbUser as any).userType === 'ADMIN' ? 'ADMIN' : 'USER' } as Principal;
      } else {
        const dbOrganizer = await prisma.organizer.findUnique({ where: { id: userId } });
        if (dbOrganizer) {
          (socket.data as any).principal = { id: dbOrganizer.id, role: 'ORGANIZER' } as Principal;
        } else {
          const err: any = new Error('unauthorized');
          err.status = 401; err.code = 'UNAUTHORIZED';
          return next(err);
        }
      }
      next();
    } catch (e) {
      const err: any = e instanceof Error ? e : new Error('unauthorized');
      err.status = err.status ?? 401;
      err.code = err.code ?? 'UNAUTHORIZED';
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const principal: Principal | undefined = (socket.data as any)?.principal;
    if (principal) socket.join(userRoom(principal.id));

    // Client requests to join an event chat room
    socket.on('chat:join', async (payload: { eventId: string }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        const { eventId } = payload || {} as any;
        if (!eventId) throw Object.assign(new Error('eventId required'), { status: 400, code: 'BAD_REQUEST' });

        let allowed = false;
        // Admins always allowed
        if (principal.role === 'ADMIN') allowed = true;

        // Organizers can join their own events
        if (!allowed && principal.role === 'ORGANIZER') {
          const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
          if (ev && ev.organizerId === principal.id) allowed = true;
        }

        // Users can join if they have an active ticket
        if (!allowed && principal.role === 'USER') {
          const t = await prisma.ticket.findFirst({ where: { eventId, userId: principal.id } });
          if (t) allowed = true;
        }

        if (!allowed) throw Object.assign(new Error('forbidden'), { status: 403, code: 'FORBIDDEN' });

        await socket.join(eventRoom(eventId));
        ack?.({ ok: true });
        socket.emit('chat:joined', { eventId });
      } catch (err: any) {
        ack?.({ ok: false, error: err?.code || 'ERROR', message: err?.message || 'failed to join' });
        socket.emit('chat:error', { code: err?.code || 'ERROR', message: err?.message || 'failed to join' });
      }
    });

    socket.on('chat:leave', async (payload: { eventId: string }, ack?: (res: any) => void) => {
      const { eventId } = payload || {} as any;
      if (eventId) await socket.leave(eventRoom(eventId));
      ack?.({ ok: true });
    });

    // Load last N messages
    socket.on('chat:history', async (payload: { eventId: string; limit?: number }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        const { eventId, limit } = payload || {} as any;
        if (!eventId) throw Object.assign(new Error('eventId required'), { status: 400, code: 'BAD_REQUEST' });
        const take = Math.min(Math.max(limit || 50, 1), 200);
        const messages = await prisma.chatMessage.findMany({
          where: { eventId, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, eventId: true, senderId: true, senderType: true, message: true, createdAt: true },
        });
        const ordered = messages.reverse();
        ack?.({ ok: true, data: ordered });
      } catch (err: any) {
        ack?.({ ok: false, error: err?.code || 'ERROR', message: err?.message || 'failed to load history' });
      }
    });

    // Send a message to an event chat room
    socket.on('chat:send', async (payload: { eventId: string; message: string }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        const { eventId, message } = payload || {} as any;
        if (!eventId || !message || message.trim().length === 0) {
          throw Object.assign(new Error('eventId and message required'), { status: 400, code: 'BAD_REQUEST' });
        }

        // Must be in the room or authorized to join
        const inRoom = socket.rooms.has(eventRoom(eventId));
        if (!inRoom) {
          // Attempt implicit authorization as in join
          let allowed = principal.role === 'ADMIN';
          if (!allowed && principal.role === 'ORGANIZER') {
            const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
            if (ev && ev.organizerId === principal.id) allowed = true;
          }
          if (!allowed && principal.role === 'USER') {
            const t = await prisma.ticket.findFirst({ where: { eventId, userId: principal.id, status: 'ACTIVE' } });
            if (t) allowed = true;
          }
          if (!allowed) throw Object.assign(new Error('forbidden'), { status: 403, code: 'FORBIDDEN' });
          await socket.join(eventRoom(eventId));
        }

        const saved = await prisma.chatMessage.create({
          data: {
            eventId,
            senderId: principal.id,
            senderType: principal.role === 'ORGANIZER' ? 'ORGANIZER' : 'USER',
            message: message.trim(),
          },
          select: { id: true, eventId: true, senderId: true, senderType: true, message: true, createdAt: true },
        });

        io!.to(eventRoom(eventId)).emit('chat:message', saved);
        ack?.({ ok: true, data: saved });
      } catch (err: any) {
        ack?.({ ok: false, error: err?.code || 'ERROR', message: err?.message || 'failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      // No-op for now
    });

    // ------------------------
    // Private messages: user-to-user only if friends
    // ------------------------

    async function areFriends(a: string, b: string): Promise<boolean> {
      if (a === b) return false;
      const f = await prisma.friendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { fromUserId: a, toUserId: b },
            { fromUserId: b, toUserId: a },
          ],
        },
        select: { id: true },
      });
      return !!f;
    }

    async function isBlocked(a: string, b: string): Promise<boolean> {
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: a, blockedId: b },
            { blockerId: b, blockedId: a },
          ],
        },
        select: { id: true },
      });
      return !!block;
    }

    socket.on('pm:send', async (payload: { toUserId: string; message: string }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        if (!(principal.role === 'USER' || principal.role === 'ADMIN')) {
          throw Object.assign(new Error('forbidden'), { status: 403, code: 'FORBIDDEN' });
        }
        const { toUserId, message } = payload || ({} as any);
        if (!toUserId || !message || message.trim().length === 0) {
          throw Object.assign(new Error('toUserId and message required'), { status: 400, code: 'BAD_REQUEST' });
        }
        if (toUserId === principal.id) {
          throw Object.assign(new Error('cannot message self'), { status: 400, code: 'BAD_REQUEST' });
        }

        const [friends, blocked] = await Promise.all([
          areFriends(principal.id, toUserId),
          isBlocked(principal.id, toUserId),
        ]);
        if (!friends || blocked) {
          throw Object.assign(new Error('not friends'), { status: 403, code: 'FORBIDDEN' });
        }

        const saved = await prisma.privateMessage.create({
          data: {
            senderId: principal.id,
            receiverId: toUserId,
            message: message.trim(),
          },
          select: { id: true, senderId: true, receiverId: true, message: true, status: true, createdAt: true },
        });

        // Deliver to both parties' user rooms
        io!.to(userRoom(principal.id)).to(userRoom(toUserId)).emit('pm:message', saved);
        ack?.({ ok: true, data: saved });
      } catch (err: any) {
        ack?.({ ok: false, error: err?.code || 'ERROR', message: err?.message || 'failed to send pm' });
      }
    });

    socket.on('pm:history', async (payload: { withUserId: string; limit?: number; before?: string }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        if (!(principal.role === 'USER' || principal.role === 'ADMIN')) {
          throw Object.assign(new Error('forbidden'), { status: 403, code: 'FORBIDDEN' });
        }
        const { withUserId, limit, before } = payload || ({} as any);
        if (!withUserId) throw Object.assign(new Error('withUserId required'), { status: 400, code: 'BAD_REQUEST' });

        const [friends, blocked] = await Promise.all([
          areFriends(principal.id, withUserId),
          isBlocked(principal.id, withUserId),
        ]);
        if (!friends || blocked) {
          throw Object.assign(new Error('not friends'), { status: 403, code: 'FORBIDDEN' });
        }

        const take = Math.min(Math.max(limit || 50, 1), 200);
        const beforeFilter = before ? { createdAt: { lt: new Date(before) } } : {};
        const rows = await prisma.privateMessage.findMany({
          where: {
            OR: [
              { senderId: principal.id, receiverId: withUserId },
              { senderId: withUserId, receiverId: principal.id },
            ],
            ...(beforeFilter as any),
          },
          orderBy: { createdAt: 'desc' },
          take,
          select: { id: true, senderId: true, receiverId: true, message: true, status: true, createdAt: true },
        });
        ack?.({ ok: true, data: rows.reverse() });
      } catch (err: any) {
        ack?.({ ok: false, error: err?.code || 'ERROR', message: err?.message || 'failed to load pm history' });
      }
    });

    socket.on('pm:typing', async (payload: { toUserId: string; isTyping: boolean }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        if (!(principal.role === 'USER' || principal.role === 'ADMIN')) {
          throw Object.assign(new Error('forbidden'), { status: 403, code: 'FORBIDDEN' });
        }
        const { toUserId, isTyping } = payload || ({} as any);
        if (!toUserId) throw Object.assign(new Error('toUserId required'), { status: 400, code: 'BAD_REQUEST' });
        const friends = await areFriends(principal.id, toUserId);
        if (!friends) throw Object.assign(new Error('not friends'), { status: 403, code: 'FORBIDDEN' });
        io!.to(userRoom(toUserId)).emit('pm:typing', { fromUserId: principal.id, isTyping: !!isTyping });
        ack?.({ ok: true });
      } catch (err: any) {
        ack?.({ ok: false, error: err?.code || 'ERROR', message: err?.message || 'failed to send typing' });
      }
    });
  });

  return io;
}

// Helpers for app modules to interact with chat
export async function joinUserToEventRoom(userId: string, eventId: string): Promise<void> {
  if (!io) return;
  const sockets = await io.in(userRoom(userId)).fetchSockets();
  await Promise.all(sockets.map(s => s.join(eventRoom(eventId))));
  sockets.forEach(s => s.emit('chat:joined', { eventId }));
}

export async function notifyEventCreated(eventId: string): Promise<void> {
  if (!io) return;
  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
  if (ev?.organizerId) {
    io.to(userRoom(ev.organizerId)).emit('chat:ready', { eventId });
  }
}


