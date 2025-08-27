import { EventService } from "../../../modules/event/event.service";
import { EVENT_CATEGORIES } from "../../../modules/constants";
import { Chat } from "../../openai";
import { MeiliService } from "../../../modules/publicServices/meili.service";

const base = "export const CreateEventDTO = z.object({ \
  name: z.string().min(2, { message: 'Etkinlik adı en az 2 karakter olmalıdır.' }), \
  category: z.enum(EVENT_CATEGORIES ), \
  startDate: z.coerce.date(), \
  endDate: z.coerce.date(), \
  venue: z.string().min(2, { message: 'Mekan adı en az 2 karakter olmalıdır.' }), \
  address: z.string().min(2, { message: 'Adres en az 2 karakter olmalıdır.' }), \
  city: z.string().min(2, { message: 'Şehir adı en az 2 karakter olmalıdır.' }), \
  banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(), \
  socialMedia: z.record(z.string(), z.any()).default({}).optional(), \
  description: z.string().optional(), \
  capacity: z \
    .number() \
    .int({ message: 'Kapasite tam sayı olmalıdır.' }) \
    .positive({ message: 'Kapasite pozitif olmalıdır.' }) \
    .optional(), \
  ticketTypes: z.array(z.object({ \
    type: z.string().min(1, { message: 'Bilet türü adı zorunludur.' }), \
    price: z.number().min(0, { message: 'Fiyat 0 veya daha büyük olmalıdır.' }), \
    capacity: z.number().int().positive({ message: 'Bilet kapasitesi pozitif tam sayı olmalıdır.' }) \
  })).default([]).optional(), \
  // For admin to assign an organizer on creation; ignored for organizer self-create \
  organizerId: z.string().uuid({ message: 'organizerId geçerli bir UUID olmalıdır.' }).optional(), \
  artists: z.array(z.record(z.string(), z.any()).optional()), \
}).superRefine((data, ctx) => { \
  if (data.endDate <= data.startDate) { \
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.' }); \
  } \
});";

export const eventPopulatorChat = new Chat();



export async function populateEvents(n: number) {
  if (n === 0) return;
  await eventPopulatorChat.prompt("system", `Create a new event based on ${base}. Use a Turkish city and venue and a category from: ${EVENT_CATEGORIES.join(', ')}. Artists will be an array of objects of form {name: string, time: string }. pass [] for artists if field is not applicable. Output only the JavaScript object as JSON, no backticks or extra text. Each time prompted, create another event.`)
  while(n > 0) {
    const response = await eventPopulatorChat.prompt("user", `Next event.`);
    const organizerId = process.env.POPULATOR_ORGANIZER_ID || "baf5273a-2c2b-4fea-9b3f-d8c169ac6d7a";
    const query = JSON.parse(response.output_text);

    const artists = await Promise.all(query.artists.map(async (artist: any) => {
      const dbArtists = await MeiliService.getArtistHitsFromQuery({ q: artist.name });
      const id = dbArtists.hits.length > 0 ? dbArtists.hits[0].id : artist.name;
      return { id, time: artist.time };
    }))

    const dbVenue = await MeiliService.getVenueHitsFromQuery({ q: query.venue });
    const venueId = dbVenue.hits.length > 0 ? dbVenue.hits[0].id : query.venue;


    const createInfo = {...query, artists, venueId};

    const newEvent = await EventService.create({ ...createInfo, organizerId });
    EventService.publish(newEvent.id);
    n--;
  }
}