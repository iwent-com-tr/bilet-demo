import { prisma } from '../../lib/prisma';

export class FollowService {
  
  // Artist following methods
  static async followArtist(userId: string, artistId: string) {
    // Check if artist exists
    const artist = await prisma.artist.findUnique({
      where: { id: artistId, deletedAt: null }
    });

    if (!artist) {
      const e: any = new Error('Artist not found');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }

    // Check if already following
    const existing = await prisma.favoriteArtist.findUnique({
      where: { userId_artistId: { userId, artistId } }
    });

    if (existing) {
      return existing;
    }

    // Create favorite and update artist count
    const [favorite] = await prisma.$transaction([
      prisma.favoriteArtist.create({
        data: { userId, artistId }
      }),
      prisma.artist.update({
        where: { id: artistId },
        data: { favoriteCount: { increment: 1 } }
      })
    ]);

    return favorite;
  }

  static async unfollowArtist(userId: string, artistId: string) {
    const existing = await prisma.favoriteArtist.findUnique({
      where: { userId_artistId: { userId, artistId } }
    });

    if (!existing) {
      const e: any = new Error('Not following this artist');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }

    // Remove favorite and update artist count
    await prisma.$transaction([
      prisma.favoriteArtist.delete({
        where: { userId_artistId: { userId, artistId } }
      }),
      prisma.artist.update({
        where: { id: artistId },
        data: { favoriteCount: { decrement: 1 } }
      })
    ]);

    return { success: true };
  }

  // Venue following methods
  static async followVenue(userId: string, venueId: string) {
    // Check if venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId, deletedAt: null }
    });

    if (!venue) {
      const e: any = new Error('Venue not found');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }

    // Check if already following
    const existing = await prisma.favoriteVenue.findUnique({
      where: { userId_venueId: { userId, venueId } }
    });

    if (existing) {
      return existing;
    }

    // Create favorite and update venue count
    const [favorite] = await prisma.$transaction([
      prisma.favoriteVenue.create({
        data: { userId, venueId }
      }),
      prisma.venue.update({
        where: { id: venueId },
        data: { favoriteCount: { increment: 1 } }
      })
    ]);

    return favorite;
  }

  static async unfollowVenue(userId: string, venueId: string) {
    const existing = await prisma.favoriteVenue.findUnique({
      where: { userId_venueId: { userId, venueId } }
    });

    if (!existing) {
      const e: any = new Error('Not following this venue');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }

    // Remove favorite and update venue count
    await prisma.$transaction([
      prisma.favoriteVenue.delete({
        where: { userId_venueId: { userId, venueId } }
      }),
      prisma.venue.update({
        where: { id: venueId },
        data: { favoriteCount: { decrement: 1 } }
      })
    ]);

    return { success: true };
  }

  // Organizer following methods
  static async followOrganizer(userId: string, organizerId: string) {
    // Check if organizer exists
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId, deletedAt: null }
    });

    if (!organizer) {
      const e: any = new Error('Organizer not found');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }

    // Check if already following
    const existing = await prisma.favoriteOrganizer.findUnique({
      where: { userId_organizerId: { userId, organizerId } }
    });

    if (existing) {
      return existing;
    }

    // Create favorite and update organizer count
    const [favorite] = await prisma.$transaction([
      prisma.favoriteOrganizer.create({
        data: { userId, organizerId }
      }),
      prisma.organizer.update({
        where: { id: organizerId },
        data: { favoriteCount: { increment: 1 } }
      })
    ]);

    return favorite;
  }

  static async unfollowOrganizer(userId: string, organizerId: string) {
    const existing = await prisma.favoriteOrganizer.findUnique({
      where: { userId_organizerId: { userId, organizerId } }
    });

    if (!existing) {
      const e: any = new Error('Not following this organizer');
      e.status = 404;
      e.code = 'NOT_FOUND';
      throw e;
    }

    // Remove favorite and update organizer count
    await prisma.$transaction([
      prisma.favoriteOrganizer.delete({
        where: { userId_organizerId: { userId, organizerId } }
      }),
      prisma.organizer.update({
        where: { id: organizerId },
        data: { favoriteCount: { decrement: 1 } }
      })
    ]);

    return { success: true };
  }

  // Get user's following lists
  static async getUserFollowing(userId: string) {
    const [artists, venues, organizers] = await Promise.all([
      prisma.favoriteArtist.findMany({
        where: { userId },
        include: {
          artist: {
            select: {
              id: true,
              name: true,
              slug: true,
              banner: true,
              genres: true,
              favoriteCount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.favoriteVenue.findMany({
        where: { userId },
        include: {
          venue: {
            select: {
              id: true,
              name: true,
              slug: true,
              banner: true,
              city: true,
              favoriteCount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.favoriteOrganizer.findMany({
        where: { userId },
        include: {
          organizer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              avatar: true,
              favoriteCount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      artists: artists.map(f => f.artist),
      venues: venues.map(f => f.venue),
      organizers: organizers.map(f => f.organizer)
    };
  }

  // Check if user is following specific entities
  static async checkFollowStatus(userId: string, entityType: 'artist' | 'venue' | 'organizer', entityId: string) {
    let isFollowing = false;

    switch (entityType) {
      case 'artist':
        const artistFollow = await prisma.favoriteArtist.findUnique({
          where: { userId_artistId: { userId, artistId: entityId } }
        });
        isFollowing = !!artistFollow;
        break;
      
      case 'venue':
        const venueFollow = await prisma.favoriteVenue.findUnique({
          where: { userId_venueId: { userId, venueId: entityId } }
        });
        isFollowing = !!venueFollow;
        break;
      
      case 'organizer':
        const organizerFollow = await prisma.favoriteOrganizer.findUnique({
          where: { userId_organizerId: { userId, organizerId: entityId } }
        });
        isFollowing = !!organizerFollow;
        break;
    }

    return { isFollowing };
  }
}

