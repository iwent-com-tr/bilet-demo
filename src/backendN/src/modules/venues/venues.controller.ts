import { Request, Response, NextFunction } from 'express';
import { VenuesService } from './venues.service';
import { CreateVenueDTO, UpdateVenueDTO, ListVenuesQueryDTO } from './venues.dto';
import { resolveIsAdmin, resolveIsOrganizer } from '../publicServices/resolveRoles.service';
import { resolveBannerPublicUrl } from '../publicServices/multer.service';
import { sanitizeVenue } from '../publicServices/sanitizer.service';
import { SearchService } from '../search/search.service';
import { PreferencesService } from '../publicServices/preferences.service';

export async function create(req: Request, res: Response, next: NextFunction) {
    
    try{
        const input = CreateVenueDTO.partial({ banner: true }).parse(req.body);
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

        const venue = await VenuesService.create({ ...input, banner: bannerUrl, organizerId });
        res.status(201).json({ venue: sanitizeVenue(venue) });
    } catch (e) { next(e); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListVenuesQueryDTO.parse(req.query);
    const result = await VenuesService.list(query);
    const refined = result.data.map((venue: any) => {
      return {
        ...venue,
        following: venue.favoriteUsers.some((user: any) => user.userId === (req as any).user?.id),
      };
    });

    if (req.user && query.q) PreferencesService.addPreferences(req.user.id, query.q);

    res.json({ ...result, data: refined.map(sanitizeVenue).filter(Boolean) });
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const venue = await VenuesService.findById(req.params.id);
    const publicInfo = {
      ...venue,
      favoriteCount: venue.favoriteUsers.length,
      following: venue.favoriteUsers.some((user: any) => user.userId === (req as any).user?.id),
    }
    res.json({ event: sanitizeVenue(venue) });
  } catch (e) { next(e); }
}

export async function getBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const venue = await VenuesService.findBySlug(req.params.slug);
    const publicInfo = {
      ...venue,
      favoriteCount: venue.favoriteUsers.length,
      following: venue.favoriteUsers.some((user: any) => user.userId === (req as any).user?.id),
    }
    res.json(sanitizeVenue(publicInfo));
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const venue = await VenuesService.findById(req.params.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    const input = UpdateVenueDTO.parse(req.body);
    const updated = await VenuesService.update(req.params.id, input);
    res.json({ venue: sanitizeVenue(updated) });
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const venue = await VenuesService.findById(req.params.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    await VenuesService.softDelete(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function sendFollowRequest(req: any, res: Response, next: NextFunction) {
  const result = await VenuesService.sendFollowRequest(req.params.id, req.user.id);
  if (result.id) return res.json(result);
  return res.status(400).json(result);
}

export async function cancelFollowRequest(req: any, res: Response, next: NextFunction) {
  const result = await VenuesService.cancelFollowRequest(req.params.id, req.user.id);
  if (result.id) return res.json(result);
  return res.status(400).json(result);
}
