import { EventService } from "../../../modules/event/event.service";
import { ArtistsService } from "../../../modules/artists/artists.service";
import { VenuesService } from "../../../modules/venues/venues.service";
import { prisma } from "../../prisma";
import https from "https";
import { URL } from "url";

/**
 * Node 18+ compatible fetch
 */
 async function fetchFirstImage(keyword: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openverse.engineering/v1/images/?q=${encodeURIComponent(keyword)}&limit=1`,
      {
        headers: {
          "User-Agent": "Node.js Fetch",
          Accept: "application/json",
        },
        redirect: "follow", // follow redirects automatically
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.results?.[0]?.url ?? null;
  } catch (err) {
    console.error("Fetch error:", err);
    return null;
  }
}

/**
 * Search for images on DuckDuckGo and add them to the events.
 */
async function addImagesToEvents() {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  for (const event of events) {
    try {
      console.log(`🔍 Searching image for event: ${event.name}`);
      const image = await fetchFirstImage(event.name);
      await EventService.update(event.id, { banner: image as any });
      console.log(`✅ Updated event ${event.id} (${event.name}) with image`);
    } catch (err) {
      console.error(`❌ Failed to update event ${event.id} (${event.name}):`, err);
    }
  }
}

async function addImagesToArtists() {
  const artists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  for (const artist of artists) {
    try {
      console.log(`🔍 Searching image for artist: ${artist.name}`);
      const image = await fetchFirstImage(artist.name);
      await ArtistsService.update(artist.id, { banner: image as any });
      console.log(`✅ Updated artist ${artist.id} (${artist.name}) with image`);
    } catch (err) {
      console.error(`❌ Failed to update artist ${artist.id} (${artist.name}):`, err);
    }
  }
}

async function addImagesToVenues() {
  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  for (const venue of venues) {
    try {
      console.log(`🔍 Searching image for venue: ${venue.name}`);
      const image = await fetchFirstImage(venue.name);
      await VenuesService.update(venue.id, { banner: image as any });
      console.log(`✅ Updated venue ${venue.id} (${venue.name}) with image`);
    } catch (err) {
      console.error(`❌ Failed to update venue ${venue.id} (${venue.name}):`, err);
    }
  }
}

export async function populateImages() {
  console.log("🚀 Populating event images...");
  await addImagesToEvents();

  console.log("🚀 Populating artist images...");
  await addImagesToArtists();

  console.log("🚀 Populating venue images...");
  await addImagesToVenues();

  console.log("🎉 Image population complete.");
}
