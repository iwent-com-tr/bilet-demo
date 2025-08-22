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
}