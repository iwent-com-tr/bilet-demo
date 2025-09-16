import { z } from 'zod';
// Import cities data
import citiesData from '../../lib/cities.json' with { type: 'json' };

// Ortak şifre politikası
const passwordPolicy = z
  .string()
  .min(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
  .max(128, { message: 'Şifre en fazla 128 karakter olmalıdır.' })
  .regex(/[A-Z]/, { message: 'Şifre en az bir büyük harf içermelidir.' })
  .regex(/[^A-Za-z0-9]/, { message: 'Şifre en az bir özel karakter içermelidir.' });

const currentYear = new Date().getFullYear();
const phoneRegex = /^\+?[0-9]{10,15}$/;

// City validation from cities.json
const cityNames = citiesData.map((city: any) => city.name);
const getCitiesByName = () => citiesData.reduce((acc: any, city: any) => {
  acc[city.name] = city.counties;
  return acc;
}, {} as Record<string, string[]>);

const citySchema = z.string().refine(
  (city) => cityNames.includes(city.toLowerCase()),
  { message: 'Geçersiz şehir seçimi.' }
);

// User types from Prisma schema
export const UserTypeEnum = z.enum(['USER', 'ADMIN']);
export const adminRoleEnum = z.enum(['ADMIN', 'SUPPORT', 'READONLY', 'USER']);
// Kullanıcı (User) kayıt DTO'su — Prisma `User` modeline göre
export const RegisterUserDTO = z.object({
  firstName: z
    .string()
    .min(2, { message: 'İsim en az 2 karakter olmalıdır.' })
    .max(100, { message: 'İsim en fazla 100 karakter olmalıdır.' }),
  lastName: z
    .string()
    .min(2, { message: 'Soyisim en az 2 karakter olmalıdır.' })
    .max(100, { message: 'Soyisim en fazla 100 karakter olmalıdır.' }),
  email: z.string().email(),
  password: passwordPolicy,
  birthYear: z
    .number()
    .int({ message: 'Doğum yılı tam sayı olmalıdır.' })
    .min(1900, { message: 'Doğum yılı 1900 ve sonrası olmalıdır.' })
    .max(currentYear, { message: `Doğum yılı ${currentYear} değerini aşamaz.` }),
  phone: z
    .string()
    .regex(phoneRegex, { message: 'Telefon numarası geçersiz. Örn: +905551112233' }),
  city: citySchema,
  userType: UserTypeEnum.default('USER'),
  adminRole: adminRoleEnum.default('USER'),
  avatar: z.string().optional()
}).refine(
  (data) => {
    // Validate county exists for the selected city
    const citiesMap = getCitiesByName();
    return citiesMap[data.city.toLowerCase()] !== undefined;
  },
  { message: 'Şehir seçimi geçersiz.' }
);

// Organizatör (Organizer) kayıt DTO'su — Prisma `Organizer` modeline göre
export const RegisterOrganizerDTO = z.object({
  firstName: z
    .string()
    .min(2, { message: 'İsim en az 2 karakter olmalıdır.' })
    .max(100, { message: 'İsim en fazla 100 karakter olmalıdır.' }),
  lastName: z
    .string()
    .min(2, { message: 'Soyisim en az 2 karakter olmalıdır.' })
    .max(100, { message: 'Soyisim en fazla 100 karakter olmalıdır.' }),
  company: z.string().min(2, { message: 'Şirket adı en az 2 karakter olmalıdır.' }),
  phone: z
    .string()
    .regex(phoneRegex, { message: 'Telefon numarası geçersiz. Örn: +905551112233' }),
  email: z.string().email(),
  password: passwordPolicy,
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  address: z.string().optional(),
  bankAccount: z.string().optional(),
  avatar: z.string().optional()
});

// Main registration DTO for users
export const RegisterDTO = RegisterUserDTO;
export type RegisterInput = z.infer<typeof RegisterDTO>;

// Separate registration DTO for organizers (keeping existing structure)
export const RegisterOrganizerDTO_Separate = RegisterOrganizerDTO;
export type RegisterOrganizerInput = z.infer<typeof RegisterOrganizerDTO_Separate>;

export const LoginDTO = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: 'Şifre en az 8 karakter olmalıdır.' })
});
export type LoginInput = z.infer<typeof LoginDTO>;

export const RefreshDTO = z.object({
  refreshToken: z.string().min(10).optional() 
});
export type RefreshInput = z.infer<typeof RefreshDTO>;

export const UpdateProfileDTO = z.object({
  firstName: z.string().min(2, { message: 'İsim en az 2 karakter olmalıdır.' }).max(100, { message: 'İsim en fazla 100 karakter olmalıdır.' }).optional(),
  lastName: z.string().min(2, { message: 'Soyisim en az 2 karakter olmalıdır.' }).max(100, { message: 'Soyisim en fazla 100 karakter olmalıdır.' }).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(phoneRegex, { message: 'Telefon numarası geçersiz.' }).optional(),
  city: citySchema.optional(),
  avatar: z.string().optional()
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileDTO>;

export const UpdateUserDTO = z.object({
  firstName: z.string().min(2, { message: 'İsim en az 2 karakter olmalıdır.' }).max(100, { message: 'İsim en fazla 100 karakter olmalıdır.' }).optional(),
  lastName: z.string().min(2, { message: 'Soyisim en az 2 karakter olmalıdır.' }).max(100, { message: 'Soyisim en fazla 100 karakter olmalıdır.' }).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(phoneRegex, { message: 'Telefon numarası geçersiz.' }).optional(),
  birthYear: z.number().int().min(1900).max(currentYear).optional(),
  city: citySchema.optional(),
  userType: UserTypeEnum.optional(),
  avatar: z.string().optional()
});
export type UpdateUserInput = z.infer<typeof UpdateUserDTO>;

// City and County helper DTOs
export const GetCountiesDTO = z.object({
  city: citySchema
});
export type GetCountiesInput = z.infer<typeof GetCountiesDTO>;

// Helper function to get cities
export const getCities = () => citiesData.map((city: any) => ({ 
  name: city.name, 
  plate: city.plate, 
  latitude: city.latitude, 
  longitude: city.longitude 
}));

// Helper function to get counties for a city
export const getCountiesForCity = (cityName: string) => {
  const city = citiesData.find((c: any) => c.name.toLowerCase() === cityName.toLowerCase());
  return city ? city.counties : [];
};

// Google OAuth DTOs
export const GoogleAuthStartDTO = z.object({
  redirectUri: z.string().url().optional(),
  state: z.string().optional()
});
export type GoogleAuthStartInput = z.infer<typeof GoogleAuthStartDTO>;

export const GoogleAuthCallbackDTO = z.object({
  code: z.string().min(1, { message: 'Authorization code gerekli' }),
  state: z.string().min(1, { message: 'State parametresi gerekli' }),
  redirectUri: z.string().url().optional()
});
export type GoogleAuthCallbackInput = z.infer<typeof GoogleAuthCallbackDTO>;

export const GoogleAuthRefreshDTO = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token gerekli' })
});
export type GoogleAuthRefreshInput = z.infer<typeof GoogleAuthRefreshDTO>;
