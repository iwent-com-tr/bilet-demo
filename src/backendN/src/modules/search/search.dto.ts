import { date, z } from 'zod';
import { EVENT_CATEGORIES } from '../constants';

export const EventSearchQueryDTO = z.object({
    q: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    page: z.coerce.number().int().min(1).optional(),
    city: z.string().optional(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    category: z.string().optional().refine(val => !val || val?.split(',').every(str => EVENT_CATEGORIES.includes(str as any)), { message: 'Geçersiz kategori seçimi.' }),
    price: z.number().optional(),
    distance: z.number().optional(),
    userLocation: z.object({
        latitude: z.number(),
        longitude: z.number(),
    }).optional(),
});

export const ArtistSearchQueryDTO = z.object({
    q: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    page: z.coerce.number().int().min(1).optional(),
    genres: z.array(z.string()).optional(),
});

export const VenueSearchQueryDTO = z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters'),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    page: z.coerce.number().int().min(1).optional(),
    city: z.string().optional(),
    distance: z.number().optional(),
    userLocation: z.object({
        latitude: z.number(),
        longitude: z.number(),
    }).default({ latitude: 0, longitude: 0 }),
});

export const OrganizerSearchQueryDTO = z.object({
    q: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    page: z.coerce.number().int().min(1).optional(),
});

export type EventSearchQuery = z.infer<typeof EventSearchQueryDTO>;
export type ArtistSearchQuery = z.infer<typeof ArtistSearchQueryDTO>;
export type VenueSearchQuery = z.infer<typeof VenueSearchQueryDTO>;
export type OrganizerSearchQuery = z.infer<typeof OrganizerSearchQueryDTO>;

