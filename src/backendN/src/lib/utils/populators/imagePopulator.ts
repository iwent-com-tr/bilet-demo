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
  let width, height;

  switch (keyword) {
    case "event":
      width = 1280;
      height = 768;
      break;
    case "artist":
      width = 600;
      height = 600;
      break;
    case "venue":
      width = 1280;
      height = 768;
      break;
    default:
      width = 600;
      height = 600;
  }

  try {
    const res = await fetch(`https://picsum.photos/${width}/${height}`);

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
    },
  });

  for (const event of events) {
    try {
      console.log(`🔍 Searching image for event: ${event.id}`);
      const image = await fetchFirstImage("event");
      await EventService.update(event.id, { banner: image as any });
      console.log(`✅ Updated event ${event.id} with image`);
    } catch (err) {
      console.error(`❌ Failed to update event ${event.id}:`, err);
    }
  }
}

async function addImagesToArtists() {
  const artists = await prisma.artist.findMany({
    select: {
      id: true,
    },
  });

  for (const artist of artists) {
    try {
      console.log(`🔍 Searching image for artist: ${artist.id}`);
      const image = await fetchFirstImage("artist");
      await ArtistsService.update(artist.id, { banner: image as any });
      console.log(`✅ Updated artist ${artist.id} with image`);
    } catch (err) {
      console.error(`❌ Failed to update artist ${artist.id}:`, err);
    }
  }
}

async function addImagesToVenues() {
  const venues = await prisma.venue.findMany({
    select: {
      id: true,
    },
  });

  for (const venue of venues) {
    try {
      console.log(`🔍 Searching image for venue: ${venue.id}`);
      const image = await fetchFirstImage("venue");
      await VenuesService.update(venue.id, { banner: image as any });
      console.log(`✅ Updated venue ${venue.id} with image`);
    } catch (err) {
      console.error(`❌ Failed to update venue ${venue.id}:`, err);
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
