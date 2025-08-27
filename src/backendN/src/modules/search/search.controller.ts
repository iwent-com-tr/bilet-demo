import { Request, Response, NextFunction } from 'express';
import { SearchService } from './search.service';
import { EventSearchQueryDTO, ArtistSearchQueryDTO, VenueSearchQueryDTO, OrganizerSearchQueryDTO } from './search.dto';


export async function searchEvents(req: Request, res: Response, next: NextFunction) {

    req.query.userLocation = {
        latitude: (req as any).user && (req as any).user.location.latitude,
        longitude: (req as any).user && (req as any).user.location.longitude,
    }

    const dto = EventSearchQueryDTO.parse(req.query);
    const result = await SearchService.searchEvent(dto);
    res.json(result);
}

export async function searchArtists(req: Request, res: Response, next: NextFunction) {
    const dto = ArtistSearchQueryDTO.parse(req.query);
    const result = await SearchService.searchArtist(dto);
    res.json(result);
}

export async function searchVenues(req: Request, res: Response, next: NextFunction) {

    req.query.location = {
        latitude: (req as any).user && (req as any).user.location.latitude,
        longitude: (req as any).user && (req as any).user.location.longitude,
    }

    const dto = VenueSearchQueryDTO.parse(req.query);
    const result = await SearchService.searchVenue(dto);
    res.json(result);
}

export async function searchOrganizers(req: Request, res: Response, next: NextFunction) {
    const dto = OrganizerSearchQueryDTO.parse(req.query);
    const result = await SearchService.searchOrganizer(dto);
    res.json(result);
}


