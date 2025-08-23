import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { CreateEventInput, ListEventsQuery, UpdateEventInput, EventStats } from './event.dto';
import { EventStatuses } from './event.dto';
import { EVENT_CATEGORIES } from '../constants';
import { notifyEventCreated, notifyEventPublished } from '../../chat';
import { eventIndex } from '../../lib/meili';
import { EventChangeDetector } from '../../lib/event-change-detector';
import { notificationService } from '../../lib/queue/notification.service';
import { fi } from 'zod/v4/locales/index.cjs';

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

async function getEventIdsWithFilters(filters: ListEventsQuery) /* Prisma.EventWhereInput */ {

  let queryResults: any = undefined;

  let filter: any[] = [
      `status=${filters.status || 'ACTIVE'}`
  ];

  if (filters.dateFrom && filters.dateTo) {
    filter.push(`startDate >= ${filters.dateFrom} AND startDate <= ${filters.dateTo}`);
  }

  if (filters.city) {
    filter.push(`city=${filters.city}`);
  }

  if (filters.category) {
    filter.push(filters.category.split(',').map((c: string) => `category=${c}`).join(' OR '));
  }


  const searchDetails = {
      limit: filters.limit,
      offset: filters.limit * (filters.page - 1),
      filter,
    };

  if (filters.q){
    queryResults = await eventIndex.search(filters.q, searchDetails)
  } else {
    queryResults = await eventIndex.getDocuments(searchDetails);
  }

  return [ queryResults.estimatedTotalHits || queryResults.total, (queryResults.hits || queryResults.results).map((hit: any) => hit.id.toString()) ];
}

// deprecated

// function buildEventWhere(filters: ListEventsQuery): any /* Prisma.EventWhereInput */ {
//   const where: any = { deletedAt: null };
//   if (filters.q) {
//     (where as any).OR = [
//       { name: { contains: filters.q, mode: 'insensitive' } },
//       { description: { contains: filters.q, mode: 'insensitive' } },
//       { city: { contains: filters.q, mode: 'insensitive' } },
//       { venue: { contains: filters.q, mode: 'insensitive' } },
//     ];
//   }
//   if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' } as any;
//   if (filters.organizerId) where.organizerId = filters.organizerId;
//   if (filters.status) where.status = filters.status;
//   if (filters.category) {
//     where.category = Array.isArray(filters.category)
//       ? { in: filters.category }
//       : (filters.category as any);
//   }
//   if (filters.dateFrom || filters.dateTo) {
//     where.startDate = {
//       gte: filters.dateFrom,
//       lte: filters.dateTo,
//     } as any;
//   }
//   return where;
// }

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

async function generateCreateInfos(input: CreateEventInput) {
  const slug = await generateUniqueSlug(`${input.name}`);

  const createInfoMeili = {
      name: input.name,
      category: input.category,
      startDate: input.startDate,
      endDate: input.endDate,
      venue: input.venue,
      address: input.address,
      city: input.city,
      description: input.description,
    }

    const createInfoPrisma = {
      ...createInfoMeili,
      slug,
      banner: input.banner,
      socialMedia: (input.socialMedia ?? {}) as any,
      capacity: input.capacity,
      ticketTypes: (input.ticketTypes ?? []) as any,
      status: 'DRAFT',
      organizerId: input.organizerId,
    };

  return [createInfoMeili, createInfoPrisma];
}

async function generateUpdateInfos(input: UpdateEventInput) {

  const updateInfoMeili = {
      name: input.name ?? undefined,
      startDate: input.startDate ?? undefined,
      endDate: input.endDate ?? undefined,
      venue: input.venue ?? undefined,
      address: input.address ?? undefined,
      city: input.city ?? undefined,
      description: input.description ?? undefined,
    }

    const updateInfoPrisma = {
      ...updateInfoMeili,
      banner: input.banner ?? undefined,
      socialMedia: input.socialMedia as any,
      capacity: input.capacity ?? undefined,
      ticketTypes: input.ticketTypes as any,
      status: input.status ?? undefined,
    };

  return [updateInfoMeili, updateInfoPrisma];
}


export class EventService {
  static async list(filters: ListEventsQuery) {
    const { page, limit } = filters;
    const [total, ids] = await getEventIdsWithFilters(filters);

    const data = await prisma.event.findMany({
      where: { id: { in: ids as string[] } },
      take: limit,
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
    });

    // Reorder to match Meilisearch order
    const dataById = new Map(data.map(d => [d.id, d]))
    const ordered = (ids as string[]).map(id => dataById.get(id));

    // NOT: Burada transaction kullanılarak 2 tane query yapılıyo. Bunun yerine tek bir query
    // yapılıp sonra limit kadar data alınabilir.

    // const [total, data] = await prisma.$transaction([
    //   prisma.event.count({ where }),
    //   prisma.event.findMany({
    //     where,
    //     skip: (page - 1) * limit,
    //     take: limit,
    //     orderBy: { startDate: 'asc' },
    //     select: {
    //       id: true,
    //       name: true,
    //       slug: true,
    //       category: true,
    //       startDate: true,
    //       endDate: true,
    //       venue: true,
    //       address: true,
    //       city: true,
    //       banner: true,
    //       description: true,
    //       status: true,
    //       organizerId: true,
    //       createdAt: true,
    //       updatedAt: true,
    //     },
    //   }),
    // ]);

    return { page, limit, total, data: ordered };
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

    const [createInfoMeili, createInfoPrisma] = await generateCreateInfos(input);

    const created = await prisma.event.create({
      data: createInfoPrisma as any, // ts ile uğraşmamak için
    });
    await upsertCategoryDetails(created.id, created.category, input.details as any);
    const details = await loadCategoryDetails(created.id, created.category);

    // Add the event to the meilisearch index
    eventIndex.addDocuments([{id: created.id, ...createInfoMeili}]);

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

    // Detect changes for notification purposes
    const changeDetection = EventChangeDetector.detectChanges(existing, input);

    const [updateInfoMeili, updateInfoPrisma] = await generateUpdateInfos(input);

    const updated = await prisma.event.update({
      where: { id },
      data: updateInfoPrisma as any, // ts ile uğraşmamak için
    });

    // Update the event in the meilisearch index
    eventIndex.updateDocuments([{id, ...updateInfoMeili}]);

    // Queue notification if significant changes detected and event is published
    if (changeDetection.requiresNotification && existing.status === 'ACTIVE') {
      try {
        await notificationService.queueEventUpdateNotification({
          eventId: id,
          changeType: changeDetection.changeType,
          changes: changeDetection.changes,
        });
        console.log(`Queued notification for event ${id} due to ${changeDetection.changeType}`);
      } catch (error) {
        console.error(`Failed to queue notification for event ${id}:`, error);
        // Don't fail the update if notification queuing fails
      }
    }

    if (input.details) await upsertCategoryDetails(id, updated.category, input.details as any);
    const details = await loadCategoryDetails(id, updated.category);
    return { ...updated, details } as const;
  }

  static async softDelete(id: string) {

    // Delete from search index
    await eventIndex.deleteDocument(id);

    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  static async publish(id: string) {
    const existingEvent = await prisma.event.findFirst({ where: { id, deletedAt: null } });
    if (!existingEvent) {
      const e: any = new Error('event not found');
      e.status = 404; e.code = 'NOT_FOUND';
      throw e;
    }

    const event = await prisma.event.update({ where: { id }, data: { status: 'ACTIVE' } });
    const details = await loadCategoryDetails(id, event.category);

    // Update the event in the meilisearch index
    await eventIndex.updateDocuments([{id, status: 'ACTIVE'}]);

    // Queue new event notification if this is the first time publishing
    if (EventChangeDetector.shouldNotifyForPublication(existingEvent.status, 'ACTIVE')) {
      try {
        await notificationService.queueNewEventNotification({
          eventId: id,
        });
        console.log(`Queued new event notification for event ${id}`);
      } catch (error) {
        console.error(`Failed to queue new event notification for event ${id}:`, error);
        // Don't fail the publish if notification queuing fails
      }
    }

    // Notify chat system that event is published and chat room should be available
    try { 
      await notifyEventPublished(id); 
    } catch (error) {
      console.error('Failed to notify chat system about event publication:', error);
    }
    
    return { ...event, details };
  }

  static async unpublish(id: string) {

    // Update the event in the meilisearch index
    await eventIndex.updateDocuments([{id, status: 'DRAFT'}]);

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
  if (!e) return null;
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


