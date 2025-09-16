import { MeiliSearch } from 'meilisearch';
import { prisma } from './prisma';
import { flattenJsonValues } from './utils/json'; // converts a js object into the array of its values.

const MEILI_SETUP = {
  host: process.env.MEILI_HOST || 'http://127.0.0.1:7700',
  ...(process.env.MEILI_API_KEY && { apiKey: process.env.MEILI_API_KEY }), // Optional
};

let meili: MeiliSearch | null = null;
let eventIndex: any = null;
let artistIndex: any = null;
let venueIndex: any = null;
let organizerIndex: any = null;

try {
  meili = new MeiliSearch(MEILI_SETUP);
  
  // INDEXES - only create if MeiliSearch is available
  await meili.createIndex('events', { primaryKey: 'id' });
  eventIndex = meili.index('events');

  await meili.createIndex('artists', { primaryKey: 'id' });
  artistIndex = meili.index('artists');

  await meili.createIndex('venues', { primaryKey: 'id' });
  venueIndex = meili.index('venues');

  await meili.createIndex('organizers', { primaryKey: 'id' });
  organizerIndex = meili.index('organizers');
  
  console.log('MeiliSearch initialized successfully');
} catch (error: any) {
  console.warn('MeiliSearch initialization failed:', error?.message || 'Unknown error');
  console.warn('Search functionality will be disabled');
}

export { meili, eventIndex, artistIndex, venueIndex, organizerIndex };

// initialization functions

async function setupIndexes() {
  if (!eventIndex || !artistIndex || !venueIndex || !organizerIndex) {
    console.warn("MeiliSearch indexes not available, skipping setup");
    return;
  }

  await eventIndex.updateSettings({
    searchableAttributes: ['name', 'category', 'venue', 'address', 'city', 'description', 'artists'],
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
  if (!eventIndex || !artistIndex || !venueIndex) {
    console.warn("MeiliSearch indexes not available, skipping sync");
    return;
  }

  const dbArtists = await prisma.artist.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      bio: true,
      genres: true,
    },
  });

  const artists = dbArtists.map(a => ({
    id: a.id,
    name: a.name,
    bio: a.bio,
    genres: a.genres,
  }));

  await artistIndex.addDocuments(artists);

  const dbOrganizers = await prisma.organizer.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
    },
  });

  const organizers = dbOrganizers.map(o => ({
    id: o.id,
    firstName: o.firstName,
    lastName: o.lastName,
    company: o.company,
  }));

  await organizerIndex.addDocuments(organizers);

  const dbVenues = await prisma.venue.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      details: true,
      city: true,
      address: true,
      accessibility: true,
      latitude: true,
      longitude: true,
    },
  });

  const venues = dbVenues.map(v => ({
    id: v.id,
    name: v.name,
    details: v.details,
    city: v.city,
    address: v.address,
    accessibility: v.accessibility,
    _geo: v.latitude && v.longitude ? { lat: v.latitude, lng: v.longitude } : undefined,
  }));

  await venueIndex.addDocuments(venues);

  const dbEvents = await prisma.event.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      startDate: true,
      endDate: true,
      venue: true,
      address: true,
      city: true,
      description: true,
      status: true,
      ticketTypes: true,
    },
  });

  const events = dbEvents.map(e => {
    let ticketTypes: any[] = [];
    try {
      const raw = e.ticketTypes as unknown as string | any[];
      if (typeof raw === 'string') {
        ticketTypes = JSON.parse(raw);
      } else if (Array.isArray(raw)) {
        ticketTypes = raw;
      }
    } catch {}

    const ticketsPrices = Array.isArray(ticketTypes)
      ? ticketTypes.map((t: any) => Number(t?.price)).filter((n: any) => !isNaN(n))
      : [];

    return {
      id: e.id,
      name: e.name,
      category: e.category,
      startDate: e.startDate,
      endDate: e.endDate,
      venue: e.venue,
      address: e.address,
      city: e.city,
      description: e.description,
      status: e.status,
      tickets: ticketsPrices,
    };
  });

  await eventIndex.addDocuments(events);
}

export async function initMeili() {
  if (!meili || !eventIndex) {
    console.log("MeiliSearch not available, skipping initialization.");
    return;
  }
  
  try {
    await setupIndexes();
    await syncDBToMeili();
    console.log("MeiliSearch is running.");
  } catch (error: any) {
    console.warn("MeiliSearch initialization error:", error?.message);
  }
}

