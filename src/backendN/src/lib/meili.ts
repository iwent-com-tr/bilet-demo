import { MeiliSearch } from 'meilisearch';
import { prisma } from './prisma';

const MEILI_SETUP = {
  host: process.env.MEILI_HOST || 'http://127.0.0.1:7700',
  ...(process.env.MEILI_API_KEY && { apiKey: process.env.MEILI_API_KEY }), // Optional
};

export const meili = new MeiliSearch(MEILI_SETUP);

// INDEXES (only events for now)

await meili.createIndex('events', { primaryKey: 'id' });
export const eventIndex = meili.index('events');

// initialization functions

async function setupIndexes() {
  await eventIndex.updateSettings({
    searchableAttributes: ['name', 'category', 'venue', 'address', 'city', 'description'],
    filterableAttributes: ['category', 'startDate', 'endDate', 'city', 'status'],
    displayedAttributes: ['id'], // sadece id returnleyip daha sonra databaseden event bulunacak
  });
}
  

async function syncEventsToMeili() {
  const events = await prisma.event.findMany({ where: { deletedAt: null } });
  await eventIndex.addDocuments(events.map( (x) => {
    return {id: x.id,
    name: x.name,
    category: x.category,
    startDate: x.startDate,
    endDate: x.endDate,
    venue: x.venue,
    address: x.address,
    city: x.city,
    description: x.description,
    status: x.status,  
    };
  }));
}

export async function initMeili() {
  await setupIndexes();
  await syncEventsToMeili();
  console.log("MeiliSearch is running.");
}
