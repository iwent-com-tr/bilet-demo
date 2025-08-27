import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { CreateEventInput, ListEventsQuery, UpdateEventInput, EventStats } from './event.dto';
import { EVENT_CATEGORIES } from '../constants';
import { notifyEventCreated, notifyEventPublished } from '../../chat';
import { eventIndex } from '../../lib/meili';
import { oneSignalService } from '../push-notification/onesignal.service';
import { generateUniqueEventSlug } from '../publicServices/slug.service';
import { generateEventCreateInfos, generateEventUpdateInfos } from '../publicServices/createInfo.service';

async function getEventIdsWithFilters(filters: ListEventsQuery) {
  // Try MeiliSearch first, with database fallback for reliability
  let queryResults: any = undefined;
  let shouldFallbackToDatabase = false;

  // Build MeiliSearch filter
  let filter: any[] = [];
  const hasQuery = Boolean(filters.q && filters.q.trim().length > 0);
  const defaultStatuses = ['ACTIVE'];
  if (filters.status) {
    filter.push(`status=${filters.status}`);
  } else {
    // When no explicit status filter, allow ACTIVE 
    filter.push(defaultStatuses.map(s => `status=${s}`).join(' OR '));
  }

  if (filters.dateFrom && filters.dateTo) {
    filter.push(`startDate >= ${filters.dateFrom} AND startDate <= ${filters.dateTo}`);
  }

  if (filters.city) {
    filter.push(`city=${filters.city}`);
  }

  if (filters.category) {
    filter.push(filters.category.split(',').map((c: string) => `category=${c}`).join(' OR '));
  }

  if (filters.organizerId) {
    filter.push(`organizerId=${filters.organizerId}`);
  }

  const searchDetails = {
    limit: filters.limit,
    offset: filters.limit * (filters.page - 1),
    filter,
  };

  // If no search query, prefer reliable DB listing to avoid index staleness
  if (!hasQuery) {
    shouldFallbackToDatabase = true;
  } else {
    // Try MeiliSearch with improved error handling
    try {
      const query = filters.q || '';
      queryResults = await eventIndex.search(query, searchDetails);
      
      const hits = queryResults.hits || [];
      const total = queryResults.estimatedTotalHits || 0;
      
      // Check if MeiliSearch returned valid and consistent results
      if (hits.length > 0 || (total === 0 && hits.length === 0)) {
        console.log(`MeiliSearch: Found ${total} total events, returning ${hits.length} hits`);
        return [total, hits.map((hit: any) => hit.id.toString())];
      } else if (total > 0 && hits.length === 0) {
        console.log(`MeiliSearch inconsistency: total=${total} but hits=${hits.length}, falling back to database`);
        shouldFallbackToDatabase = true;
      }
    } catch (error) {
      console.warn('MeiliSearch query failed, falling back to database:', error);
      shouldFallbackToDatabase = true;
    }
  }

  // Database fallback with the same filtering logic
  if (shouldFallbackToDatabase) {
    console.log('Using database fallback query');
    
    const where: any = { 
      deletedAt: null,
    };
    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { in: defaultStatuses };
    }
    
    if (filters.organizerId) {
      where.organizerId = filters.organizerId;
    }
    
    if (filters.city) {
      where.city = { equals: filters.city, mode: 'insensitive' };
    }
    
    if (filters.category) {
      const categories = filters.category.split(',');
      where.category = categories.length === 1 ? categories[0] : { in: categories };
    }
    
    if (filters.dateFrom && filters.dateTo) {
      where.startDate = {
        gte: new Date(filters.dateFrom),
        lte: new Date(filters.dateTo)
      };
    }
    
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
        { city: { contains: filters.q, mode: 'insensitive' } },
        { venue: { contains: filters.q, mode: 'insensitive' } }
      ];
    }
    
    const [total, events] = await prisma.$transaction([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        select: { id: true },
        orderBy: { startDate: 'asc' }
      })
    ]);
    
    console.log(`Database fallback: Found ${total} total events, returning ${events.length} events`);
    return [total, events.map(e => e.id)];
  }

  // This should rarely be reached
  return [0, []];
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
  const slug = await generateUniqueEventSlug(`${input.name}`);

  const createInfoMeili = {
      name: input.name,
      category: input.category,
      startDate: input.startDate,
      endDate: input.endDate,
      venue: input.venue,
      address: input.address,
      city: input.city,
      description: input.description,
      organizerId: input.organizerId,
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

    if (ids.length === 0) {
      return { page, limit, total, data: [] };
    }

    const data = await prisma.event.findMany({
      where: { 
        id: { in: ids as string[] },
        deletedAt: null
      },
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
    });

    // Reorder to match the order from the search/filter query
    const dataById = new Map(data.map(d => [d.id, d]));
    const ordered = (ids as string[]).map(id => dataById.get(id)).filter(Boolean);

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
    const event = await prisma.event.findFirst({
      where: { slug, deletedAt: null },
      // Remove invalid include; adjust later when relation is available
    });
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

    const [createInfoMeili, createInfoPrisma] = await generateEventCreateInfos(input);

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

    const [updateInfoMeili, updateInfoPrisma] = await generateEventUpdateInfos(input);

    const updated = await prisma.event.update({
      where: { id },
      data: updateInfoPrisma as any, // ts ile uğraşmamak için
    });

    // Update the event in the meilisearch index
    eventIndex.updateDocuments([{id, ...updateInfoMeili}]);

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
    const event = await prisma.event.update({ where: { id }, data: { status: 'ACTIVE' } });
    const details = await loadCategoryDetails(id, event.category);

    // Update the event in the meilisearch index
    await eventIndex.updateDocuments([{id, status: 'ACTIVE'}]);

    // Notify chat system that event is published and chat room should be available
    try { 
      await notifyEventPublished(id); 
    } catch (error) {
      console.error('Failed to notify chat system about event publication:', error);
    }
    
    // Send notification to ticket holders about event going live
    try {
      await this.notifyTicketHoldersEventPublished(event.name, id);
    } catch (error) {
      console.error('Failed to notify ticket holders about event publication:', error);
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

  /**
   * Send notification to ticket holders when event is published
   */
  static async notifyTicketHoldersEventPublished(eventName: string, eventId: string) {
    try {
      await oneSignalService.sendToEventTicketHolders(
        eventId,
        `🎉 ${eventName} Etkinliği Açıldı!`,
        `${eventName} etkinliği artık aktif! Bilet detaylarınızı kontrol edin ve hazırlıklarınızı tamamlayın.`,
        {
          data: {
            notification_type: 'event_published',
            event_id: eventId,
            event_name: eventName
          }
        }
      );
    } catch (error) {
      console.error('Failed to send event published notification:', error);
      throw error;
    }
  }

  /**
   * Send event update notification to ticket holders
   */
  static async notifyTicketHoldersEventUpdate(
    eventId: string, 
    eventName: string, 
    updateType: 'time_change' | 'venue_change' | 'general_update',
    message: string
  ) {
    try {
      const titles = {
        time_change: `⏰ ${eventName} - Saat Değişikliği`,
        venue_change: `📍 ${eventName} - Mekan Değişikliği`,
        general_update: `📢 ${eventName} - Önemli Duyuru`
      };

      await oneSignalService.sendToEventTicketHolders(
        eventId,
        titles[updateType],
        message,
        {
          data: {
            notification_type: 'event_update',
            update_type: updateType,
            event_id: eventId,
            event_name: eventName
          }
        }
      );
    } catch (error) {
      console.error('Failed to send event update notification:', error);
      throw error;
    }
  }

  /**
   * Send event reminder notifications
   */
  static async sendEventReminders(eventId: string, hoursBeforeEvent: number = 24) {
    try {
      const event = await prisma.event.findFirst({ 
        where: { id: eventId, deletedAt: null },
        select: { name: true, venue: true, startDate: true }
      });
      
      if (!event) {
        throw new Error('Event not found');
      }

      await oneSignalService.sendEventReminder(
        eventId,
        event.name,
        hoursBeforeEvent,
        {
          venue: event.venue,
          startTime: event.startDate.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        }
      );
    } catch (error) {
      console.error('Failed to send event reminder:', error);
      throw error;
    }
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


