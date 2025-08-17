import { EventService } from "../modules/event/event.service";
import { EVENT_CATEGORIES } from "../modules/constants";
import { Chat } from "./openai";

const base = "export type CreateEventDTOType = {\
  name: string; // min 2 characters\
  category: typeof EVENT_CATEGORIES[number]; // enum values\
  startDate: Date; // coerced date\
  endDate: Date; // coerced date\
  venue: string; // min 2 characters\
  address: string; // min 2 characters\
  city: string; // min 2 characters\
  banner?: string; // optional, must be valid URL\
  socialMedia?: Record<string, any>; // optional, default {}\
  description?: string; // optional\
  capacity?: number; // optional, positive integer\
  ticketTypes?: {\
    type: string; // min 1 character\
    price: number; // >= 0\
    capacity: number; // positive integer\
  }[]; // optional, defaults to []\
  details?: Record<string, any>; // optional\
  organizerId?: string; // optional, must be UUID\
};";

export const eventPopulatorChat = new Chat();



export async function populateEvents(n: number) {
  const initial = await eventPopulatorChat.prompt("system", `Create a new event based on ${base}. Change 'name' and 'description'; keep all other top-level fields exactly the same except 'details'. Use a Turkish city and a category from: ${EVENT_CATEGORIES.join(', ')}. Output only the JavaScript object as JSON, no backticks or extra text. Each time prompted, create another event.`)
  while(n > 0) {
    const response = await eventPopulatorChat.prompt("user", `Next event.`);
    const organizerId = process.env.POPULATOR_ORGANIZER_ID || "baf5273a-2c2b-4fea-9b3f-d8c169ac6d7a";
    const newEvent = await EventService.create({ ...JSON.parse(response.output_text), organizerId });
    EventService.publish(newEvent.id);
    n--;
  }
}