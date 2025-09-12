import { prisma } from '../../lib/prisma';
import { hashPassword } from '../../lib/crypto';
import { ExcelReportGenerator } from '../../lib/excelReport';
import type { AdminCreateOrganizerInput, OrganizerAdminUpdateInput, OrganizerSelfUpdateInput, OrganizerEventsQuery } from './organizer.dto';
import { SearchService } from '../search/search.service';

export class OrganizerService {
  static async listPublic(data: { page: number; limit: number; q?: string }) {
    const val = await SearchService.searchOrganizer(data);
    return val;
  }

  static async getPopularOrganizers(data: { page: number; limit: number; q?: string }) {
    const val = await SearchService.searchOrganizer(data);
    val.data.sort((a, b) => b._count.events - a._count.events);
    return val;
  }

  static async list(params: { page: number; limit: number; q?: string }) {
    const { page, limit, q } = params;
    const where: any = { deletedAt: null };
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' as const } },
        { company: { contains: q, mode: 'insensitive' as const } },
        { firstName: { contains: q, mode: 'insensitive' as const } },
        { lastName: { contains: q, mode: 'insensitive' as const } },
      ];
    }
    const [total, data] = await prisma.$transaction([
      prisma.organizer.count({ where }),
      prisma.organizer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          email: true,
          phone: true,
          phoneVerified: true,
          avatar: true,
          approved: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          taxNumber: true,
          taxOffice: true,
          address: true,
          bankAccount: true,
          events: {
            select: {
              id: true,
            },
          }
        },
      }),
    ]);
    return { data, page, limit, total };
  }

  static async findById(id: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        email: true,
        phone: true,
        phoneVerified: true,
        avatar: true,
        approved: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        taxNumber: true,
        taxOffice: true,
        address: true,
        bankAccount: true,
        socialMedia: true,
        events: {
          select: {
            id: true,
          },
        },
        favoriteUsers: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (!organizer) {
      const e: any = new Error('organizer not found');
      e.status = 404; e.code = 'NOT_FOUND';
      throw e;
    }
    return organizer;
  }

  static async adminCreate(data: AdminCreateOrganizerInput) {
    const exists = (await prisma.organizer.findUnique({ where: { email: data.email } }))
      || (await prisma.user.findUnique({ where: { email: data.email } }));
    if (exists) {
      const err: any = new Error('email already in use');
      err.status = 409; err.code = 'EMAIL_TAKEN';
      throw err;
    }

    const passwordHash = await hashPassword(data.password);
    const organizer = await prisma.organizer.create({
      data: {
        email: data.email,
        password: passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        phone: data.phone,
        taxNumber: data.taxNumber,
        taxOffice: data.taxOffice,
        address: data.address,
        bankAccount: data.bankAccount,
        avatar: data.avatar,
        phoneVerified: false,
        approved: false,
        devices: [],
      },
      select: {
        id: true, firstName: true, lastName: true, company: true, email: true, phone: true,
        phoneVerified: true, avatar: true, approved: true, lastLogin: true, createdAt: true, updatedAt: true,
        taxNumber: true, taxOffice: true, address: true, bankAccount: true,
      },
    });
    return organizer;
  }

  static async selfUpdate(id: string, data: OrganizerSelfUpdateInput) {
    return prisma.organizer.update({
      where: { id },
      data,
      select: {
        id: true, firstName: true, lastName: true, company: true, email: true, phone: true,
        phoneVerified: true, avatar: true, approved: true, lastLogin: true, createdAt: true, updatedAt: true,
        taxNumber: true, taxOffice: true, address: true, bankAccount: true,
      },
    });
  }

  static async adminUpdate(id: string, data: OrganizerAdminUpdateInput) {
    try {
      return await prisma.organizer.update({
        where: { id },
        data,
        select: {
          id: true, firstName: true, lastName: true, company: true, email: true, phone: true,
          phoneVerified: true, avatar: true, approved: true, lastLogin: true, createdAt: true, updatedAt: true,
          taxNumber: true, taxOffice: true, address: true, bankAccount: true,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        const err: any = new Error('email already in use');
        err.status = 409; err.code = 'EMAIL_TAKEN';
        throw err;
      }
      throw e;
    }
  }

  static async softDelete(id: string) {
    return prisma.organizer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  static async setApproval(id: string, approved: boolean) {
    return prisma.organizer.update({
      where: { id },
      data: { approved },
      select: {
        id: true, firstName: true, lastName: true, company: true, email: true, phone: true,
        phoneVerified: true, avatar: true, approved: true, lastLogin: true, createdAt: true, updatedAt: true,
        taxNumber: true, taxOffice: true, address: true, bankAccount: true,
      },
    });
  }

  static async sendFollowRequest(organizerId: string, userId: string) {
    return prisma.favoriteOrganizer.create({ data: { userId, organizerId } });
  }

  static async cancelFollowRequest(organizerId: string, userId: string) {
    return prisma.favoriteOrganizer.delete({ where: { userId_organizerId: { userId, organizerId } } });
  }

  static async generateEventReport(organizerId: string, eventId: string) {
    // Verify that the event belongs to the organizer
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId: organizerId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        category: true,
        startDate: true,
        endDate: true,
        venue: true,
        city: true,
        status: true,
      },
    });

    if (!event) {
      const e: any = new Error('event not found or not owned by organizer');
      e.status = 404; e.code = 'NOT_FOUND';
      throw e;
    }

    // Get organizer info
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        email: true,
        phone: true,
      },
    });

    if (!organizer) {
      const e: any = new Error('organizer not found');
      e.status = 404; e.code = 'NOT_FOUND';
      throw e;
    }

    // Get tickets for the event
    const tickets = await prisma.ticket.findMany({
      where: { eventId: eventId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate statistics
    const totalTickets = tickets.length;
    const usedTickets = tickets.filter(t => t.status === 'USED').length;
    const cancelledTickets = tickets.filter(t => t.status === 'CANCELLED').length;
    const totalRevenue = tickets.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    const averagePrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    // Calculate ticket type breakdown
    const ticketTypeMap: { [key: string]: { count: number; used: number; cancelled: number; revenue: number } } = {};
    tickets.forEach(ticket => {
      const type = ticket.ticketType || 'Unknown';
      if (!ticketTypeMap[type]) {
        ticketTypeMap[type] = { count: 0, used: 0, cancelled: 0, revenue: 0 };
      }
      ticketTypeMap[type].count++;
      ticketTypeMap[type].revenue += Number(ticket.price) || 0;
      if (ticket.status === 'USED') {
        ticketTypeMap[type].used++;
      } else if (ticket.status === 'CANCELLED') {
        ticketTypeMap[type].cancelled++;
      }
    });

    const ticketTypeBreakdown = Object.entries(ticketTypeMap).map(([type, data]) => ({
      type,
      count: data.count,
      used: data.used,
      cancelled: data.cancelled,
      revenue: data.revenue,
      averagePrice: data.count > 0 ? data.revenue / data.count : 0,
    }));

    // Calculate sales over time (daily breakdown)
    const salesMap: { [key: string]: { count: number; revenue: number } } = {};
    tickets.forEach(ticket => {
      const date = ticket.createdAt.toISOString().split('T')[0];
      if (!salesMap[date]) {
        salesMap[date] = { count: 0, revenue: 0 };
      }
      salesMap[date].count++;
      salesMap[date].revenue += Number(ticket.price) || 0;
    });

    const salesOverTime = Object.entries(salesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        count: data.count,
        revenue: data.revenue,
      }));

    const stats = {
      totalTickets,
      usedTickets,
      cancelledTickets,
      totalRevenue,
      averagePrice,
      ticketTypeBreakdown,
      salesOverTime,
      usageStats: {
        usagePercentage: totalTickets > 0 ? (usedTickets / totalTickets) * 100 : 0,
        remainingTickets: totalTickets - usedTickets - cancelledTickets,
      },
    };

    // Convert to format expected by Excel generator
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      type: ticket.ticketType || 'Unknown',
      price: Number(ticket.price) || 0,
      status: ticket.status,
      purchaseDate: ticket.createdAt,
      entryTime: ticket.entryTime || undefined,
      userId: ticket.userId,
      user: ticket.user ? {
        firstName: ticket.user.firstName,
        lastName: ticket.user.lastName,
        email: ticket.user.email,
        phone: ticket.user.phone,
      } : undefined,
    }));

    // Generate Excel report
    const reportGenerator = new ExcelReportGenerator();
    const workbook = await reportGenerator.generateEventReport(event, formattedTickets, stats, organizer);

    // Generate filename
    const fileName = `${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_Rapor_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.xlsx`;

    return { workbook, fileName };
  }

  static async getOrganizerEvents(organizerId: string, params: OrganizerEventsQuery) {
    const { page, limit, q, category, city, status, dateFrom, dateTo } = params;
    
    // Build where clause for organizer's events
    const where: any = { 
      organizerId, 
      deletedAt: null 
    };
    
    // Apply filters
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { venue: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }
    
    if (category) {
      const categories = category.split(',');
      where.category = categories.length === 1 ? categories[0] : { in: categories };
    }
    
    if (status) {
      where.status = status;
    }
    
    // Date filtering - handle individual dates and date ranges
    if (dateFrom || dateTo) {
      where.AND = where.AND || [];
      
      // If dateFrom is provided, event should start on or after this date
      if (dateFrom) {
        where.AND.push({
          startDate: {
            gte: new Date(dateFrom)
          }
        });
      }
      
      // If dateTo is provided, event should start on or before this date
      if (dateTo) {
        where.AND.push({
          startDate: {
            lte: new Date(dateTo)
          }
        });
      }
    }
    
    // Get events with pagination
    const [total, data] = await prisma.$transaction([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          startDate: true,
          endDate: true,
          venue: true,
          address: true,
          city: true,
          banner: true,
          description: true,
          status: true,
          organizerId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);
    
    return { page, limit, total, data };
  }
}

export function sanitizeOrganizer(o: any) {
  return {
    id: o.id,
    firstName: o.firstName,
    lastName: o.lastName,
    company: o.company,
    phone: o.phone,
    phoneVerified: o.phoneVerified,
    avatar: o.avatar,
    email: o.email,
    approved: o.approved,
    lastLogin: o.lastLogin,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    taxNumber: (o as any).taxNumber,
    taxOffice: (o as any).taxOffice,
    address: (o as any).address,
    bankAccount: (o as any).bankAccount,
  };
}


