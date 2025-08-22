import { lazy, z } from "zod";

export const CreateArtistDTO = z.object({
    name: z.string(),
    banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(),
    genres: z.string().optional(),
    socialMedia: z.record(z.string(), z.any()).default({}).optional(),
    bio: z.string().optional(),
    organizerId: z.string().uuid({ message: `organizerId'gcerli bir UUID olmalıdır.` }).optional(),
});

export const UpdateArtistDTO = z.object({
    name: z.string().optional(),
    banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(),
    genres: z.string().optional(),
    socialMedia: z.record(z.string(), z.any()).default({}).optional(),
    bio: z.string().optional(),
    organizerId: z.string().uuid({ message: `organizerId'gcerli bir UUID olmalıdır.` }).optional(),
});

export const ListArtistsQueryDTO = z.object({
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
  q: z.string().optional(),
  genres: z.string().optional(),
});

export type CreateArtistInput = z.infer<typeof CreateArtistDTO>;
export type UpdateArtistInput = z.infer<typeof UpdateArtistDTO>;
export type ListArtistsQueryInfo = z.infer<typeof ListArtistsQueryDTO>;
