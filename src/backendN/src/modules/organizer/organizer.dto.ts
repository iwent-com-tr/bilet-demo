import { z } from 'zod';

const phoneRegex = /^\+?[0-9]{10,15}$/;

function isValidTaxNumber(vno: string): boolean {
  if (!/^[1-9][0-9]{9}$/.test(vno)) return false; // format
  const digits = vno.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let tmp = (digits[i] + (9 - i)) % 10;
    if (tmp === 0) tmp = 10;
    sum += (tmp * (2 ** (9 - i))) % 9;
  }
  sum = sum % 10;
  const checkDigit = (10 - sum) % 10;
  return checkDigit === digits[9];
}

const taxNumberOptional = z
  .string()
  .regex(/^[1-9][0-9]{9}$/, { message: 'Vergi numarası 10 haneli olmalı ve 0 ile başlayamaz.' })
  .refine((v) => isValidTaxNumber(v), { message: 'Vergi numarası geçersiz (kontrol basamağı hatalı).' })
  .optional();

export const ListOrganizersQueryDTO = z.object({
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
});

export const AdminCreateOrganizerDTO = z.object({
  firstName: z
    .string()
    .min(2, { message: 'İsim en az 2 karakter olmalıdır.' })
    .max(100, { message: 'İsim en fazla 100 karakter olmalıdır.' }),
  lastName: z
    .string()
    .min(2, { message: 'Soyisim en az 2 karakter olmalıdır.' })
    .max(100, { message: 'Soyisim en fazla 100 karakter olmalıdır.' }),
  company: z.string().min(2, { message: 'Şirket adı en az 2 karakter olmalıdır.' }),
  phone: z.string().regex(phoneRegex, { message: 'Telefon numarası geçersiz. Örn: +905551112233' }),
  email: z.string().email({ message: 'Geçerli bir e-posta adresi giriniz.' }),
  password: z.string().min(8, { message: 'Şifre en az 8 karakter olmalıdır.' }),
  taxNumber: taxNumberOptional,
  taxOffice: z.string().optional(),
  address: z.string().optional(),
  bankAccount: z.string().optional(),
  avatar: z.string().optional(),
});

export const OrganizerSelfUpdateDTO = z.object({
  firstName: z
    .string()
    .min(2, { message: 'İsim en az 2 karakter olmalıdır.' })
    .max(100, { message: 'İsim en fazla 100 karakter olmalıdır.' })
    .optional(),
  lastName: z
    .string()
    .min(2, { message: 'Soyisim en az 2 karakter olmalıdır.' })
    .max(100, { message: 'Soyisim en fazla 100 karakter olmalıdır.' })
    .optional(),
  phone: z
    .string()
    .regex(phoneRegex, { message: 'Telefon numarası geçersiz. Örn: +905551112233' })
    .optional(),
  avatar: z.string().optional(),
  company: z
    .string()
    .min(2, { message: 'Şirket adı en az 2 karakter olmalıdır.' })
    .optional(),
  taxNumber: taxNumberOptional,
  taxOffice: z.string().optional(),
  address: z.string().optional(),
  bankAccount: z.string().optional(),
});

export const OrganizerAdminUpdateDTO = OrganizerSelfUpdateDTO.extend({
  email: z.string().email({ message: 'Geçerli bir e-posta adresi giriniz.' }).optional(),
  approved: z.boolean().optional(),
});

export const ApproveDTO = z.object({ approved: z.boolean() });

export const OrganizerEventsQueryDTO = z.object({
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
  category: z.string().optional(),
  city: z.string()
    .transform(val => val === '' ? undefined : val)
    .optional()
    .refine(val => !val || val.length >= 1, { message: 'Şehir adı en az 1 karakter olmalıdır.' }),
  status: z.enum(['DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED'] as const).optional(),
  dateFrom: z.string()
    .transform(val => val === '' ? undefined : val)
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), { message: 'Geçersiz tarih formatı.' }),
  dateTo: z.string()
    .transform(val => val === '' ? undefined : val)
    .optional()
    .refine(val => !val || !isNaN(Date.parse(val)), { message: 'Geçersiz tarih formatı.' }),
});

// Types
export type ListOrganizersQuery = z.infer<typeof ListOrganizersQueryDTO>;
export type AdminCreateOrganizerInput = z.infer<typeof AdminCreateOrganizerDTO>;
export type OrganizerSelfUpdateInput = z.infer<typeof OrganizerSelfUpdateDTO>;
export type OrganizerAdminUpdateInput = z.infer<typeof OrganizerAdminUpdateDTO>;
export type ApproveInput = z.infer<typeof ApproveDTO>;
export type OrganizerEventsQuery = z.infer<typeof OrganizerEventsQueryDTO>;


