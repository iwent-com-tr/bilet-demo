import { prisma } from '../../lib/prisma';

export class ChatModerationService {

  // Check if user is moderator of event chat
  static async isEventModerator(eventId: string, userId: string): Promise<boolean> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true }
    });

    return event?.organizerId === userId;
  }

  // Delete a message (moderator only)
  static async deleteMessage(messageId: string, moderatorId: string): Promise<void> {
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { 
        id: true, 
        eventId: true, 
        senderId: true, 
        senderType: true,
        status: true
      }
    });

    if (!message) {
      const error: any = new Error('Message not found');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (message.status === 'DELETED') {
      const error: any = new Error('Message already deleted');
      error.status = 400;
      error.code = 'ALREADY_DELETED';
      throw error;
    }

    // Check if moderator has permission
    if (message.eventId) {
      const isModerator = await this.isEventModerator(message.eventId, moderatorId);
      if (!isModerator && message.senderId !== moderatorId) {
        const error: any = new Error('Insufficient permissions');
        error.status = 403;
        error.code = 'FORBIDDEN';
        throw error;
      }
    }

    // Soft delete the message
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { 
        status: 'DELETED',
        message: '[Bu mesaj silindi]'
      }
    });

    console.log(`Message ${messageId} deleted by moderator ${moderatorId}`);
  }

  // Mute user in event chat
  static async muteUserInEvent(eventId: string, targetUserId: string, moderatorId: string, duration?: number): Promise<void> {
    const isModerator = await this.isEventModerator(eventId, moderatorId);
    if (!isModerator) {
      const error: any = new Error('Insufficient permissions');
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!targetUser) {
      const error: any = new Error('User not found');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Calculate mute expiry (default 1 hour)
    const muteUntil = duration 
      ? new Date(Date.now() + duration * 60 * 1000) // duration in minutes
      : new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create or update mute record
    await prisma.eventMute.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUserId
        }
      },
      update: {
        muteUntil,
        mutedById: moderatorId
      },
      create: {
        eventId,
        userId: targetUserId,
        muteUntil,
        mutedById: moderatorId
      }
    });

    console.log(`User ${targetUserId} muted in event ${eventId} until ${muteUntil} by moderator ${moderatorId}`);
  }

  // Unmute user in event chat
  static async unmuteUserInEvent(eventId: string, targetUserId: string, moderatorId: string): Promise<void> {
    const isModerator = await this.isEventModerator(eventId, moderatorId);
    if (!isModerator) {
      const error: any = new Error('Insufficient permissions');
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    await prisma.eventMute.deleteMany({
      where: {
        eventId,
        userId: targetUserId
      }
    });

    console.log(`User ${targetUserId} unmuted in event ${eventId} by moderator ${moderatorId}`);
  }

  // Check if user is muted in event
  static async isUserMuted(eventId: string, userId: string): Promise<boolean> {
    const mute = await prisma.eventMute.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (!mute) return false;

    // Check if mute has expired
    if (mute.muteUntil && mute.muteUntil < new Date()) {
      // Remove expired mute
      await prisma.eventMute.delete({
        where: { id: mute.id }
      });
      return false;
    }

    return true;
  }

  // Get muted users for an event
  static async getMutedUsers(eventId: string, moderatorId: string) {
    const isModerator = await this.isEventModerator(eventId, moderatorId);
    if (!isModerator) {
      const error: any = new Error('Insufficient permissions');
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const mutedUsers = await prisma.eventMute.findMany({
      where: { 
        eventId,
        muteUntil: {
          gt: new Date() // Only active mutes
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        mutedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return mutedUsers;
  }

  // Ban user from event chat (permanent mute)
  static async banUserFromEvent(eventId: string, targetUserId: string, moderatorId: string): Promise<void> {
    const isModerator = await this.isEventModerator(eventId, moderatorId);
    if (!isModerator) {
      const error: any = new Error('Insufficient permissions');
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, firstName: true, lastName: true }
    });

    if (!targetUser) {
      const error: any = new Error('User not found');
      error.status = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Create permanent mute (null muteUntil means permanent)
    await prisma.eventMute.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: targetUserId
        }
      },
      update: {
        muteUntil: null, // Permanent ban
        mutedById: moderatorId
      },
      create: {
        eventId,
        userId: targetUserId,
        muteUntil: null, // Permanent ban
        mutedById: moderatorId
      }
    });

    console.log(`User ${targetUserId} banned from event ${eventId} by moderator ${moderatorId}`);
  }

  // Get moderation actions for an event
  static async getModerationLog(eventId: string, moderatorId: string) {
    const isModerator = await this.isEventModerator(eventId, moderatorId);
    if (!isModerator) {
      const error: any = new Error('Insufficient permissions');
      error.status = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    // Get deleted messages
    const deletedMessages = await prisma.chatMessage.findMany({
      where: { 
        eventId,
        status: 'DELETED'
      },
      select: {
        id: true,
        senderId: true,
        senderType: true,
        message: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    // Get mute history
    const muteHistory = await prisma.eventMute.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        mutedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return {
      deletedMessages,
      muteHistory
    };
  }
}

