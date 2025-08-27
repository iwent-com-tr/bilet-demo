import { off } from 'process';
import { prisma } from '../../lib/prisma';
import { listMessages } from '../friendship/friendship.controller';
import type { EventSearchQuery, ArtistSearchQuery, VenueSearchQuery, OrganizerSearchQuery } from './search.dto';
import { eventIndex } from '../../lib/meili';
import { MeiliService } from '../publicServices/meili.service';
import { PrismaService } from '../publicServices/prisma.service';


export class SearchService {
    static searchEvent = async function searchEvent(query: EventSearchQuery) {
      const { estimatedTotalHits, hits } = await MeiliService.getEventHitsFromQuery(query);
      const ids = hits.map(hit => hit.id);
      const data = await PrismaService.getEventsFromIds(ids, query.limit, query.page);
      return {page: query.page, limit: query.limit, total: estimatedTotalHits, data};
    }

    static searchArtist = async function searchArtist(query: ArtistSearchQuery) {
      const { estimatedTotalHits, hits } = await MeiliService.getArtistHitsFromQuery(query);
      const ids = hits.map(hit => hit.id);
      const data = await PrismaService.getArtistsFromIds(ids, query.limit, query.page);
      return {page: query.page, limit: query.limit, total: estimatedTotalHits, data};
    }

    static searchVenue = async function searchVenue(query: VenueSearchQuery) {
      const { estimatedTotalHits, hits } = await MeiliService.getVenueHitsFromQuery(query);
      const ids = hits.map(hit => hit.id);
      const data = await PrismaService.getVenuesFromIds(ids, query.limit, query.page);
      return {page: query.page, limit: query.limit, total: estimatedTotalHits, data};
    }

    static searchOrganizer = async function searchOrganizer(query: OrganizerSearchQuery) {
      const { estimatedTotalHits, hits } = await MeiliService.getOrganizerHitsFromQuery(query);
      const ids = hits.map(hit => hit.id);
      const data = await PrismaService.getOrganizersFromIds(ids, query.limit, query.page);
      return {page: query.page, limit: query.limit, total: estimatedTotalHits, data};
    }  
}

