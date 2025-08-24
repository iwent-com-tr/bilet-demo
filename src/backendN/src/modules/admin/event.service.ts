import { prisma } from '../../lib/prisma';
import { Prisma } from '@prisma/client';

function decimalToNumber(d?: any): number {
  if (!d) return 0;
  if (typeof d === 'number') return d;
  try { return parseFloat(d.toString()); } catch { return 0; }
}

export class AdminEventService {
  static async listEvents(query: any) {
    const { q, organizer_id, status, category, city, date_from, date_to, sort = '-startDate', limit = 25, cursor } = query;

    const where: Prisma.EventWhereInput = { deletedAt: null };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { venue: { contains: q, mode: 'insensitive' } },
        { organizer: { company: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (organizer_id) where.organizerId = organizer_id;
    if (status) where.status = status as any;
    if (category) where.category = category as any;
    if (city) where.city = { contains: city, mode: 'insensitive' } as any;
    if (date_from || date_to) {
      where.startDate = {
        gte: date_from ? new Date(date_from) : undefined,
        lte: date_to ? new Date(date_to) : undefined,
      } as Prisma.DateTimeFilter;
    }

    const orderBy: Prisma.EventOrderByWithRelationInput = {};
    if (sort) {
      const [field, direction] = sort.startsWith('-') ? [sort.substring(1), 'desc'] : [sort, 'asc'];
      if (['startDate', 'endDate', 'createdAt', 'name', 'city', 'status'].includes(field)) {
        (orderBy as any)[field] = direction;
      } else {
        (orderBy as any).startDate = 'desc';
      }
    }

    const events = await prisma.event.findMany({
      where,
      orderBy,
      take: Number(limit),
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      include: {
        organizer: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });

    const nextCursor = events.length === Number(limit) ? events[events.length - 1].id : null;

    // Compute stats per event (sold tickets, used entries, revenue)
    const items = await Promise.all(events.map(async (e) => {
      const [sold, used, revenueAgg] = await Promise.all([
        prisma.ticket.count({ where: { eventId: e.id, status: { in: ['ACTIVE', 'USED'] } } }),
        prisma.ticket.count({ where: { eventId: e.id, status: 'USED' } }),
        prisma.ticket.aggregate({ where: { eventId: e.id, status: { in: ['ACTIVE', 'USED'] } }, _sum: { price: true } }),
      ]);

      const revenue = decimalToNumber((revenueAgg as any)._sum?.price);
      const isCompleted = e.status === 'COMPLETED' || (e.endDate ? new Date(e.endDate) < new Date() : false);
      return { ...e, stats: { soldTickets: sold, usedEntries: used, revenue, isCompleted } };
    }));

    // Aggregates
    const total = await prisma.event.count({ where });
    const active = await prisma.event.count({ where: { ...where, status: 'ACTIVE' } });
    const completed = await prisma.event.count({ where: { ...where, status: 'COMPLETED' } });

    return { items, page: { next_cursor: nextCursor }, aggregates: { total, active, completed } };
  }

  static async getEventById(id: string) {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, firstName: true, lastName: true, company: true, email: true, phone: true } },
      },
    });
    if (!event) throw new Error('Event not found');

    const stats = await this.getStats(id);
    return { ...event, stats };
  }

  static async getStats(id: string) {
    const [sold, used, revenueAgg] = await Promise.all([
      prisma.ticket.count({ where: { eventId: id, status: { in: ['ACTIVE', 'USED'] } } }),
      prisma.ticket.count({ where: { eventId: id, status: 'USED' } }),
      prisma.ticket.aggregate({ where: { eventId: id, status: { in: ['ACTIVE', 'USED'] } }, _sum: { price: true } }),
    ]);
    const revenue = decimalToNumber((revenueAgg as any)._sum?.price);

    // Capacity & utilization
    const ev = await prisma.event.findUnique({ where: { id }, select: { capacity: true, status: true, endDate: true } });
    const utilization = ev?.capacity ? Math.min(100, Math.round(((sold || 0) / (ev.capacity || 1)) * 100)) : null;
    const isCompleted = (ev?.status === 'COMPLETED') || (!!ev?.endDate && new Date(ev.endDate) < new Date());

    return { soldTickets: sold, usedEntries: used, revenue, capacity: ev?.capacity ?? null, utilization, isCompleted };
  }

  static async exportEvents(query: any) {
    const { q, organizer_id, status, category, city, date_from, date_to, sort = '-startDate' } = query;

    const where: Prisma.EventWhereInput = { deletedAt: null };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { venue: { contains: q, mode: 'insensitive' } },
        { organizer: { company: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (organizer_id) where.organizerId = organizer_id;
    if (status) where.status = status as any;
    if (category) where.category = category as any;
    if (city) where.city = { contains: city, mode: 'insensitive' } as any;
    if (date_from || date_to) {
      where.startDate = {
        gte: date_from ? new Date(date_from) : undefined,
        lte: date_to ? new Date(date_to) : undefined,
      } as Prisma.DateTimeFilter;
    }

    const orderBy: Prisma.EventOrderByWithRelationInput = {};
    if (sort) {
      const [field, direction] = sort.startsWith('-') ? [sort.substring(1), 'desc'] : [sort, 'asc'];
      if (['startDate', 'endDate', 'createdAt', 'name', 'city', 'status'].includes(field)) {
        (orderBy as any)[field] = direction;
      } else {
        (orderBy as any).startDate = 'desc';
      }
    }

    const events = await prisma.event.findMany({
      where,
      orderBy,
      include: { organizer: { select: { id: true, company: true } } },
    });

    const rows = await Promise.all(events.map(async (e) => {
      const [sold, used, revenueAgg] = await Promise.all([
        prisma.ticket.count({ where: { eventId: e.id, status: { in: ['ACTIVE', 'USED'] } } }),
        prisma.ticket.count({ where: { eventId: e.id, status: 'USED' } }),
        prisma.ticket.aggregate({ where: { eventId: e.id, status: { in: ['ACTIVE', 'USED'] } }, _sum: { price: true } }),
      ]);
      const revenue = decimalToNumber((revenueAgg as any)._sum?.price);
      return {
        id: e.id,
        name: e.name,
        category: e.category,
        status: e.status,
        city: e.city,
        venue: e.venue,
        startDate: e.startDate,
        endDate: e.endDate,
        organizerCompany: e.organizer?.company || '',
        soldTickets: sold,
        usedEntries: used,
        revenue,
        createdAt: e.createdAt,
      };
    }));

    return rows;
  }
}

export default new AdminEventService();

