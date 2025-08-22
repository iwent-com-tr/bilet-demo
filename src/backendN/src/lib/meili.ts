import { MeiliSearch } from 'meilisearch';
import { prisma } from './prisma';
import { flattenJsonValues } from './utils/json'; // converts a js object into the array of its values.

const MEILI_SETUP = {
  host: process.env.MEILI_HOST || 'http://127.0.0.1:7700',
  ...(process.env.MEILI_API_KEY && { apiKey: process.env.MEILI_API_KEY }), // Optional
};

export const meili = new MeiliSearch(MEILI_SETUP);

// INDEXES

await meili.createIndex('events', { primaryKey: 'id' });
export const eventIndex = meili.index('events');

await meili.createIndex('artists', { primaryKey: 'id' });
export const artistIndex = meili.index('artists');

await meili.createIndex('venues', { primaryKey: 'id' });
export const venueIndex = meili.index('venues');

await meili.createIndex('organizers', { primaryKey: 'id' });
export const organizerIndex = meili.index('organizers');

// initialization functions

async function setupIndexes() {

  await eventIndex.updateSettings({
    searchableAttributes: ['name', 'category', 'venue', 'address', 'city', 'description', 'venueExperimental', 'artists'],
    filterableAttributes: ['category', 'startDate', 'endDate', 'city', 'status', '_geo', 'tickets'],
    displayedAttributes: ['id'],
  });

  await artistIndex.updateSettings({
    searchableAttributes: ['name', 'bio', 'genres'],
    filterableAttributes: ['genres'],
    displayedAttributes: ['id'],
  });
  
  await venueIndex.updateSettings({
    searchableAttributes: ['name', 'details', 'city', 'address', 'accessibility'],
    filterableAttributes: ['city', 'accessibilty', '_geo'],
    displayedAttributes: ['id'],
  });

  await organizerIndex.updateSettings({
    searchableAttributes: ['firstName', 'lastName', 'company'],
    filterableAttributes: [],
    displayedAttributes: ['id'],
  });

}
  

async function syncDBToMeili() {

  const dbEvents = await prisma.event.findMany({
     where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        category: true,
        startDate: true,
        endDate: true,
        venue: true,
        venueExperimental: {
          select: {
            name: true,
            latitude: true,
            longitude: true
          }
        },
        address: true,
        city: true,
        description: true,
        status: true,
        ticketTypes: true, 
        artists: {
          select: {
            artist: {
              select: {
                name: true
              }
            }
          }
        }
    },
  });
  
  const dbArtists = await prisma.artist.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      genres: true, // Array of strings, meili can search into arrays
      bio: true,
    }, 
  });

  const dbVenues = await prisma.venue.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      details: true,
      accessibility: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
    }, 
  });

  const dbOrganizers = await prisma.organizer.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
    }, 
  });

  const events = dbEvents.map(event => ({
    ...event,
    tickets: (event.ticketTypes as any).map((ticket: any) => ticket.price),
    venueExperimental: event.venueExperimental?.name,
    ...(
      event.venueExperimental?.latitude && event.venueExperimental?.longitude && {
        _geo: {
          lat: (event.venueExperimental?.latitude && event.venueExperimental?.latitude.toNumber()),
          lng: (event.venueExperimental?.longitude && event.venueExperimental?.longitude.toNumber()),
        },
      }
    ),
    artists: event.artists.map(a => a.artist.name),
  }))

  const artists = dbArtists;

  const venues = dbVenues.map(venue => ({
    ...venue,
    accessibility: flattenJsonValues(venue.accessibility),
    _geo: {
      lat: (venue.latitude && venue.latitude.toNumber()),
      lng: (venue.longitude && venue.longitude.toNumber()),
    },
  }));

  const organizers = dbOrganizers;

  await eventIndex.addDocuments(events);
  await artistIndex.addDocuments(artists);
  await venueIndex.addDocuments(venues);
  await organizerIndex.addDocuments(organizers);
}

export async function initMeili() {
  await setupIndexes();
  await syncDBToMeili();
  console.log("MeiliSearch is running.");
}
