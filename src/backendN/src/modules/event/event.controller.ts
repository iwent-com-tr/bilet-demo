import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { CreateEventDTO, ListEventsQueryDTO, UpdateEventDTO, DetailsSchemasByCategory } from './event.dto';
import { EventService } from './event.service';
import path from 'path';
import { resolveBannerPublicUrl } from '../publicServices/multer.service';
import { SearchService } from '../search/search.service';
import { resolveIsAdmin, resolveIsOrganizer } from '../publicServices/resolveRoles.service';
import { sanitizeEvent } from '../publicServices/sanitizer.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListEventsQueryDTO.parse(req.query);
    const result = await EventService.list(query);
    res.json({ ...result, data: result.data.map(sanitizeEvent).filter(Boolean) });
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await EventService.findById(req.params.id);
    res.json({ event: sanitizeEvent(event) });
  } catch (e) { next(e); }
}

export async function getBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await EventService.findBySlug(req.params.slug);
    console.log(`Event Response from getBySlug: ${JSON.stringify(event)}`);
    res.json(event);
  } catch (e) { next(e); }
}

export async function getEventsByOrganizer(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizerId } = req.params;
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    
    // Allow access if: user is admin, or user is the organizer themselves
    if (!isAdmin && requesterId !== organizerId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }

    const query = ListEventsQueryDTO.parse({ ...req.query, organizerId });
    const result = await EventService.list(query);
    res.json({ ...result, data: result.data.map(sanitizeEvent) });
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateEventDTO.parse(req.body);
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const isOrganizer = await resolveIsOrganizer(requesterId);

    if (!isAdmin && !isOrganizer) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }

    const organizerId = isAdmin ? (input.organizerId as string | undefined) : requesterId;
    if (!organizerId) {
      const e: any = new Error('organizerId is required for admin-created events');
      e.status = 400; e.code = 'ORGANIZER_REQUIRED';
      throw e;
    }

    // If multipart contained a banner file, prefer it over provided banner URL
    const file = (req as any).file as Express.Multer.File | undefined;
    const bannerUrl = file ? resolveBannerPublicUrl(file.filename) : input.banner;

    const event = await EventService.create({ ...input, banner: bannerUrl, organizerId });
    res.status(201).json({ event: sanitizeEvent(event) });
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const event = await EventService.findById(req.params.id);
    if (!isAdmin && event.organizerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    const input = UpdateEventDTO.parse(req.body);
    const updated = await EventService.update(req.params.id, input);
    res.json({ event: sanitizeEvent(updated) });
  } catch (e) { next(e); }
}


export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const event = await EventService.findById(req.params.id);
    if (!isAdmin && event.organizerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    await EventService.softDelete(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function publish(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const event = await EventService.findById(req.params.id);
    if (!isAdmin && event.organizerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    const updated = await EventService.publish(req.params.id);
    res.json({ event: sanitizeEvent(updated) });
  } catch (e) { next(e); }
}

export async function unpublish(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const event = await EventService.findById(req.params.id);
    if (!isAdmin && event.organizerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    const updated = await EventService.unpublish(req.params.id);
    res.json({ event: sanitizeEvent(updated) });
  } catch (e) { next(e); }
}

// ===== Details endpoints =====
export async function getDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await EventService.findById(req.params.id);
    res.json({ details: event.details ?? {} });
  } catch (e) { next(e); }
}

export async function updateDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const event = await EventService.findById(req.params.id);
    if (!isAdmin && event.organizerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    const schema = DetailsSchemasByCategory[event.category as keyof typeof DetailsSchemasByCategory];
    const input = schema.parse(req.body);
    const updated = await EventService.update(event.id, input as any);
    res.json({ details: updated });
  } catch (e) { next(e); }
}

export async function getEventStats(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const eventId = req.params.id;
    const isAdmin = await resolveIsAdmin(requesterId);
    
    // Get event to check ownership
    const event = await EventService.findById(eventId);
    
    // Allow access if: user is admin, or user is the organizer who created the event
    if (!isAdmin && event.organizerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    
    const stats = await EventService.getEventStats(eventId);
    res.json({ stats });
  } catch (e) { next(e); }
}

export async function getEventsByDate(req: Request, res: Response, next: NextFunction) {
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        error: 'invalid date format', 
        code: 'INVALID_DATE_FORMAT',
        message: 'Date must be in YYYY-MM-DD format' 
      });
    }

    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ 
        error: 'invalid date', 
        code: 'INVALID_DATE',
        message: 'Invalid date provided' 
      });
    }

    // Set date range for the entire day (00:00:00 to 23:59:59)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: {
        status: { in: ['ACTIVE', 'DRAFT'] },
        deletedAt: null,
        OR: [
          // Events that start on this date
          {
            startDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          // Events that are ongoing on this date (multi-day events)
          {
            AND: [
              { startDate: { lte: endOfDay } },
              { endDate: { gte: startOfDay } }
            ]
          }
        ]
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    const sanitizedEvents = events.map(sanitizeEvent).filter(Boolean);
    
    res.json({ 
      date,
      events: sanitizedEvents,
      count: sanitizedEvents.length
    });
  } catch (e) { 
    next(e); 
  }
}

export async function getCalendarEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { year, month } = req.query;
    
    // Default to current year/month if not provided
    const currentDate = new Date();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;

    // Validate year and month
    if (targetYear < 2020 || targetYear > 2030) {
      return res.status(400).json({ 
        error: 'invalid year', 
        code: 'INVALID_YEAR',
        message: 'Year must be between 2020 and 2030' 
      });
    }

    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ 
        error: 'invalid month', 
        code: 'INVALID_MONTH',
        message: 'Month must be between 1 and 12' 
      });
    }

    // Create date range for the entire month
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: {
        status: { in: ['ACTIVE', 'DRAFT'] },
        deletedAt: null,
        OR: [
          // Events that start in this month
          {
            startDate: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          // Events that are ongoing during this month (multi-day events)
          {
            AND: [
              { startDate: { lte: endOfMonth } },
              { endDate: { gte: startOfMonth } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        startDate: true,
        endDate: true,
        venue: true,
        city: true,
        category: true,
        status: true,
        banner: true
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    // Group events by date
    const eventsByDate: { [key: string]: any[] } = {};
    
    events.forEach(event => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      // Add event to all dates it spans
      const currentDate = new Date(startDate);
      while (currentDate <= endDate && currentDate <= endOfMonth) {
        if (currentDate >= startOfMonth) {
          const dateKey = currentDate.toISOString().split('T')[0];
          if (!eventsByDate[dateKey]) {
            eventsByDate[dateKey] = [];
          }
          eventsByDate[dateKey].push({
            ...event,
            isStartDate: currentDate.toDateString() === startDate.toDateString(),
            isEndDate: currentDate.toDateString() === endDate.toDateString()
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    res.json({
      year: targetYear,
      month: targetMonth,
      eventsByDate,
      totalEvents: events.length
    });
  } catch (e) {
    next(e);
  }
}

export async function notifyEventUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const eventId = req.params.id;
    const isAdmin = await resolveIsAdmin(requesterId);
    
    // Get event to check ownership
    const event = await EventService.findById(eventId);
    
    // Allow access if: user is admin, or user is the organizer who created the event
    if (!isAdmin && event.organizerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    
    const { updateType, message } = req.body;
    
    if (!updateType || !message) {
      return res.status(400).json({ 
        error: 'updateType and message are required',
        code: 'MISSING_FIELDS'
      });
    }
    
    if (!['time_change', 'venue_change', 'general_update'].includes(updateType)) {
      return res.status(400).json({ 
        error: 'Invalid updateType. Must be: time_change, venue_change, or general_update',
        code: 'INVALID_UPDATE_TYPE'
      });
    }
    
    await EventService.notifyTicketHoldersEventUpdate(
      eventId,
      event.name,
      updateType,
      message
    );
    
    res.json({ 
      success: true,
      message: 'Event update notification sent to ticket holders'
    });
  } catch (e) {
    next(e);
  }
}

export async function sendEventReminder(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const eventId = req.params.id;
    const isAdmin = await resolveIsAdmin(requesterId);
    
    // Get event to check ownership
    const event = await EventService.findById(eventId);
    
    // Allow access if: user is admin, or user is the organizer who created the event
    if (!isAdmin && event.organizerId !== requesterId) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    
    const { hoursBeforeEvent = 24 } = req.body;
    
    if (typeof hoursBeforeEvent !== 'number' || hoursBeforeEvent < 1 || hoursBeforeEvent > 168) {
      return res.status(400).json({ 
        error: 'hoursBeforeEvent must be a number between 1 and 168 (7 days)',
        code: 'INVALID_HOURS'
      });
    }
    
    await EventService.sendEventReminders(eventId, hoursBeforeEvent);
    
    res.json({ 
      success: true,
      message: `Event reminder sent to ticket holders (${hoursBeforeEvent} hours before event)`
    });
  } catch (e) {
    next(e);
  }
}


