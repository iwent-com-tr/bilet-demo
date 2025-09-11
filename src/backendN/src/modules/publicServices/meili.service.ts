import { artistIndex, eventIndex, organizerIndex, venueIndex } from "../../lib/meili";
import { prisma } from "../../lib/prisma";
import { PrismaService } from "./prisma.service";


function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class MeiliService {
    static getEventHitsFromQuery = async function getHitsFromQuery(query: any, sortBy?: string) {
  const filter: string[] = [];

  if (query.city) filter.push(`city=${query.city}`);
  if (query.dateFrom && query.dateTo)
    filter.push(`startDate >= "${query.dateFrom}" AND startDate <= "${query.dateTo}"`);
  if (query.category)
    filter.push(...query.category.split(',').map((c: string) => `category=${c}`));
  if (query.price !== null) filter.push(`tickets <= ${Number(query.price)}`);

  const searchDetails = {
    limit: query.limit || 10,
    offset: (query.limit as number) * ((query.page as number) - 1) || 0,
    filter,
  };

  const { estimatedTotalHits, hits } = await eventIndex.search(query.q, searchDetails as any);

  const dbEvents = await prisma.event.findMany({
    where: {
      id: {
        in: hits.map((hit: any) => hit.id),
      },
    },
    select: {
      id: true,
      venueExperimental: {
        select: {
          latitude: true,
          longitude: true,
          _count: {
            select: {
              favoriteUsers: true,
            },
          }
        },
      },
      artists: {
          select: {
            artist: {
              select: {
                _count: {
                  select: {
                    favoriteUsers: true,
                  }
                }
              },
            },
          }
      },
      _count: {
        select: {
          favoriteUsers: true,
        },
      },
    }
  });

  if (sortBy && sortBy === 'popularity') {
    dbEvents.sort((a, b) => {
      // Rank for event A
      const aEventFavs = a._count.favoriteUsers || 0;
      const aArtistFavs =
        a.artists.length > 0
          ? a.artists.reduce((sum, art) => sum + art.artist._count.favoriteUsers, 0) /
            a.artists.length
          : 0;
      const aVenueFavs = a.venueExperimental?._count.favoriteUsers || 0;
      const aRank = aEventFavs + aArtistFavs + aVenueFavs;

      // Rank for event B
      const bEventFavs = b._count.favoriteUsers || 0;
      const bArtistFavs =
        b.artists.length > 0
          ? b.artists.reduce((sum, art) => sum + art.artist._count.favoriteUsers, 0) /
            b.artists.length
          : 0;
      const bVenueFavs = b.venueExperimental?._count.favoriteUsers || 0;
      const bRank = bEventFavs + bArtistFavs + bVenueFavs;

      return bRank - aRank; // Descending order
    });
}


  const venueMap = new Map(
    dbEvents.map((e) => [e.id, e.venueExperimental])
  );

  const filteredHits = hits.filter((hit: any) => {
    const venue = venueMap.get(hit.id);
    if (!venue) return true;

    if (
      query.distance != null &&
      typeof query.latitude === "number" &&
      typeof query.longitude === "number"
    ) {
      const distMeters = haversineDistance(
        query.latitude,
        query.longitude,
        venue.latitude?.toNumber() as number,
        venue.longitude?.toNumber() as number,
      );

      return distMeters <= query.distance * 1000;
    }
    return true;
  });

  return { estimatedTotalHits, hits: filteredHits };
};

    static getArtistHitsFromQuery = async function getHitsFromQuery(query: any, sortBy?: string) {
      const searchDetails = {
        limit: query.limit || 10,
        offset: query.limit as number * (query.page as number - 1) || 0,
        filter: [
        query.genres ? query.genres.split(',').map((c: string) => `genres=${c}`).join(' OR ') : null,
        ].filter(Boolean),
      }

      const { estimatedTotalHits, hits } = await artistIndex.search(query.q, searchDetails as any);

      if (sortBy === "popularity" && hits.length > 0) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const artistPopularity = await prisma.artist.findMany({
      where: {
        id: { in: hits.map((h: any) => h.id) },
      },
      select: {
        id: true,
        events: {
          where: {
            event: {
              startDate: { gte: oneYearAgo },  // filter on the Event startDate
            },
          },
          select: {
            event: {
              select: {
                _count: {
                  select: { tickets: true }
                }
              }
            }
          }
        }
      }
    });


      const popularityMap: Record<string, number> = {};
      for (const artist of artistPopularity) {
        let count = 0;
        for (const e of artist.events) {
          count += e.event._count.tickets;
        }
        popularityMap[artist.id] = count;
      }

      hits.sort((a: any, b: any) => (popularityMap[b.id] || 0) - (popularityMap[a.id] || 0));
    }

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
