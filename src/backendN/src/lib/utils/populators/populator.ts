import { populateEvents } from "./eventPopulator";
import { populateVenues } from "./venuePopulator";
import { populateArtists } from "./artistPopulator";
import { populateImages } from "./imagePopulator";

export async function populateDB(artistCount: number, venueCount: number, eventCount: number) {
    await populateVenues(venueCount);
    await populateArtists(artistCount);
    await populateEvents(eventCount);
    await populateImages();
}