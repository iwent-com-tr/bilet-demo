import { LastMonthInstance } from "twilio/lib/rest/api/v2010/account/usage/record/lastMonth";
import { AccessTokenInstance } from "twilio/lib/rest/verify/v2/service/accessToken";
import { lazy, z } from "zod";

export const CreateVenueDTO = z.object({
    name: z.string(),
    banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(),
    details: z.string().optional(),
    capacity: z
    .number()
    .int({ message: 'Kapasite tam sayı olmalıdır.' })
    .positive({ message: 'Kapasite pozitif olmalıdır.' })
    .optional(),
    seatedCapacity: z
    .number()
    .int({ message: 'Kapasite tam sayı olmalıdır.' })
    .positive({ message: 'Kapasite pozitif olmalıdır.' })
    .optional(),
    standingCapacity: z
    .number()
    .int({ message: 'Kapasite tam sayı olmalıdır.' })
    .positive({ message: 'Kapasite pozitif olmalıdır.' })
    .optional(),
    accessibility: z.record(z.string(), z.string()).optional(),
    address: z.string().min(2, { message: 'Adres en az 2 karakter olmalıdır.' }),
    city: z.string().min(2, { message: 'Şehir adı en az 2 karakter olmalıdır.' }),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    mapsLocation: z.string().url({ message: `Google Maps URL'i gereklidir.` }).optional(),
    organizerId: z.string(),
});

export const UpdateVenueDTO = z.object({
    name: z.string().optional(),
    banner: z.string().url({ message: 'Banner geçerli bir URL olmalıdır.' }).optional(),
    details: z.string().optional(),
    capacity: z
    .number()
    .int({ message: 'Kapasite tam sayı olmalıdır.' })
    .positive({ message: 'Kapasite pozitif olmalıdır.' })
    .optional(),
    seatedCapacity: z
    .number()
    .int({ message: 'Kapasite tam sayı olmalıdır.' })
    .positive({ message: 'Kapasite pozitif olmalıdır.' })
    .optional(),
    standingCapacity: z
    .number()
    .int({ message: 'Kapasite tam sayı olmalıdır.' })
    .positive({ message: 'Kapasite pozitif olmalıdır.' })
    .optional(),
    accessibility: z.record(z.string(), z.string()).optional(),
    address: z.string().min(2, { message: 'Adres en az 2 karakter olmalıdır.' }).optional(),
    city: z.string().min(2, { message: 'Şehir adı en az 2 karakter olmalıdır.' }).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    mapsLocation: z.string().url({ message: `Google Maps URL'i olmalıdır.` }).optional(),
});

export const ListVenuesQueryDTO = z.object({
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
  city: z.string()
    .transform(val => val === '' ? undefined : val)
    .optional()
    .refine(val => !val || val.length >= 1, { message: 'Şehir adı en az 1 karakter olmalıdır.' }),
  organizerId: z.string().uuid({ message: 'organizerId geçerli bir UUID olmalıdır.' }).optional(),
  distance: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export type CreateVenueInput = z.infer<typeof CreateVenueDTO>;
export type UpdateVenueInput = z.infer<typeof UpdateVenueDTO>;
export type ListVenuesQueryInfo = z.infer<typeof ListVenuesQueryDTO>;