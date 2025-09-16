import { prisma } from '../../lib/prisma';
import type { EventSearchQuery, ArtistSearchQuery, VenueSearchQuery, OrganizerSearchQuery } from './search.dto';
import { eventIndex } from '../../lib/meili';
import { MeiliService } from '../publicServices/meili.service';
import { PrismaService } from '../publicServices/prisma.service';

// Define interface for MeiliSearch hit objects
interface MeiliHit {
  id: string;
  [key: string]: any;
}


export class SearchService {

    static searchEvent = async function searchEvent(query: EventSearchQuery, sortBy?: string) {
      const { estimatedTotalHits, hits } = await MeiliService.getEventHitsFromQuery(query, sortBy);
      const ids = hits.map((hit: MeiliHit) => hit.id);

      const data = await PrismaService.getEventsFromIds(ids, query.limit, query.page);
      return {page: query.page, limit: query.limit, total: estimatedTotalHits, data};
    }


    static searchArtist = async function searchArtist(query: ArtistSearchQuery, sortBy?: string) {
      const { estimatedTotalHits, hits } = await MeiliService.getArtistHitsFromQuery(query, sortBy);
      const ids = hits.map((hit: MeiliHit) => hit.id);

      const data = await PrismaService.getArtistsFromIds(ids, query.limit, query.page);
      return {page: query.page, limit: query.limit, total: estimatedTotalHits, data};
    }

    static searchVenue = async function searchVenue(query: VenueSearchQuery) {
      const { estimatedTotalHits, hits } = await MeiliService.getVenueHitsFromQuery(query);
      const ids = hits.map((hit: MeiliHit) => hit.id);
      const data = await PrismaService.getVenuesFromIds(ids, query.limit, query.page);
      return {page: query.page, limit: query.limit, total: estimatedTotalHits, data};
    }

    static searchOrganizer = async function searchOrganizer(query: OrganizerSearchQuery) {
      const { estimatedTotalHits, hits } = await MeiliService.getOrganizerHitsFromQuery(query);
      const ids = hits.map((hit: MeiliHit) => hit.id);
      const data = await PrismaService.getOrganizersFromIds(ids, query.limit, query.page);
      return {page: query.page, limit: query.limit, total: estimatedTotalHits, data};
    }  
}

