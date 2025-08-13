import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { CreateEventDTO, ListEventsQueryDTO, UpdateEventDTO, DetailsSchemasByCategory } from './event.dto';
import { EventService, sanitizeEvent } from './event.service';
import path from 'path';
import { resolveBannerPublicUrl } from './event.upload';

async function resolveIsAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return !!user && user.userType === 'ADMIN';
}

async function resolveIsOrganizer(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const organizer = await prisma.organizer.findUnique({ where: { id: userId } });
  return !!organizer;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListEventsQueryDTO.parse(req.query);
    const result = await EventService.list(query);
    res.json({ ...result, data: result.data.map(sanitizeEvent) });
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
    const input = CreateEventDTO.partial({ banner: true }).parse(req.body);
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

export async function uploadBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const isOrganizer = await resolveIsOrganizer(requesterId);

    if (!isAdmin && !isOrganizer) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'no file provided', code: 'FILE_REQUIRED' });
    }

    const bannerUrl = resolveBannerPublicUrl(file.filename);
    res.json({ bannerUrl });
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


