import { z } from 'zod';
import { EVENT_CATEGORIES } from '../constants';
export type EventCategories = typeof EVENT_CATEGORIES[number];

export const EventStatuses = ['DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED'] as const;
export type EventStatus = typeof EventStatuses[number];

export const ListEventsQueryDTO = z.object({
  page: z.coerce
    .number()
    .int({ message: 'Sayfa numarası tam sayı olmalıdır.' })
    .min(1, { message: 'Sayfa numarası en az 1 olmalıdır.' })
    .default(1),
  limit: z.coerce
    .number()
    .int({ message: 'Limit tam sayı olmalıdır.' })
    .min(1, { message: 'Limit en az 1 olmalıdır.' })
    .max(100, { message: 'Limit en fazla 100 olabilir.' })
    .default(20),
  q: z.string().min(1, { message: 'Arama sorgusu en az 1 karakter olmalıdır.' }).optional(),
  city: z.string()
    .transform(val => val === '' ? undefined : val)
    .optional()
    .refine(val => !val || val.length >= 1, { message: 'Şehir adı en az 1 karakter olmalıdır.' }),
  category: z.string()
    .transform(val => val === '' ? undefined : val)
    .optional()
    .refine(val => !val || EVENT_CATEGORIES.includes(val as any), { message: 'Geçersiz kategori seçimi.' }),
  dateFrom: z.string()
    .transform(val => val === '' ? undefined : val)
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), { message: 'Geçersiz tarih formatı.' }),
  dateTo: z.string()
    .transform(val => val === '' ? undefined : val)
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), { message: 'Geçersiz tarih formatı.' }),
  organizerId: z.string().uuid({ message: 'organizerId geçerli bir UUID olmalıdır.' }).optional(),
  status: z.enum(EventStatuses).optional(),
});

export const CreateEventDTO = z.object({
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
    .optional(),
  ticketTypes: z.array(z.object({
    type: z.string().min(1, { message: 'Bilet türü adı zorunludur.' }),
    price: z.number().min(0, { message: 'Fiyat 0 veya daha büyük olmalıdır.' }),
    capacity: z.number().int().positive({ message: 'Bilet kapasitesi pozitif tam sayı olmalıdır.' })
  })).default([]).optional(),
  // Category specific details, will be routed to the corresponding detail table
  details: z.record(z.string(), z.any()).optional(),
  // For admin to assign an organizer on creation; ignored for organizer self-create
  organizerId: z.string().uuid({ message: 'organizerId geçerli bir UUID olmalıdır.' }).optional(),
}).superRefine((data, ctx) => {
  if (data.endDate <= data.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.' });
  }
  
  // Validate ticket capacities against total event capacity
  if (data.capacity && data.ticketTypes && data.ticketTypes.length > 0) {
    const totalTicketCapacity = data.ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
    if (totalTicketCapacity > data.capacity) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        path: ['ticketTypes'], 
        message: `Bilet kapasiteleri toplamı (${totalTicketCapacity}) etkinlik kapasitesini (${data.capacity}) aşamaz.` 
      });
    }
  }
});

export const UpdateEventDTO = z.object({
  name: z.string().min(2, { message: 'Etkinlik adı en az 2 karakter olmalıdır.' }).optional(),
  // Category change is intentionally disallowed to avoid cross-table migrations
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  venue: z.string().min(2, { message: 'Mekan adı en az 2 karakter olmalıdır.' }).optional(),
  address: z.string().min(2, { message: 'Adres en az 2 karakter olmalıdır.' }).optional(),
  city: z.string().min(2, { message: 'Şehir adı en az 2 karakter olmalıdır.' }).optional(),
  banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(),
  socialMedia: z.record(z.string(), z.any()).optional(),
  description: z.string().optional(),
  capacity: z
    .number()
    .int({ message: 'Kapasite tam sayı olmalıdır.' })
    .positive({ message: 'Kapasite pozitif olmalıdır.' })
    .optional(),
  ticketTypes: z.array(z.object({
    type: z.string().min(1, { message: 'Bilet türü adı zorunludur.' }),
    price: z.number().min(0, { message: 'Fiyat 0 veya daha büyük olmalıdır.' }),
    capacity: z.number().int().positive({ message: 'Bilet kapasitesi pozitif tam sayı olmalıdır.' })
  })).optional(),
  // Optional details update — shallow merge at service level per category table
  details: z.record(z.string(), z.any()).optional(),
  status: z.enum(EventStatuses).optional(),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate <= data.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır.' });
  }
  
  // Validate ticket capacities against total event capacity (if both are provided)
  if (data.capacity && data.ticketTypes && data.ticketTypes.length > 0) {
    const totalTicketCapacity = data.ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
    if (totalTicketCapacity > data.capacity) {
      ctx.addIssue({ 
        code: z.ZodIssueCode.custom, 
        path: ['ticketTypes'], 
        message: `Bilet kapasiteleri toplamı (${totalTicketCapacity}) etkinlik kapasitesini (${data.capacity}) aşamaz.` 
      });
    }
  }
});

export type ListEventsQuery = z.infer<typeof ListEventsQueryDTO>;
export type CreateEventInput = z.infer<typeof CreateEventDTO>;
export type UpdateEventInput = z.infer<typeof UpdateEventDTO>;

// ===== Category-specific detail DTOs =====
const JsonArray = z.array(z.any());

export const ConcertDetailsDTO = z.object({
  artistList: JsonArray.optional(),
  stageSetup: z.string().optional(),
  duration: z.string().optional(),
});

export const FestivalDetailsDTO = z.object({
  lineup: JsonArray.optional(),
  sponsors: JsonArray.optional(),
  activities: z.array(z.string()).optional(),
});

export const UniversityDetailsDTO = z.object({
  campus: z.string().optional(),
  department: z.string().optional(),
  studentDiscount: z.boolean().optional(),
  facultyList: JsonArray.optional(),
});

export const WorkshopDetailsDTO = z.object({
  instructorList: JsonArray.optional(),
  materials: JsonArray.optional(),
  skillLevel: z.string().optional(),
});

export const ConferenceDetailsDTO = z.object({
  speakerList: JsonArray.optional(),
  agenda: JsonArray.optional(),
  topics: z.array(z.string()).optional(),
  hasCertificate: z.boolean().optional(),
});

export const SportDetailsDTO = z.object({
  teams: JsonArray.optional(),
  league: z.string().optional(),
  scoreTracking: z.boolean().optional(),
  rules: z.string().optional(),
});

export const PerformanceDetailsDTO = z.object({
  performers: JsonArray.optional(),
  scriptSummary: z.string().optional(),
  duration: z.string().optional(),
  genre: z.string().optional(),
});

export const EducationDetailsDTO = z.object({
  curriculum: JsonArray.optional(),
  instructors: JsonArray.optional(),
  prerequisites: z.array(z.string()).optional(),
  certification: z.boolean().optional(),
});

export const DetailsSchemasByCategory: Record<EventCategories, z.ZodTypeAny> = {
  CONCERT: ConcertDetailsDTO,
  FESTIVAL: FestivalDetailsDTO,
  UNIVERSITY: UniversityDetailsDTO,
  WORKSHOP: WorkshopDetailsDTO,
  CONFERENCE: ConferenceDetailsDTO,
  SPORT: SportDetailsDTO,
  PERFORMANCE: PerformanceDetailsDTO,
  EDUCATION: EducationDetailsDTO,
};

// ===== Event Stats Types =====
export interface EventStats {
  totalTickets: number;
  usedTickets: number;
  cancelledTickets: number;
  totalRevenue: number;
  averagePrice: number;
  ticketTypeBreakdown: Array<{
    type: string;
    count: number;
    used: number;
    cancelled: number;
    revenue: number;
    averagePrice: number;
  }>;
  salesOverTime: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  usageStats: {
    usagePercentage: number;
    remainingTickets: number;
    peakEntryTime?: string;
  };
}


