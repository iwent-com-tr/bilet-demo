import { prisma } from '../../lib/prisma';

export class UserService {
  static async list(params: { page: number; limit: number; q?: string }) {
    const { page, limit, q } = params;
    const where = q ? { 
      OR: [
        { email: { contains: q, mode: 'insensitive' as const } }, 
        { firstName: { contains: q, mode: 'insensitive' as const } },
        { lastName: { contains: q, mode: 'insensitive' as const } }
      ],
      deletedAt: null // Exclude soft deleted users
    } : { deletedAt: null };
    
    const [total, data] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({ 
        where, 
        skip: (page - 1) * limit, 
        take: limit, 
        orderBy: { createdAt: 'desc' },
        select: { 
          id: true, 
          firstName: true,
          lastName: true,
          email: true, 
          userType: true, 
          avatar: true,
          city: true,
          phone: true,
          phoneVerified: true,
          points: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        } 
      })
    ]);
    return { data, page, limit, total };
  }

  static async findById(id: string) {
    const user = await prisma.user.findUnique({ 
      where: { id, deletedAt: null },
      select: { 
        id: true, 
        firstName: true,
        lastName: true,
        email: true, 
        userType: true, 
        avatar: true,
        city: true,
        phone: true,
        phoneVerified: true,
        birthYear: true,
        points: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      } 
    });
    if (!user) { 
      const e: any = new Error('user not found'); 
      e.status = 404; 
      e.code = 'NOT_FOUND'; 
      throw e; 
    }
    return user;
  }

  // Get user profile with relationship status (for 3rd party view)
  static async findByIdWithRelationship(id: string, currentUserId?: string) {
    const user = await prisma.user.findUnique({ 
      where: { id, deletedAt: null },
      select: { 
        id: true, 
        firstName: true,
        lastName: true,
        email: true, 
        userType: true, 
        avatar: true,
        city: true,
        phone: true,
        phoneVerified: true,
        birthYear: true,
        points: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            friendshipsFrom: { where: { status: 'ACCEPTED' } },
            friendshipsTo: { where: { status: 'ACCEPTED' } },
            tickets: { where: { status: 'ACTIVE' } }
          }
        }
      } 
    });

    if (!user) {
      const e: any = new Error('user not found');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }

    let relationshipStatus = null;
    let canMessage = false;

    // Check relationship status if currentUserId is provided
    if (currentUserId && currentUserId !== id) {
      // Check if they are friends
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { fromUserId: currentUserId, toUserId: id },
            { fromUserId: id, toUserId: currentUserId }
          ]
        }
      });

      if (friendship) {
        relationshipStatus = friendship.status; // PENDING, ACCEPTED, REJECTED
        canMessage = friendship.status === 'ACCEPTED';
        
        // For pending requests, indicate direction
        if (friendship.status === 'PENDING') {
          if (friendship.fromUserId === currentUserId) {
            relationshipStatus = 'PENDING_SENT';
          } else {
            relationshipStatus = 'PENDING_RECEIVED';
          }
        }
      }

      // Check if current user is blocked
      const isBlocked = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: currentUserId, blockedId: id },
            { blockerId: id, blockedId: currentUserId }
          ]
        }
      });

      if (isBlocked) {
        relationshipStatus = 'BLOCKED';
        canMessage = false;
      }
    }

    const totalFriends = user._count.friendshipsFrom + user._count.friendshipsTo;

    return {
      ...user,
      stats: {
        totalFriends,
        totalTickets: user._count.tickets
      },
      relationship: {
        status: relationshipStatus,
        canMessage,
        isSelf: currentUserId === id
      }
    };
  }

  static async updateSelf(id: string, data: { firstName?: string; lastName?: string; email?: string; phone?: string; city?: string; avatar?: string }) {
    return prisma.user.update({ 
      where: { id }, 
      data, 
      select: { 
        id: true, 
        firstName: true,
        lastName: true,
        email: true, 
        userType: true, 
        avatar: true,
        city: true,
        phone: true,
        phoneVerified: true,
        points: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      } 
    });
  }

  static async adminUpdate(id: string, data: { 
    email?: string; 
    firstName?: string; 
    lastName?: string; 
    userType?: string; 
    phone?: string;
    city?: string;
    avatar?: string;
    phoneVerified?: boolean;
    points?: number;
  }) {
    // email unique conflict will be automatically thrown by Prisma -> map to 409
    try {
      const { userType, ...rest } = data;
      const updateData: any = { ...rest };
      if (typeof userType !== 'undefined') {
        const normalized = String(userType).toUpperCase();
        if (normalized !== 'USER' && normalized !== 'ADMIN') {
          const err: any = new Error('invalid userType');
          err.status = 400; err.code = 'INVALID_USER_TYPE';
          throw err;
        }
        // Assign enum safely without relying on generated enum types
        updateData.userType = normalized as any;
      }

      return await prisma.user.update({ 
        where: { id }, 
        data: updateData,
        select: { 
          id: true, 
          firstName: true,
          lastName: true,
          email: true, 
          userType: true, 
          avatar: true,
          city: true,
          phone: true,
          phoneVerified: true,
          birthYear: true,
          points: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        } 
      });
    } catch (e: any) {
      if (e.code === 'P2002') { 
        const err: any = new Error('email already in use'); 
        err.status = 409; 
        err.code = 'EMAIL_TAKEN'; 
        throw err; 
      }
      throw e;
    }
  }

  static async softDelete(id: string) {
    return prisma.user.update({ 
      where: { id }, 
      data: { deletedAt: new Date() } 
    });
  }

  static async getUserStats(id: string) {
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        tickets: {
          where: { status: 'ACTIVE' },
          include: { event: true }
        },
        _count: {
          select: {
            tickets: true,
            friendshipsFrom: { where: { status: 'ACCEPTED' } },
            friendshipsTo: { where: { status: 'ACCEPTED' } }
          }
        }
      }
    });

    if (!user) {
      const e: any = new Error('user not found');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        avatar: user.avatar,
        city: user.city,
        points: user.points,
        createdAt: user.createdAt
      },
      stats: {
        totalTickets: user._count.tickets,
        totalFriends: user._count.friendshipsFrom + user._count.friendshipsTo,
        activeTickets: user.tickets.length,
        upcomingEvents: user.tickets.filter((ticket: any) => 
          new Date(ticket.event.startDate) > new Date()
        ).length
      }
    };
  }

  static async getPoints(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { points: true }
    });
    if (!user) {
      const e: any = new Error('user not found');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }
    return user.points;
  }

  static async searchUsers(params: { 
    q: string; 
    limit?: number; 
    excludeId?: string;
    city?: string;
  }) {
    const { q, limit = 10, excludeId, city } = params;
    
    const where: any = {
      deletedAt: null,
      AND: [
        {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } }
          ]
        }
      ]
    };

    if (excludeId) {
      where.AND.push({ id: { not: excludeId } });
    }

    if (city) {
      where.AND.push({ city: { equals: city, mode: 'insensitive' as const } });
    }

    const users = await prisma.user.findMany({
      where,
      take: limit,
      orderBy: [
        { points: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        city: true,
        points: true
      }
    });

    return users;
  }

  // Favorites service methods
  static async addFavorite(userId: string, eventId: string) {
    // Upsert to avoid duplicates
    const fav = await prisma.favoriteEvent.upsert({
      where: { userId_eventId: { userId, eventId } },
      update: {},
      create: { userId, eventId }
    });
    return fav;
  }

  static async removeFavorite(userId: string, eventId: string) {
    await prisma.favoriteEvent.delete({ where: { userId_eventId: { userId, eventId } } });
    return { ok: true };
  }

  static async listFavorites(userId: string) {
    const rows = await prisma.favoriteEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { event: true }
    });
    return rows.map((r: any) => r.event);
  }

  // Update user's last seen timestamp
  static async updateLastSeen(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() }
      });
    } catch (error) {
      console.error('Error updating lastSeenAt:', error);
      // Don't throw error, this is not critical
    }
  }

  // Check if user is considered online (seen within last 5 minutes)
  static isUserOnline(lastSeenAt: Date | null): boolean {
    if (!lastSeenAt) return false;
    
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    
    return lastSeenAt > fiveMinutesAgo;
  }

  // Get multiple users' online status
  static async getUsersOnlineStatus(userIds: string[]): Promise<Record<string, boolean>> {
    const users = await prisma.user.findMany({
      where: { 
        id: { in: userIds },
        deletedAt: null 
      },
      select: { 
        id: true, 
        lastSeenAt: true 
      }
    });

    const onlineStatus: Record<string, boolean> = {};
    
    users.forEach(user => {
      onlineStatus[user.id] = this.isUserOnline(user.lastSeenAt);
    });

    // Set offline for users not found
    userIds.forEach(id => {
      if (!(id in onlineStatus)) {
        onlineStatus[id] = false;
      }
    });

    return onlineStatus;
  }
}