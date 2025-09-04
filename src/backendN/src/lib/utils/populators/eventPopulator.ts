import { EventService } from "../../../modules/event/event.service";
import { EVENT_CATEGORIES } from "../../../modules/constants";
import { Chat } from "../../openai";
import { MeiliService } from "../../../modules/publicServices/meili.service";

const base = `export const CreateEventDTO = z.object({
  name: z.string().min(2, { message: 'Etkinlik adı en az 2 karakter olmalıdır.' }),
  category: z.enum(EVENT_CATEGORIES ),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  venue: z.string().min(2, { message: 'Mekan adı en az 2 karakter olmalıdır.' }),
  address: z.string().min(2, { message: 'Adres en az 2 karakter olmalıdır.' }),
  city: z.string().min(2, { message: 'Şehir adı en az 2 karakter olmalıdır.' }),
  banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(),
  socialMedia: z.record(z.string(), z.any()).default({}).optional(),
  description: z.string().optional(),
  capacity: z
    .number()
    .int({ message: 'Kapasite tam sayı olmalıdır.' })
    .positive({ message: 'Kapasite pozitif olmalıdır.' })
    .nullable()
    .optional()
    .transform(val => val === null ? undefined : val),
  ticketTypes: z.array(z.object({
    type: z.string().min(1, { message: 'Bilet türü adı zorunludur.' }).optional(),
    name: z.string().min(1, { message: 'Bilet türü adı zorunludur.' }).optional(),
    price: z.number().min(0, { message: 'Fiyat 0 veya daha büyük olmalıdır.' }),
    capacity: z.number().int().positive({ message: 'Bilet kapasitesi pozitif tam sayı olmalıdır.' }).optional(),
    quota: z.number().int().positive({ message: 'Bilet kapasitesi pozitif tam sayı olmalıdır.' }).optional(),
    currency: z.string().optional()
  }).transform((data) => ({
    type: data.type || data.name || '',
    price: data.price,
    capacity: data.capacity || data.quota || 0
  })).refine((data) => data.type.length > 0, {
    message: 'Bilet türü adı zorunludur (type veya name alanı).'
  }).refine((data) => data.capacity > 0, {
    message: 'Bilet kapasitesi pozitif tam sayı olmalıdır (capacity veya quota alanı).'
  })).default([]).optional(),
  // Category specific details, will be routed to the corresponding detail table
  details: z.record(z.string(), z.any()).optional(),
  // For admin to assign an organizer on creation; ignored for organizer self-create
  organizerId: z.string().uuid({ message: 'organizerId geçerli bir UUID olmalıdır.' }).optional(),
  venueId: z.string().optional(),
  // Accept artists as strings or objects, normalize to non-empty strings, filter null/undefined
  artists: z
    .array(
      z.union([
        z.string(),
        z.record(z.string(), z.any()),
        z.null(),
        z.undefined(),
      ])
    )
    .optional()
    .transform((arr) => {
      const list = (arr || []) as Array<string | Record<string, any> | null | undefined>;
      return list
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            const val = (item as any).name ?? (item as any).title ?? '';
            return typeof val === 'string' ? val.trim() : '';
          }
          return '';
        })
        .filter((v) => v.length > 0);
    }),
})`;

export const eventPopulatorChat = new Chat();



export async function populateEvents(n: number) {
  if (n === 0) return;
  await eventPopulatorChat.prompt("system", `Create a new event based on ${base}. Use Turkish cities and venue and a category from: ${EVENT_CATEGORIES.join(', ')}. Artists will be an array of objects of form {name: string, time: string }. pass [] for artists if field is not applicable. Pick dates from august 2025 to august 2026. Output only the JavaScript object as JSON, no backticks or extra text. Each time prompted, create another event.`)
  while(n > 0) {
    const response = await eventPopulatorChat.prompt("user", `Next event.`);
    const organizerId = process.env.POPULATOR_ORGANIZER_ID || "0710a797-c58b-4a44-bb34-e96d32b8df78";
    const query = JSON.parse(response.output_text);

    const artists = await Promise.all(query.artists.map(async (artist: any) => {
      const dbArtists = await MeiliService.getArtistHitsFromQuery({ q: artist.name });
      if (dbArtists.hits.length > 0) {
        return {
          id: dbArtists.hits[0].id,
          time: artist.time
        }
      } else {
        return {
          name: artist.name,
          time: artist.time
        }
      }
    }))

    const dbVenue = await MeiliService.getVenueHitsFromQuery({ q: query.venue });
    const createInfo = {...query, artists, ...(dbVenue.hits.length > 0 && { venueId: dbVenue.hits[0].id })};

    const newEvent = await EventService.create({ ...createInfo, organizerId });
    EventService.publish(newEvent.id);
    n--;
  }
}