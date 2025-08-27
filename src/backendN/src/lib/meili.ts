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
      ticketsPrices,
    };
  });

  await eventIndex.addDocuments(events);
}

export async function initMeili() {
  await setupIndexes();
  await syncDBToMeili();
  console.log("MeiliSearch is running.");
}
