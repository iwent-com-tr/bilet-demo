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
    const { q, role, status, verified, consent, os, browser, pwa, created_from, created_to, last_login_from, last_login_to, sort, limit = 25, cursor, include_organizers } = query;

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

    let organizers: any[] = [];
    if (include_organizers === 'true') {
      // Get only approved organizers
      const approvedOrganizers = await prisma.organizer.findMany({
        where: { approved: true },
        orderBy: orderBy.createdAt ? { createdAt: orderBy.createdAt } : { createdAt: 'desc' },
        take: Number(limit),
        include: {
          events: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      });

      organizers = approvedOrganizers.map(organizer => ({
        ...organizer,
        phone: maskPhoneNumber(organizer.phone),
        events: organizer.events.length,
        userType: 'ORGANIZER', // Add type to distinguish in frontend
        adminRole: 'USER', // Default role for organizers
        status: 'ACTIVE', // Organizers are considered active
      }));
    }

    const nextCursor = users.length === Number(limit) ? users[users.length - 1].id : null;

    // Aggregates
    const total = await prisma.user.count({ where });
    const active = await prisma.user.count({ where: { ...where, status: 'ACTIVE' } });
    const verifiedEmail = await prisma.user.count({ where: { ...where, emailVerified: true } });

    const maskedUsers = users.map(user => ({ ...user, phone: maskPhoneNumber(user.phone) }));

    // Combine users and organizers if requested
    const allItems = include_organizers === 'true' ? [...maskedUsers, ...organizers] : maskedUsers;

    return {
      items: allItems,
      page: { next_cursor: nextCursor },
      aggregates: { total, active, verified_email: verifiedEmail },
    };
  }

  static async getUserById(id: string, authUser?: { adminRole: string }) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        pushSubscriptions: true,

      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // User data ready for return

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

    // Get approved organizers to include in user export
    const organizers = await prisma.organizer.findMany({
      where: { approved: true },
      orderBy: orderBy.createdAt ? { createdAt: orderBy.createdAt } : { createdAt: 'desc' },
    });

    // Transform organizers to match user structure for export
    const organizersAsUsers = organizers.map(organizer => ({
      id: organizer.id,
      firstName: organizer.firstName,
      lastName: organizer.lastName,
      email: organizer.email,
      phone: organizer.phone,
      userType: 'ORGANIZER',
      adminRole: 'USER',
      status: 'ACTIVE',
      emailVerified: false, // Organizers don't have this field
      phoneVerified: organizer.phoneVerified,
      city: '', // Organizers don't have this field
      country: '', // Organizers don't have this field
      birthYear: null, // Organizers don't have this field
      marketingConsent: false, // Organizers don't have this field
      points: 0, // Organizers don't have this field
      createdAt: organizer.createdAt,
      updatedAt: organizer.updatedAt,
      lastLogin: organizer.lastLogin,
      lastSeenAt: null, // Organizers don't have this field
      company: organizer.company, // Additional field for organizers
      approved: organizer.approved, // Additional field for organizers
    }));

    // Combine users and approved organizers
    return [...users, ...organizersAsUsers];
  }

  static async getUnmaskedPhone(id: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { phone: true },
    });
    return user?.phone || null;
  }

  static async listOrganizers(query: any) {
    const { q, approved, sort, limit = 25, cursor } = query;

    const where: Prisma.OrganizerWhereInput = {};

    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (approved !== undefined) {
      where.approved = approved === 'true';
    }

    const orderBy: Prisma.OrganizerOrderByWithRelationInput = {};
    if (sort) {
      const [field, direction] = sort.startsWith('-') ? [sort.substring(1), 'desc'] : [sort, 'asc'];
      if (['createdAt', 'lastLogin', 'email', 'company', 'firstName', 'lastName'].includes(field)) {
        orderBy[field as keyof Prisma.OrganizerOrderByWithRelationInput] = direction as Prisma.SortOrder;
      }
    }

    const organizers = await prisma.organizer.findMany({
      where,
      orderBy,
      take: Number(limit),
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        events: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    const nextCursor = organizers.length === Number(limit) ? organizers[organizers.length - 1].id : null;

    // Aggregates
    const total = await prisma.organizer.count({ where });
    const approvedCount = await prisma.organizer.count({ where: { ...where, approved: true } });
    const pending = await prisma.organizer.count({ where: { ...where, approved: false } });

    const maskedOrganizers = organizers.map(organizer => ({
      ...organizer,
      phone: maskPhoneNumber(organizer.phone),
      events: organizer.events.length, // Just return count for list view
    }));

    return {
      items: maskedOrganizers,
      page: { next_cursor: nextCursor },
      aggregates: { total, approved: approvedCount, pending },
    };
  }

  static async getOrganizerById(id: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { id },
      include: {
        events: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            capacity: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    return organizer;
  }

  static async exportOrganizers(query: any) {
    const { q, approved, sort } = query;

    const where: Prisma.OrganizerWhereInput = {};

    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (approved !== undefined) {
      where.approved = approved === 'true';
    }

    const orderBy: Prisma.OrganizerOrderByWithRelationInput = {};
    if (sort) {
      const [field, direction] = sort.startsWith('-') ? [sort.substring(1), 'desc'] : [sort, 'asc'];
      if (['createdAt', 'lastLogin', 'email', 'company', 'firstName', 'lastName'].includes(field)) {
        orderBy[field as keyof Prisma.OrganizerOrderByWithRelationInput] = direction as Prisma.SortOrder;
      }
    }

    const organizers = await prisma.organizer.findMany({
      where,
      orderBy,
      include: {
        events: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return organizers.map(organizer => ({
      ...organizer,
      eventsCount: organizer.events.length,
      events: undefined, // Remove the events array for export
    }));
  }

  static async updateOrganizerApproval(id: string, approved: boolean) {
    const organizer = await prisma.organizer.findUnique({
      where: { id },
    });

    if (!organizer) {
      throw new Error('Organizer not found');
    }

    try {
      const updatedOrganizer = await prisma.organizer.update({
        where: { id, deletedAt: null },
        data: { approved },
      });
      
      return updatedOrganizer;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('Organizer not found');
      }
      throw error;
    }
  }

  static async getUserAttendedEvents(id: string, category?: string) {
    const where: any = {
      userId: id,
      status: 'USED', // Only events that the user actually attended
    };

    if (category) {
      where.event = {
        category: category,
      };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            startDate: true,
            endDate: true,
            venue: true,
            city: true,
          },
        },
      },
      orderBy: {
        event: {
          startDate: 'desc',
        },
      },
    });

    // Group events by category
    const eventsByCategory = tickets.reduce((acc, ticket) => {
      const eventCategory = ticket.event.category;
      if (!acc[eventCategory]) {
        acc[eventCategory] = [];
      }
      
      // Avoid duplicates (same event, multiple tickets)
      const existingEvent = acc[eventCategory].find(e => e.id === ticket.event.id);
      if (!existingEvent) {
        acc[eventCategory].push(ticket.event);
      }
      
      return acc;
    }, {} as Record<string, any[]>);

    return eventsByCategory;
  }

  static async updateUserRoles(id: string, userType?: string, adminRole?: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate userType
    const validUserTypes = ['USER', 'ADMIN', 'ORGANIZER'];
    if (userType && !validUserTypes.includes(userType)) {
      throw new Error('Invalid user type. Must be USER, ADMIN, or ORGANIZER');
    }

    // Validate adminRole
    const validAdminRoles = ['USER', 'ADMIN', 'SUPPORT', 'READONLY'];
    if (adminRole && !validAdminRoles.includes(adminRole)) {
      throw new Error('Invalid admin role. Must be USER, ADMIN, SUPPORT, or READONLY');
    }

    // Build update data
    const updateData: any = {};
    if (userType !== undefined) {
      updateData.userType = userType;
      // If userType is being set to USER, force adminRole to USER
      if (userType === 'USER') {
        updateData.adminRole = 'USER';
      }
    }
    if (adminRole !== undefined) {
      // Only set adminRole if userType is not being changed to USER
      if (userType !== 'USER') {
        updateData.adminRole = adminRole;
      }
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id, deletedAt: null },
        data: updateData,
      });
      
      return updatedUser;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('User not found');
      }
      throw error;
    }
  }
}

export default new AdminUserService();
