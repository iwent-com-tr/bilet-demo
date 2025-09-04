import { Request, Response, NextFunction } from 'express';
import { ArtistsService } from './artists.service';
import { CreateArtistDTO, UpdateArtistDTO, ListArtistsQueryDTO } from './artists.dto';
import { resolveIsAdmin, resolveIsOrganizer } from '../publicServices/resolveRoles.service';
import { resolveBannerPublicUrl } from '../publicServices/multer.service';
import { sanitizeArtist } from '../publicServices/sanitizer.service';
import { SearchService } from '../search/search.service';
import { PreferencesService } from '../publicServices/preferences.service';

export async function create(req: Request, res: Response, next: NextFunction) {
    
    try{
        const input = CreateArtistDTO.partial({ banner: true }).parse(req.body);
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

        const artist = await ArtistsService.create({ ...input, banner: bannerUrl, organizerId });
        res.status(201).json({ artist: sanitizeArtist(artist) });
    } catch (e) { next(e); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListArtistsQueryDTO.parse(req.query);
    const result = await SearchService.searchArtist(query as any);
    const val = result.data.map((artist: any) => {
      return {
        ...artist, 
        following: artist.favoriteUsers.some((user: any) => user.userId === (req as any).user?.id)
      }
    })

    if (req.user) PreferencesService.addPreferences(req.user.id, query.q);

    res.json({ ...result, data: val.map(sanitizeArtist).filter(Boolean) });
  } catch (e) { next(e); }
}

export async function getPopularArtists(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListArtistsQueryDTO.parse(req.query);
    const result = await SearchService.searchArtist(query as any, "popularity");
    const val = result.data.map((artist: any) => {
      return {
        ...artist, 
        following: req.user && artist.favoriteUsers.some((user: any) => user.userId === (req as any).user?.id),
      }
    })

    if (req.user) PreferencesService.addPreferences(req.user.id, query.q);

    res.json({ ...result, data: val.map(sanitizeArtist).filter(Boolean) });
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const artist = await ArtistsService.findById(req.params.id);
    const publicInfo = {
      ...artist,
      following: artist.favoriteUsers.some((user: any) => user.userId === (req as any).user?.id),
      favoriteCount: artist.favoriteUsers.length,
    }
    res.json({ artist: sanitizeArtist(artist) });
  } catch (e) { next(e); }
}

export async function getBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const artist = await ArtistsService.findBySlug(req.params.slug);
    const publicInfo = {
      ...artist,
      following: artist.favoriteUsers.some((user: any) => user.userId === (req as any).user?.id),
      favoriteCount: artist.favoriteUsers.length,
    }
    res.json((artist && sanitizeArtist(publicInfo)) || null);
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const artist = await ArtistsService.findById(req.params.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    const input = UpdateArtistDTO.parse(req.body);
    const updated = await ArtistsService.update(req.params.id, input);
    res.json({ artist: sanitizeArtist(updated) });
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const artist = await ArtistsService.findById(req.params.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }
    await ArtistsService.softDelete(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function sendFollowRequest(req: any, res: Response, next: NextFunction) {
  const result = await ArtistsService.sendFollowRequest(req.params.id, req.user.id);
  if (result.id) return res.json(result);
  return res.status(400).json(result);
}

export async function cancelFollowRequest(req: any, res: Response, next: NextFunction) {
  const result = await ArtistsService.cancelFollowRequest(req.params.id, req.user.id);
  if (result.id) return res.json(result);
  return res.status(400).json(result);
}

