import { artistIndex, eventIndex, organizerIndex, venueIndex } from "../../lib/meili";


export class MeiliService {
    static getEventHitsFromQuery = async function getHitsFromQuery(query: any) {
      const filter: string[] = [];

      if (query.city) filter.push(`city=${query.city}`);
      if (query.dateFrom && query.dateTo) filter.push(`startDate >= ${query.dateFrom} AND startDate <= ${query.dateTo}`);
      if (query.category) filter.push(...query.category.split(',').map((c: string) => `category=${c}`));
      if (query.price != null) filter.push(`tickets <= ${Number(query.price)}`);
      if (query.distance != null && typeof query.latitude === 'number' && 
          typeof query.longitude === 'number') {
        filter.push(`_geoRadius(${query.latitude}, ${query.longitude}, ${Number(query.distance) * 1000})`);
      }

      const searchDetails = {
        limit: query.limit || 10,
        offset: query.limit as number * (query.page as number - 1) || 0,
        filter,
      }

      const { estimatedTotalHits, hits } = await eventIndex.search(query.q, searchDetails as any);

      return { estimatedTotalHits, hits };
    }

    static getArtistHitsFromQuery = async function getHitsFromQuery(query: any) {
      const searchDetails = {
        limit: query.limit || 10,
        offset: query.limit as number * (query.page as number - 1) || 0,
        filter: [
        query.genres ? query.genres.split(',').map((c: string) => `genres=${c}`).join(' OR ') : null,
        ].filter(Boolean),
      }

      const { estimatedTotalHits, hits } = await artistIndex.search(query.q, searchDetails as any);

      return { estimatedTotalHits, hits };
    }

    static getVenueHitsFromQuery = async function getHitsFromQuery(query: any) {
      const filter: string[] = [];

      if (query.city) filter.push(`city=${query.city}`);
      if (query.distance != null && typeof query.latitude === 'number' && 
          typeof query.longitude === 'number') {
        filter.push(`_geoRadius(${query.latitude}, ${query.longitude}, ${Number(query.distance) * 1000})`);
      }

      const searchDetails = {
        limit: query.limit || 10,
        offset: query.limit as number * (query.page as number - 1) || 0,
        filter,
      }

      const { estimatedTotalHits, hits } = await venueIndex.search(query.q, searchDetails as any);

      return { estimatedTotalHits, hits };
    }

    static getOrganizerHitsFromQuery = async function getHitsFromQuery(query: any) {
      const searchDetails = {
        limit: query.limit || 10,
        offset: query.limit as number * (query.page as number - 1) || 0,
      }

      const { estimatedTotalHits, hits } = await organizerIndex.search(query.q, searchDetails as any);

      return { estimatedTotalHits, hits };
    }
}
