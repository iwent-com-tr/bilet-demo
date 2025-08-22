import { Chat } from "../../openai";
import { ArtistsService } from "../../../modules/artists/artists.service";

const base = "export const CreateArtistDTO = z.object({ \
    name: z.string(), \
    banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(), \
    genres: z.string().optional(), \
    socialMedia: z.record(z.string(), z.any()).default({}).optional(), \
    bio: z.string().optional(), \
    organizerId: z.string().uuid({ message: `organizerId'gcerli bir UUID olmalıdır.` }).optional(), \
});";

export const artistPopulatorChat = new Chat();

export async function populateArtists(n: number) {
  if (n === 0) return;
  await artistPopulatorChat.prompt("system", `Create a new artist based on ${base}. Use Turkish names. Output only the JavaScript object as JSON, no backticks or extra text. Each time prompted, create another event.`)
  while(n > 0) {
    const response = await artistPopulatorChat.prompt("user", `Next artist.`);
    const organizerId = process.env.POPULATOR_ORGANIZER_ID || "baf5273a-2c2b-4fea-9b3f-d8c169ac6d7a";

    let jsonQuery = undefined;
    try {
        jsonQuery = JSON.parse(response.output_text);
        await ArtistsService.create({...jsonQuery, organizerId});
    } catch (error) {
        console.log('failed artist populate with following query', response.output_text)
    }
    n--;
  }
}
