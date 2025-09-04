import { EventService } from "../../../modules/event/event.service";
import { ArtistsService } from "../../../modules/artists/artists.service";
import { VenuesService } from "../../../modules/venues/venues.service";
import { prisma } from "../../prisma";
import https from "https";
import { URL } from "url";


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
      await EventService.update(event.id, { banner: `https://picsum.photos/seed/${Math.floor(Math.random() * 10000)}${1280}/${768}` });
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
      await ArtistsService.update(artist.id, { banner: `https://picsum.photos/seed/${Math.floor(Math.random() * 10000)}${600}/${600}` });
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
      await VenuesService.update(venue.id, { banner: `https://picsum.photos/seed/${Math.floor(Math.random() * 10000)}${1280}/${768}` });
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
