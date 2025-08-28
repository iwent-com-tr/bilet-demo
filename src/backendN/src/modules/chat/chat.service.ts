import { prisma } from '../../lib/prisma';

export class ChatService {
  
  // Get messages for an event chat
  static async getEventMessages(eventId: string, userId: string, options: { limit?: number; before?: string } = {}) {
    // First check if user has access to this event chat
    const hasAccess = await this.checkEventChatAccess(eventId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to this event chat');
    }

    const { limit = 50, before } = options;
    
    const whereClause: any = {
      eventId,
      status: 'ACTIVE'
    };

    if (before) {
      whereClause.createdAt = {
        lt: new Date(before)
      };
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        senderId: true,
        senderType: true,
        message: true,
        createdAt: true,
      }
    });

    // Get sender information for each message
    const messagesWithSenders = await Promise.all(
      messages.map(async (msg) => {
        let senderName = 'Unknown';
        let senderAvatar = null;

        if (msg.senderType === 'USER') {
          const user = await prisma.user.findUnique({
            where: { id: msg.senderId },
            select: { firstName: true, lastName: true, avatar: true }
          });
          if (user) {
            senderName = `${user.firstName} ${user.lastName}`;
            senderAvatar = user.avatar;
          }
        } else if (msg.senderType === 'ORGANIZER') {
          const organizer = await prisma.organizer.findUnique({
            where: { id: msg.senderId },
            select: { firstName: true, lastName: true, avatar: true }
          });
          if (organizer) {
            senderName = `${organizer.firstName} ${organizer.lastName}`;
            senderAvatar = organizer.avatar;
          }
        }

        return {
          ...msg,
          senderName,
          senderAvatar
        };
      })
    );

    return messagesWithSenders.reverse(); // Return in chronological order
  }

  // Get participants for an event chat
  static async getEventParticipants(eventId: string, userId: string) {
    // Check access
    const hasAccess = await this.checkEventChatAccess(eventId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to this event chat');
    }

    // Get all users who have tickets for this event
    const ticketHolders = await prisma.ticket.findMany({
      where: {
        eventId,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      distinct: ['userId']
    });

    // Get event organizer
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    const participants = [
      // Add organizer first
      ...(event?.organizer ? [{
        id: event.organizer.id,
        firstName: event.organizer.firstName,
        lastName: event.organizer.lastName,
        avatar: event.organizer.avatar,
        role: 'ORGANIZER' as const,
        isOnline: false // TODO: Implement online status
      }] : []),
      // Add ticket holders
      ...ticketHolders.map(ticket => ({
        id: ticket.user.id,
        firstName: ticket.user.firstName,
        lastName: ticket.user.lastName,
        avatar: ticket.user.avatar,
        role: 'USER' as const,
        isOnline: false // TODO: Implement online status
      }))
    ];

    // Remove duplicates (in case organizer also has a ticket)
    const uniqueParticipants = participants.filter((participant, index, self) =>
      index === self.findIndex(p => p.id === participant.id)
    );

    return uniqueParticipants;
  }

  // Get user's event chats (events they have tickets for)
  static async getMyEventChats(userId: string, userType?: string) {
    let eventIds: string[] = [];

    if (userType === 'ADMIN' || userType === 'USER') {
      // Get events user has tickets for
      const tickets = await prisma.ticket.findMany({
        where: {
          userId,
          status: 'ACTIVE'
        },
        select: { eventId: true },
        distinct: ['eventId']
      });
      eventIds = tickets.map(t => t.eventId);
    }

    // If user is also an organizer, add their events
    const organizer = await prisma.organizer.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (organizer) {
      const organizerEvents = await prisma.event.findMany({
        where: { organizerId: userId },
        select: { id: true }
      });
      eventIds = [...eventIds, ...organizerEvents.map(e => e.id)];
    }

    if (eventIds.length === 0) {
      return [];
    }

    // Get events with last message info
    const events = await prisma.event.findMany({
      where: {
        id: { in: eventIds },
        status: 'ACTIVE',
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        banner: true,
        startDate: true,
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            message: true,
            createdAt: true,
            senderId: true,
            senderType: true
          }
        }
      }
    });

    // Format chat previews
    const chats = await Promise.all(
      events.map(async (event) => {
        const lastMessage = event.chatMessages[0];
        let senderName = '';

        if (lastMessage) {
          if (lastMessage.senderType === 'USER') {
            const user = await prisma.user.findUnique({
              where: { id: lastMessage.senderId },
              select: { firstName: true }
            });
            senderName = user?.firstName || 'Kullanıcı';
          } else {
            senderName = 'Organizatör';
          }
        }

        // Count unread messages (simplified - could be enhanced with read receipts)
        const unreadCount = await prisma.chatMessage.count({
          where: {
            eventId: event.id,
            senderId: { not: userId },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours as approximation
            }
          }
        });

        return {
          eventId: event.id,
          eventName: event.name,
          eventSlug: event.slug,
          eventBanner: event.banner,
          lastMessage: lastMessage ? {
            message: lastMessage.message,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
            senderName
          } : null,
          unreadCount: Math.min(unreadCount, 99), // Cap at 99
          event: {
            startDate: event.startDate
          }
        };
      })
    );

    return chats.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || a.event.startDate;
      const bTime = b.lastMessage?.createdAt || b.event.startDate;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }

  // Get user's private message chats
  static async getMyPrivateChats(userId: string) {
    // Get recent private message conversations
    const recentMessages = await prisma.privateMessage.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ],
        status: { not: 'DELETED' }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Get recent messages to find unique conversations
    });

    // Group by conversation partner
    const conversationMap = new Map();
    
    recentMessages.forEach(msg => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          userId: partnerId,
          lastMessage: msg,
          unreadCount: 0
        });
      }
      
      // Count unread messages (messages sent by partner that are not read)
      if (msg.receiverId === userId && msg.status === 'SENT') {
        const conversation = conversationMap.get(partnerId);
        conversation.unreadCount++;
      }
    });

    // Get user details for each conversation
    const conversations = await Promise.all(
      Array.from(conversationMap.values()).map(async (conv) => {
        const user = await prisma.user.findUnique({
          where: { id: conv.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        });

        return {
          userId: conv.userId,
          user,
          lastMessage: {
            message: conv.lastMessage.message,
            createdAt: conv.lastMessage.createdAt,
            senderId: conv.lastMessage.senderId
          },
          unreadCount: Math.min(conv.unreadCount, 99)
        };
      })
    );

    return conversations.sort((a, b) => 
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }

  // Get private messages between two users
  static async getPrivateMessages(userId: string, otherUserId: string, options: { limit?: number; before?: string } = {}) {
    const { limit = 50, before } = options;
    
    const whereClause: any = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      status: { not: 'DELETED' }
    };

    if (before) {
      whereClause.createdAt = {
        lt: new Date(before)
      };
    }

    const messages = await prisma.privateMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    return messages.reverse(); // Return in chronological order
  }

  // Send private message
  static async sendPrivateMessage(senderId: string, receiverId: string, message: string) {
    // Check if users are friends (optional - remove if not needed)
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { fromUserId: senderId, toUserId: receiverId },
          { fromUserId: receiverId, toUserId: senderId }
        ]
      }
    });

    if (!friendship) {
      throw new Error('Can only send messages to friends');
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true }
    });

    if (!receiver) {
      throw new Error('Receiver not found');
    }

    const sentMessage = await prisma.privateMessage.create({
      data: {
        senderId,
        receiverId,
        message,
        status: 'SENT'
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    return sentMessage;
  }

  // Helper: Check if user has access to event chat
  private static async checkEventChatAccess(eventId: string, userId: string): Promise<boolean> {
    // Check if user has a ticket for this event
    const ticket = await prisma.ticket.findFirst({
      where: {
        eventId,
        userId,
        status: 'ACTIVE'
      }
    });

    if (ticket) return true;

    // Check if user is the organizer of this event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true }
    });

    if (event?.organizerId === userId) return true;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true }
    });

    if (user?.userType === 'ADMIN') return true;

    return false;
  }
}
