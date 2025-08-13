import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { CreateEventInput, ListEventsQuery, UpdateEventInput, EventStats } from './event.dto';
import { EventStatuses } from './event.dto';
import { EVENT_CATEGORIES } from '../constants';
import { notifyEventCreated } from '../../chat';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function generateUniqueSlug(base: string): Promise<string> {
  const initial = slugify(base);
  const existing = await prisma.event.findMany({
    where: { slug: { startsWith: initial } },
    select: { slug: true },
  });
  if (existing.length === 0) return initial;
  const taken = new Set(existing.map((e: { slug: string }) => e.slug));
  let i = 1;
  while (taken.has(`${initial}-${i}`)) i += 1;
  return `${initial}-${i}`;
}

function buildEventWhere(filters: ListEventsQuery): any /* Prisma.EventWhereInput */ {
  const where: any = { deletedAt: null };
  if (filters.q) {
    (where as any).OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
      { city: { contains: filters.q, mode: 'insensitive' } },
      { venue: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' } as any;
  if (filters.organizerId) where.organizerId = filters.organizerId;
  if (filters.status) where.status = filters.status;
  if (filters.category) {
    where.category = Array.isArray(filters.category)
      ? { in: filters.category }
      : (filters.category as any);
  }
  if (filters.dateFrom || filters.dateTo) {
    where.startDate = {
      gte: filters.dateFrom,
      lte: filters.dateTo,
    } as any;
  }
  return where;
}

async function loadCategoryDetails(eventId: string, category: typeof EVENT_CATEGORIES[number]) {
  switch (category) {
    case 'CONCERT': return prisma.concertDetails.findUnique({ where: { eventId } });
    case 'FESTIVAL': return prisma.festivalDetails.findUnique({ where: { eventId } });
    case 'UNIVERSITY': return prisma.universityDetails.findUnique({ where: { eventId } });
    case 'WORKSHOP': return prisma.workshopDetails.findUnique({ where: { eventId } });
    case 'CONFERENCE': return prisma.conferenceDetails.findUnique({ where: { eventId } });
    case 'SPORT': return prisma.sportDetails.findUnique({ where: { eventId } });
    case 'PERFORMANCE': return prisma.performanceDetails.findUnique({ where: { eventId } });
    case 'EDUCATION': return prisma.educationDetails.findUnique({ where: { eventId } });
    default: return null;
  }
}

async function upsertCategoryDetails(eventId: string, category: typeof EVENT_CATEGORIES[number], details?: Record<string, unknown>) {
  if (!details) return;
  switch (category) {
    case 'CONCERT':
      await prisma.concertDetails.upsert({
        where: { eventId },
        update: details as any,
        create: { eventId, ...(details as any) },
      });
      break;
    case 'FESTIVAL':
      await prisma.festivalDetails.upsert({ where: { eventId }, update: details as any, create: { eventId, ...(details as any) } });
      break;
    case 'UNIVERSITY':
      await prisma.universityDetails.upsert({ where: { eventId }, update: details as any, create: { eventId, ...(details as any) } });
      break;
    case 'WORKSHOP':
      await prisma.workshopDetails.upsert({ where: { eventId }, update: details as any, create: { eventId, ...(details as any) } });
      break;
    case 'CONFERENCE':
      await prisma.conferenceDetails.upsert({ where: { eventId }, update: details as any, create: { eventId, ...(details as any) } });
      break;
    case 'SPORT':
      await prisma.sportDetails.upsert({ where: { eventId }, update: details as any, create: { eventId, ...(details as any) } });
      break;
    case 'PERFORMANCE':
      await prisma.performanceDetails.upsert({ where: { eventId }, update: details as any, create: { eventId, ...(details as any) } });
      break;
    case 'EDUCATION':
      await prisma.educationDetails.upsert({ where: { eventId }, update: details as any, create: { eventId, ...(details as any) } });
      break;
  }
}

async function getCategoryDetails(eventId: string, category: typeof EVENT_CATEGORIES[number]) {
  return loadCategoryDetails(eventId, category);
}

export class EventService {
  static async list(filters: ListEventsQuery) {
    const { page, limit } = filters;
    const where = buildEventWhere(filters);
    const [total, data] = await prisma.$transaction([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'asc' },
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

  static async findById(id: string) {
    const event = await prisma.event.findFirst({ where: { id, deletedAt: null } });
    if (!event) {
      const e: any = new Error('event not found');
      e.status = 404; e.code = 'NOT_FOUND';
      throw e;
    }
    const details = await loadCategoryDetails(event.id, event.category);
    return { ...event, details } as const;
  }

  static async findBySlug(slug: string) {
    const event = await prisma.event.findFirst({ where: { slug, deletedAt: null } });
    if (!event) {
      const e: any = new Error('event not found');
      e.status = 404; e.code = 'NOT_FOUND';
      throw e;
    }
    const details = await loadCategoryDetails(event.id, event.category);
    return { ...event, details } as const;
  }

  static async create(input: CreateEventInput & { organizerId: string }) {
    if (input.endDate < input.startDate) {
      const e: any = new Error('endDate cannot be earlier than startDate');
      e.status = 400; e.code = 'INVALID_DATE_RANGE';
      throw e;
    }
    const slug = await generateUniqueSlug(`${input.name}`);
    const created = await prisma.event.create({
      data: {
        name: input.name,
        slug,
        category: input.category,
        startDate: input.startDate,
        endDate: input.endDate,
        venue: input.venue,
        address: input.address,
        city: input.city,
        banner: input.banner,
        socialMedia: (input.socialMedia ?? {}) as any,
        description: input.description,
        capacity: input.capacity,
        ticketTypes: (input.ticketTypes ?? []) as any,
        organizerId: input.organizerId,
        status: 'DRAFT',
      },
    });
    await upsertCategoryDetails(created.id, created.category, input.details as any);
    const details = await loadCategoryDetails(created.id, created.category);
    // Notify chat layer that the event room is ready
    try { await notifyEventCreated(created.id); } catch {}
    return { ...created, details } as const;
  }

  static async update(id: string, input: UpdateEventInput) {
    const existing = await prisma.event.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      const e: any = new Error('event not found');
      e.status = 404; e.code = 'NOT_FOUND';
      throw e;
    }
    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      const e: any = new Error('endDate cannot be earlier than startDate');
      e.status = 400; e.code = 'INVALID_DATE_RANGE';
      throw e;
    }
    if ((input as any).category && (input as any).category !== existing.category) {
      const e: any = new Error('category change is not allowed');
      e.status = 400; e.code = 'CATEGORY_IMMUTABLE';
      throw e;
    }
    
    // Validate ticket capacities against event capacity
    if (input.ticketTypes && input.ticketTypes.length > 0) {
      const eventCapacity = input.capacity ?? existing.capacity;
      if (eventCapacity) {
        const totalTicketCapacity = input.ticketTypes.reduce((sum: number, ticket: any) => sum + ticket.capacity, 0);
        if (totalTicketCapacity > eventCapacity) {
          const e: any = new Error(`Bilet kapasiteleri toplamı (${totalTicketCapacity}) etkinlik kapasitesini (${eventCapacity}) aşamaz.`);
          e.status = 400; e.code = 'CAPACITY_EXCEEDED';
          throw e;
        }
      }
    }
    const updated = await prisma.event.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        startDate: input.startDate ?? undefined,
        endDate: input.endDate ?? undefined,
        venue: input.venue ?? undefined,
        address: input.address ?? undefined,
        city: input.city ?? undefined,
        banner: input.banner ?? undefined,
        socialMedia: input.socialMedia as any,
        description: input.description ?? undefined,
        capacity: input.capacity ?? undefined,
        ticketTypes: input.ticketTypes as any,
        status: input.status ?? undefined,
      },
    });
    if (input.details) await upsertCategoryDetails(id, updated.category, input.details as any);
    const details = await loadCategoryDetails(id, updated.category);
    return { ...updated, details } as const;
  }

  static async softDelete(id: string) {
    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  static async publish(id: string) {
    const event = await prisma.event.update({ where: { id }, data: { status: 'ACTIVE' } });
    const details = await loadCategoryDetails(id, event.category);
    return { ...event, details };
  }

  static async unpublish(id: string) {
    const event = await prisma.event.update({ where: { id }, data: { status: 'DRAFT' } });
    const details = await loadCategoryDetails(id, event.category);
    return { ...event, details };
  }

  static async updateCategoryDetails(id: string, category: typeof EVENT_CATEGORIES[number], details: Record<string, unknown>) {
    await upsertCategoryDetails(id, category, details);
    return getCategoryDetails(id, category);
  }

  static async getEventStats(eventId: string): Promise<EventStats> {
    // Verify event exists
    const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) {
      const e: any = new Error('event not found');
      e.status = 404; e.code = 'NOT_FOUND';
      throw e;
    }

    // Get all tickets for this event
    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      select: {
        id: true,
        ticketType: true,
        price: true,
        status: true,
        entryTime: true,
        createdAt: true,
      },
    });

    // Calculate basic stats
    const totalTickets = tickets.length;
    const usedTickets = tickets.filter(t => t.status === 'USED').length;
    const cancelledTickets = tickets.filter(t => t.status === 'CANCELLED').length;
    const totalRevenue = tickets
      .filter(t => t.status !== 'CANCELLED')
      .reduce((sum, t) => sum + Number(t.price), 0);
    const averagePrice = totalTickets > 0 ? totalRevenue / (totalTickets - cancelledTickets) : 0;

    // Ticket type breakdown
    const typeMap = new Map<string, { count: number; used: number; cancelled: number; revenue: number }>();
    
    tickets.forEach(ticket => {
      const type = ticket.ticketType;
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, used: 0, cancelled: 0, revenue: 0 });
      }
      const stats = typeMap.get(type)!;
      stats.count++;
      if (ticket.status === 'USED') stats.used++;
      if (ticket.status === 'CANCELLED') stats.cancelled++;
      if (ticket.status !== 'CANCELLED') stats.revenue += Number(ticket.price);
    });

    const ticketTypeBreakdown = Array.from(typeMap.entries()).map(([type, stats]) => ({
      type,
      count: stats.count,
      used: stats.used,
      cancelled: stats.cancelled,
      revenue: stats.revenue,
      averagePrice: stats.count > 0 ? stats.revenue / (stats.count - stats.cancelled) : 0,
    }));

    // Sales over time (by day)
    const salesByDay = new Map<string, { count: number; revenue: number }>();
    tickets
      .filter(t => t.status !== 'CANCELLED')
      .forEach(ticket => {
        const day = ticket.createdAt.toISOString().split('T')[0];
        if (!salesByDay.has(day)) {
          salesByDay.set(day, { count: 0, revenue: 0 });
        }
        const dayStats = salesByDay.get(day)!;
        dayStats.count++;
        dayStats.revenue += Number(ticket.price);
      });

    const salesOverTime = Array.from(salesByDay.entries())
      .map(([date, stats]) => ({ date, count: stats.count, revenue: stats.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Usage stats
    const usagePercentage = totalTickets > 0 ? Math.round((usedTickets / totalTickets) * 100) : 0;
    const remainingTickets = totalTickets - usedTickets - cancelledTickets;

    // Peak entry time (hour of day when most tickets were used)
    const entryTimes = tickets
      .filter(t => t.status === 'USED' && t.entryTime)
      .map(t => t.entryTime!.getHours());
    
    let peakEntryTime: string | undefined;
    if (entryTimes.length > 0) {
      const hourCounts = new Map<number, number>();
      entryTimes.forEach(hour => {
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
      const peakHour = Array.from(hourCounts.entries())
        .reduce((max, current) => current[1] > max[1] ? current : max)[0];
      peakEntryTime = `${peakHour.toString().padStart(2, '0')}:00`;
    }

    return {
      totalTickets,
      usedTickets,
      cancelledTickets,
      totalRevenue,
      averagePrice: Math.round(averagePrice * 100) / 100, // Round to 2 decimal places
      ticketTypeBreakdown,
      salesOverTime,
      usageStats: {
        usagePercentage,
        remainingTickets,
        peakEntryTime,
      },
    };
  }
}

export function sanitizeEvent(e: any) {
  // Ensure JSON fields are properly parsed
  let socialMedia = e.socialMedia ?? {};
  if (typeof socialMedia === 'string') {
    try {
      socialMedia = JSON.parse(socialMedia);
    } catch (err) {
      socialMedia = {};
    }
  }
  
  let ticketTypes = e.ticketTypes ?? [];
  if (typeof ticketTypes === 'string') {
    try {
      ticketTypes = JSON.parse(ticketTypes);
    } catch (err) {
      ticketTypes = [];
    }
  }
  
  return {
    id: e.id,
    name: e.name,
    slug: e.slug,
    category: e.category,
    startDate: e.startDate,
    endDate: e.endDate,
    venue: e.venue,
    address: e.address,
    city: e.city,
    banner: e.banner,
    socialMedia: socialMedia,
    description: e.description,
    capacity: e.capacity,
    ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : [],
    status: e.status,
    organizerId: e.organizerId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    details: e.details ?? undefined,
  };
}


