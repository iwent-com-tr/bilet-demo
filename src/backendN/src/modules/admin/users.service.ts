import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const lastTwo = phone.slice(-2);
  const countryCode = phone.startsWith('+90') ? '+90' : '';
  const rest = phone.substring(countryCode.length, phone.length - 2);
  const masked = rest.replace(/\d/g, '•');
  return `${countryCode}${masked}${lastTwo}`;
}

export class AdminUserService {
  static async listUsers(query: any) {
    const { q, role, status, verified, consent, os, browser, pwa, created_from, created_to, last_login_from, last_login_to, sort, limit = 25, cursor } = query;

    const where: Prisma.UserWhereInput = {};

    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { externalId: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (role) where.adminRole = role;
    if (status) where.status = status;

    if (verified) {
      if (verified === 'email') where.emailVerified = true;
      if (verified === 'phone') where.phoneVerified = true;
      if (verified === 'both') where.AND = [{ emailVerified: true }, { phoneVerified: true }];
      if (verified === 'none') where.AND = [{ emailVerified: false }, { phoneVerified: false }];
    }

    if (consent) {
      if (consent === 'marketing_true') where.marketingConsent = true;
      if (consent === 'marketing_false') where.marketingConsent = false;
    }

    if (created_from) where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, gte: new Date(created_from) };
    if (created_to) where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, lte: new Date(created_to) };
    if (last_login_from) where.lastLogin = { ...where.lastLogin as Prisma.DateTimeFilter, gte: new Date(last_login_from) };
    if (last_login_to) where.lastLogin = { ...where.lastLogin as Prisma.DateTimeFilter, lte: new Date(last_login_to) };

    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (sort) {
      const [field, direction] = sort.startsWith('-') ? [sort.substring(1), 'desc'] : [sort, 'asc'];
      if (['createdAt', 'lastLogin', 'email', 'adminRole'].includes(field)) {
        orderBy[field as keyof Prisma.UserOrderByWithRelationInput] = direction as Prisma.SortOrder;
      }
    }

    const users = await prisma.user.findMany({
      where,
      orderBy,
      take: Number(limit),
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });

    const nextCursor = users.length === Number(limit) ? users[users.length - 1].id : null;

    // Aggregates
    const total = await prisma.user.count({ where });
    const active = await prisma.user.count({ where: { ...where, status: 'ACTIVE' } });
    const verifiedEmail = await prisma.user.count({ where: { ...where, emailVerified: true } });

    const maskedUsers = users.map(user => ({ ...user, phone: maskPhoneNumber(user.phone) }));

    return {
      items: maskedUsers,
      page: { next_cursor: nextCursor },
      aggregates: { total, active, verified_email: verifiedEmail },
    };
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        segmentTags: true,
        pushSubscriptions: true,
        loginEvents: {
          take: 10,
          orderBy: {
            ts: 'desc',
          },
        },
        auditLogsAsActor: {
          take: 5,
          orderBy: {
            ts: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  static async exportUsers(query: any) {
    const { q, role, status, verified, consent, os, browser, pwa, created_from, created_to, last_login_from, last_login_to, sort } = query;

    const where: Prisma.UserWhereInput = {};

    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { externalId: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (role) where.adminRole = role;
    if (status) where.status = status;

    if (verified) {
      if (verified === 'email') where.emailVerified = true;
      if (verified === 'phone') where.phoneVerified = true;
      if (verified === 'both') where.AND = [{ emailVerified: true }, { phoneVerified: true }];
      if (verified === 'none') where.AND = [{ emailVerified: false }, { phoneVerified: false }];
    }

    if (consent) {
      if (consent === 'marketing_true') where.marketingConsent = true;
      if (consent === 'marketing_false') where.marketingConsent = false;
    }

    if (created_from) where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, gte: new Date(created_from) };
    if (created_to) where.createdAt = { ...where.createdAt as Prisma.DateTimeFilter, lte: new Date(created_to) };
    if (last_login_from) where.lastLogin = { ...where.lastLogin as Prisma.DateTimeFilter, gte: new Date(last_login_from) };
    if (last_login_to) where.lastLogin = { ...where.lastLogin as Prisma.DateTimeFilter, lte: new Date(last_login_to) };

    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (sort) {
      const [field, direction] = sort.startsWith('-') ? [sort.substring(1), 'desc'] : [sort, 'asc'];
      if (['createdAt', 'lastLogin', 'email', 'adminRole'].includes(field)) {
        orderBy[field as keyof Prisma.UserOrderByWithRelationInput] = direction as Prisma.SortOrder;
      }
    }

    const users = await prisma.user.findMany({
      where,
      orderBy,
    });

    return users;
  }

  static async getUnmaskedPhone(id: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { phone: true },
    });
    return user?.phone || null;
  }
}

export default new AdminUserService();
