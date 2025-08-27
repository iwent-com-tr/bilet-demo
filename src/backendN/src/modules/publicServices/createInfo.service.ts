import { generateUniqueEventSlug, generateUniqueArtistSlug, generateUniqueVenueSlug } from "./slug.service";
import { CreateEventInput, UpdateEventInput } from "../event/event.dto";
import { CreateVenueInput, UpdateVenueInput } from "../venues/venues.dto";
import { prisma } from "../../lib/prisma";
import { venueIndex } from "../../lib/meili";
import { Certificate } from "crypto";
import { any } from "zod";
import { connect } from "http2";
import { access } from "fs";
import { CreateArtistInput, UpdateArtistInput } from "../artists/artists.dto";

export async function generateEventCreateInfos(input: CreateEventInput) {
  const slug = await generateUniqueEventSlug(`${input.name}`);

  const createInfoMeili = {
      name: input.name,
      category: input.category,
      startDate: input.startDate,
      endDate: input.endDate,
      venue: input.venue,
      address: input.address,
      city: input.city,
      description: input.description || '',
    }

    let createInfoPrisma: any = {
      ...createInfoMeili,
      slug,
      banner: input.banner || '',
      socialMedia: (input.socialMedia ?? {}) as any,
      capacity: input.capacity || 0,
      ticketTypes: (input.ticketTypes ?? []) as any,
      status: 'DRAFT',
      organizerId: input.organizerId,
    };

    if (input?.artists?.length) {
      const artistCreateInfos = await Promise.all(input.artists.map(async (artist) => {
        const artistData = await prisma.artist.findFirst({ where: { id: (artist as any).id } });
        return artistData && {
          artistId: artistData.id,
          time: (artist as any).time,
        };
      }))

      createInfoPrisma.artists = {
        create: artistCreateInfos.filter(Boolean),
      };
    }

    if (input?.venueId) {
      const venueData = await prisma.venue.findFirst({ where: { id: input.venueId } });
      createInfoPrisma.venueId = venueData && input.venueId;
    }

  return [createInfoMeili, createInfoPrisma];
}

export async function generateEventUpdateInfos(input: UpdateEventInput) {
  const createInfoMeili = {
      name: input.name ?? undefined,
      startDate: input.startDate ?? undefined,
      endDate: input.endDate ?? undefined,
      venue: input.venue ?? undefined,
      address: input.address ?? undefined,
      city: input.city ?? undefined,
      description: input.description || '',
    }

    let createInfoPrisma = {
      ...createInfoMeili,
      banner: input.banner || undefined,
      socialMedia: (input.socialMedia ?? undefined) as any,
      capacity: input.capacity || undefined,
      ticketTypes: (input.ticketTypes ?? undefined) as any,
      status: input.status || 'DRAFT',
      artists: undefined as any,
      venueExperimental: undefined as any
    };

    if (input?.artists?.length) {
      const artistCreateInfos = await Promise.all(input.artists.map(async (artist) => {
        const artistData = await prisma.artist.findFirst({ where: { id: (artist as any).id } });
        return artistData && {
          artistId: artistData.id,
          time: (artist as any).time,
        };
      }))

      createInfoPrisma.artists = {
        create: artistCreateInfos.filter(Boolean),
      };
    }

    if (input?.venueId) {
      const venueData = await prisma.venue.findFirst({ where: { id: input.venueId } });
      createInfoPrisma.venueExperimental = venueData && {
        connect: {
          id: input.venueId,
        },
      }
    }

  return [createInfoMeili, createInfoPrisma];
}

export async function generateVenueCreateInfos(input: CreateVenueInput) {
  const slug = await generateUniqueVenueSlug(`${input.name}`);

  const createInfoMeili = {
      name: input.name,
      details: input.details || '',
      address: input.address,
      city: input.city,
      accessibility: input.accessibility || '',
      ...(input.latitude && input.longitude ? { 
        _geo: { 
          lat: input.latitude, 
          lng: input.longitude 
        }, 
      } : {}),
    }

    const { _geo, ...prismaBase } = createInfoMeili;

    let createInfoPrisma = {
      ...prismaBase,
      slug,
      banner: input.banner || '',
      capacity: input.capacity ?? null,
      seatedCapacity: input.seatedCapacity ?? null,
      standingCapacity: input.standingCapacity ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      organizerId: input.organizerId,
    };

  return [createInfoMeili, createInfoPrisma];
}

export async function generateVenueUpdateInfos(input: UpdateVenueInput) {
  const createInfoMeili = {
      name: input.name ?? undefined,
      details: input.details ?? undefined,
      address: input.address ?? undefined,
      city: input.city ?? undefined,
      accessibility: input.accessibility ?? undefined,
      ...(input.latitude && input.longitude ? { 
        _geo: { 
          lat: input.latitude, 
          lng: input.longitude 
        }, 
      } : {}),
    }

    const { _geo, ...prismaBase } = createInfoMeili;

    let createInfoPrisma = {
      ...prismaBase,
      banner: input.banner ?? undefined,
      capacity: input.capacity ?? undefined,
      seatedCapacity: input.seatedCapacity ?? undefined,
      standingCapacity: input.standingCapacity ?? undefined,
      latitude: input.latitude ?? undefined,
      longitude: input.longitude ?? undefined,
    };

  return [createInfoMeili, createInfoPrisma];
}
export async function generateArtistCreateInfos(input: CreateArtistInput) {
  const slug = await generateUniqueArtistSlug(`${input.name}`);

  const createInfoMeili = {
      name: input.name,
      genres: input.genres ? input.genres.split(',') : [],
      bio: input.bio || '',
    }

    let createInfoPrisma = {
      ...createInfoMeili,
      slug,
      banner: input.banner || '',
      socialMedia: (input.socialMedia ?? {}) as any,
      organizerId: input.organizerId,
      favoriteCount: 0,
    };

  return [createInfoMeili, createInfoPrisma];
}

export async function generateArtistUpdateInfos(input: UpdateArtistInput) {
  const createInfoMeili = {
      name: input.name ?? undefined,
      genres: input.genres ?? undefined,
      bio: input.bio ?? undefined,
    }

    let createInfoPrisma = {
      ...createInfoMeili,
      banner: input.banner ?? undefined,
      socialMedia: (input.socialMedia ?? {}) as any,
      organizerId: input.organizerId ?? undefined,
    };

  return [createInfoMeili, createInfoPrisma];
}
