import { Chat } from "../../openai";
import { VenuesService } from "../../../modules/venues/venues.service";

const base = "export const CreateVenueDTO = z.object({ \
    name: z.string(), \
    banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(), \
    details: z.string().optional(), \
    capacity: z \
    .number() \
    .int({ message: 'Kapasite tam sayı olmalıdır.' }) \
    .positive({ message: 'Kapasite pozitif olmalıdır.' }) \
    .optional(), \
    seatedCapacity: z \
    .number() \
    .int({ message: 'Kapasite tam sayı olmalıdır.' }) \
    .positive({ message: 'Kapasite pozitif olmalıdır.' }) \
    .optional(), \
    standingCapacity: z \
    .number() \
    .int({ message: 'Kapasite tam sayı olmalıdır.' }) \
    .positive({ message: 'Kapasite pozitif olmalıdır.' }) \
    .optional(), \
    accessibility: z.record(z.string(), z.string()).optional(), \
    address: z.string().min(2, { message: 'Adres en az 2 karakter olmalıdır.' }), \
    city: z.string().min(2, { message: 'Şehir adı en az 2 karakter olmalıdır.' }), \
    latitude: z.number().optional(), \
    longitude: z.number().optional(), \
    mapsLocation: z.string().url({ message: `Google Maps URL'i gereklidir.` }).optional(), \
    organizerId: z.string(), \
});";

export const venuePopulatorChat = new Chat();

export async function populateVenues(n: number) {
  if (n === 0) return;
  await venuePopulatorChat.prompt("system", `Create a new venue based on ${base}. Use a Turkish city and addresses. Output only the JavaScript object as JSON, no backticks or extra text. Each time prompted, create another event.`)
  while(n > 0) {
    const response = await venuePopulatorChat.prompt("user", `Next venue.`);
    const organizerId = process.env.POPULATOR_ORGANIZER_ID || "baf5273a-2c2b-4fea-9b3f-d8c169ac6d7a";

    let jsonQuery = undefined;

    try {
        jsonQuery = JSON.parse(response.output_text);
        await VenuesService.create({...jsonQuery, organizerId});
    } catch (error) {
        console.log('failed venue populate with following query', response.output_text)
    }
    n--;
  }
}