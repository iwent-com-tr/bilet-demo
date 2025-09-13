import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../lib/prisma';
import { UnifiedAuthService } from '../lib/unified-auth.service';
import { UserService } from '../modules/users/user.service';

type Principal = {
  id: string;
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
  type: 'USER' | 'ORGANIZER';
};

let io: SocketIOServer | null = null;

// Track online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socket IDs

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Chat server not initialized');
  return io;
}

export function eventRoom(eventId: string): string { return `event:${eventId}`; }
export function eventRoomBySlug(slug: string): string { return `event-slug:${slug}`; }
export function userRoom(userId: string): string { return `user:${userId}`; }

export function setupChat(server: http.Server): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(server, {
    path: '/chat',
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
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

      const authResult = await UnifiedAuthService.authenticateByToken(authToken);
      if (!authResult) {
        const err: any = new Error('unauthorized');
        err.status = 401; err.code = 'UNAUTHORIZED';
        return next(err);
      }

      // Create principal from unified auth result
      (socket.data as any).principal = {
        id: authResult.entity.id,
        role: authResult.role,
        type: authResult.entity.type
      } as Principal;
      
      next();
    } catch (e) {
      const err: any = e instanceof Error ? e : new Error('unauthorized');
      err.status = err.status ?? 401;
      err.code = err.code ?? 'UNAUTHORIZED';
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const principal: Principal | undefined = (socket.data as any).principal;
    
    if (!principal) {
      socket.disconnect();
      return;
    }

    // Log user connection for debugging in development only
    if (process.env.NODE_ENV === 'development') {
      console.log(`User ${principal.id} connected (${principal.role})`);
    }

    // Track user as online
    if (!onlineUsers.has(principal.id)) {
      onlineUsers.set(principal.id, new Set());
    }
    onlineUsers.get(principal.id)!.add(socket.id);

    // Update lastSeenAt timestamp
    UserService.updateLastSeen(principal.id);

    // Join user room for private messaging
    socket.join(userRoom(principal.id));

    // Notify friends that this user is online
    notifyFriendsOnlineStatus(principal.id, true);

    // Client requests to join an event chat room (by ID or slug)
    socket.on('chat:join', async (payload: { eventId?: string; eventSlug?: string }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        const { eventId, eventSlug } = payload || {} as any;
        if (!eventId && !eventSlug) throw Object.assign(new Error('eventId or eventSlug required'), { status: 400, code: 'BAD_REQUEST' });

        // Find event by ID or slug
        let event;
        if (eventId) {
          event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, slug: true, organizerId: true, status: true } });
        } else if (eventSlug) {
          event = await prisma.event.findUnique({ where: { slug: eventSlug }, select: { id: true, slug: true, organizerId: true, status: true } });
        }

        if (!event) throw Object.assign(new Error('event not found'), { status: 404, code: 'NOT_FOUND' });

        let allowed = false;
        // Admins always allowed
        if (principal.role === 'ADMIN') allowed = true;

        // Organizers can join their own events
        if (!allowed && principal.role === 'ORGANIZER') {
          if (event.organizerId === principal.id) allowed = true;
        }

        // Users can join if they have an active ticket
        if (!allowed && principal.role === 'USER') {
          const t = await prisma.ticket.findFirst({ where: { eventId: event.id, userId: principal.id } });
          if (t) allowed = true;
        }

        if (!allowed) throw Object.assign(new Error('forbidden'), { status: 403, code: 'FORBIDDEN' });

        // Join both ID and slug-based rooms for consistency
        await socket.join(eventRoom(event.id));
        await socket.join(eventRoomBySlug(event.slug));
        
        ack?.({ ok: true, eventId: event.id, eventSlug: event.slug });
        socket.emit('chat:joined', { eventId: event.id, eventSlug: event.slug });
      } catch (err: any) {
        ack?.({ ok: false, error: err?.code || 'ERROR', message: err?.message || 'failed to join' });
        socket.emit('chat:error', { code: err?.code || 'ERROR', message: err?.message || 'failed to join' });
      }
    });

    socket.on('chat:leave', async (payload: { eventId?: string; eventSlug?: string }, ack?: (res: any) => void) => {
      const { eventId, eventSlug } = payload || {} as any;
      
      if (eventId) {
        await socket.leave(eventRoom(eventId));
        // Also get slug and leave slug room
        const event = await prisma.event.findUnique({ where: { id: eventId }, select: { slug: true } });
        if (event?.slug) await socket.leave(eventRoomBySlug(event.slug));
      } else if (eventSlug) {
        await socket.leave(eventRoomBySlug(eventSlug));
        // Also get ID and leave ID room
        const event = await prisma.event.findUnique({ where: { slug: eventSlug }, select: { id: true } });
        if (event?.id) await socket.leave(eventRoom(event.id));
      }
      
      ack?.({ ok: true });
    });

    // Load last N messages
    socket.on('chat:history', async (payload: { eventId?: string; eventSlug?: string; limit?: number }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        const { eventId, eventSlug, limit } = payload || {} as any;
        if (!eventId && !eventSlug) throw Object.assign(new Error('eventId or eventSlug required'), { status: 400, code: 'BAD_REQUEST' });
        
        // Find event by ID or slug to get the actual eventId for database queries
        let actualEventId = eventId;
        if (!actualEventId && eventSlug) {
          const event = await prisma.event.findUnique({ where: { slug: eventSlug }, select: { id: true } });
          if (!event) throw Object.assign(new Error('event not found'), { status: 404, code: 'NOT_FOUND' });
          actualEventId = event.id;
        }
        
        const take = Math.min(Math.max(limit || 50, 1), 200);
        const messages = await prisma.chatMessage.findMany({
          where: { eventId: actualEventId, status: 'ACTIVE' },
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
    socket.on('chat:send', async (payload: { eventId?: string; eventSlug?: string; message: string }, ack?: (res: any) => void) => {
      try {
        if (!principal) throw Object.assign(new Error('unauthorized'), { status: 401, code: 'UNAUTHORIZED' });
        const { eventId, eventSlug, message } = payload || {} as any;
        if ((!eventId && !eventSlug) || !message || message.trim().length === 0) {
          throw Object.assign(new Error('eventId/eventSlug and message required'), { status: 400, code: 'BAD_REQUEST' });
        }

        // Find event by ID or slug
        let event;
        if (eventId) {
          event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, slug: true, organizerId: true } });
        } else if (eventSlug) {
          event = await prisma.event.findUnique({ where: { slug: eventSlug }, select: { id: true, slug: true, organizerId: true } });
        }

        if (!event) throw Object.assign(new Error('event not found'), { status: 404, code: 'NOT_FOUND' });

        // Must be in the room or authorized to join
        const inRoom = socket.rooms.has(eventRoom(event.id)) || socket.rooms.has(eventRoomBySlug(event.slug));
        if (!inRoom) {
          // Attempt implicit authorization as in join
          let allowed = principal.role === 'ADMIN';
          if (!allowed && principal.role === 'ORGANIZER') {
            if (event.organizerId === principal.id) allowed = true;
          }
          if (!allowed && principal.role === 'USER') {
            const t = await prisma.ticket.findFirst({ where: { eventId: event.id, userId: principal.id, status: 'ACTIVE' } });
            if (t) allowed = true;
          }
          if (!allowed) throw Object.assign(new Error('forbidden'), { status: 403, code: 'FORBIDDEN' });
          await socket.join(eventRoom(event.id));
          await socket.join(eventRoomBySlug(event.slug));
        }

        const saved = await prisma.chatMessage.create({
          data: {
            eventId: event.id,
            userId: principal.id,
            senderId: principal.id,
            senderType: principal.role === 'ORGANIZER' ? 'ORGANIZER' : 'USER',
            message: message.trim(),
          },
          select: { id: true, eventId: true, senderId: true, senderType: true, message: true, createdAt: true },
        });

        // Send to both ID and slug rooms
        io!.to(eventRoom(event.id)).to(eventRoomBySlug(event.slug)).emit('chat:message', saved);
        ack?.({ ok: true, data: saved });
      } catch (err: any) {
        ack?.({ ok: false, error: err?.code || 'ERROR', message: err?.message || 'failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      // Log user disconnection for debugging in development only
      if (process.env.NODE_ENV === 'development') {
        console.log(`User ${principal.id} disconnected`);
      }
      
      // Remove socket from online tracking
      const userSockets = onlineUsers.get(principal.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If no more sockets for this user, mark as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(principal.id);
          
          // Update lastSeenAt timestamp
          UserService.updateLastSeen(principal.id);
          
          // Notify friends that this user went offline
          notifyFriendsOnlineStatus(principal.id, false);
        }
      }
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

export async function notifyEventPublished(eventId: string): Promise<void> {
  if (!io) return;
  const event = await prisma.event.findUnique({ 
    where: { id: eventId }, 
    select: { id: true, slug: true, organizerId: true, name: true } 
  });
  
  if (!event) return;

  // Notify the organizer that the chat room is now active
  if (event.organizerId) {
    io.to(userRoom(event.organizerId)).emit('chat:event-published', { 
      eventId: event.id, 
      eventSlug: event.slug,
      eventName: event.name 
    });
  }

  // The chat rooms are automatically created when users join
  // Both event:${eventId} and event-slug:${slug} rooms will be available
  console.log(`Event published: ${event.name} (${event.slug}) - Chat rooms ready`);
}

// Helper function to check if user is online
export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

// Helper function to get online user count
export function getOnlineUserCount(): number {
  return onlineUsers.size;
}

// Helper function to get all online user IDs
export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}

// Notify friends when user's online status changes
async function notifyFriendsOnlineStatus(userId: string, isOnline: boolean) {
  try {
    // Get user's friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { fromUserId: userId, status: 'ACCEPTED' },
          { toUserId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    const friendIds = friendships.map(f => 
      f.fromUserId === userId ? f.toUserId : f.fromUserId
    );

    // Notify each friend about the status change
    friendIds.forEach(friendId => {
      io?.to(userRoom(friendId)).emit('user:status-change', {
        userId: userId,
        isOnline: isOnline
      });
    });
  } catch (error) {
    console.error('Error notifying friends about online status:', error);
  }
}


