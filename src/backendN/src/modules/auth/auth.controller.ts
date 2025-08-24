// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { RegisterDTO, RegisterOrganizerDTO_Separate, LoginDTO, RefreshDTO, UpdateProfileDTO } from './auth.dto';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

function humanizeError(e: any) {
  const code = e?.code;
  switch (code) {
    case 'CREDENTIALS_INVALID':
      e.message = 'E-posta veya şifre hatalı'; break;
    case 'ACCOUNT_NOT_APPROVED':
      e.message = 'Organizatör hesabı henüz onaylanmamış'; break;
    case 'PHONE_TAKEN':
      e.message = 'Telefon numarası zaten kullanımda';
    case 'EMAIL_TAKEN':
      e.message = 'E-posta adresi zaten kullanımda'; break;
    case 'PASSWORD_TOO_SHORT':
      e.message = 'Şifre en az 8 karakter olmalıdır'; break;
    case 'PASSWORD_NO_UPPERCASE':
      e.message = 'Şifre en az bir büyük harf içermelidir'; break;
    case 'PASSWORD_NO_SPECIAL_CHAR':
      e.message = 'Şifre en az bir özel karakter içermelidir'; break;
    case 'USER_NOT_FOUND':
      e.message = 'Kullanıcı bulunamadı'; break;
    case 'TOKEN_INVALID':
      e.message = 'Geçersiz veya süresi dolmuş oturum'; break;
    case 'TOKEN_MISSING':
      e.message = 'Oturum yenileme için token gerekli'; break;
    case 'PHONE_NOT_VERIFIED':
      e.message = 'Telefon numarası doğrulanmamış'; break;
    case 'EMAIL_NOT_FOUND':
      e.message = 'Bu e-posta ile kayıtlı kullanıcı bulunamadı'; break;
    case 'WRONG_ACCOUNT_TYPE_ORGANIZER':
      e.message = 'Bu e-posta bir organizatör hesabına kayıtlı. Lütfen Organizator Girişi yapın.'; break;
    case 'WRONG_ACCOUNT_TYPE_USER':
      e.message = 'Bu e-posta bir kullanıcı hesabına kayıtlı. Lütfen Kullanıcı Girişi yapın.'; break;
    case 'INVALID_EMAIL':
      e.message = 'Geçersiz e-posta adresi'; break;
    default:
      e.message = 'Bilinmeyen bir hata oluştu';
      break;
  }
  return e;
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RegisterDTO.parse(req.body);
    const { user, tokens } = await AuthService.register(input);
    res.status(201).json({ user: sanitizeUser(user), tokens });
  } catch (e) { next(humanizeError(e)); }
};

export const registerOrganizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RegisterOrganizerDTO_Separate.parse(req.body);
    const { organizer, tokens } = await AuthService.registerOrganizer(input);
    res.status(201).json({ organizer: sanitizeOrganizer(organizer), tokens });
  } catch (e) { next(humanizeError(e)); }
};

export const loginOrganizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = LoginDTO.parse(req.body);
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      const err: any = new Error('Bu e-posta bir kullanıcı hesabına kayıtlı. Lütfen Kullanıcı Girişi yapın.');
      err.status = 403; err.code = 'WRONG_ACCOUNT_TYPE_USER';
      throw err;
    }
    const { organizer, tokens } = await AuthService.loginOrganizer(email, password);
    res.status(200).json({ organizer: sanitizeOrganizer(organizer), tokens });
  } catch (e) { next(humanizeError(e)); }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try email login first
    const emailParsed = LoginDTO.safeParse(req.body);
    if (emailParsed.success) {
      const { email, password } = emailParsed.data as { email: string; password: string };
      // Explicitly ensure email belongs to a USER account, not an organizer
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (!userExists) {
        const organizerExists = await prisma.organizer.findUnique({ where: { email } });
        if (organizerExists) {
          const err: any = new Error('Bu e-posta bir organizatör hesabına kayıtlı. Lütfen Organizator Girişi yapın.');
          err.status = 403; err.code = 'WRONG_ACCOUNT_TYPE_ORGANIZER';
          throw err;
        }
        const err: any = new Error('Bu e-posta ile kayıtlı kullanıcı bulunamadı');
        err.status = 404; err.code = 'EMAIL_NOT_FOUND';
        throw err;
      }
      const { user, tokens } = await AuthService.login(email, password);
      return res.status(200).json({ user: sanitize(user), tokens });
    }
    
    // Fallback: try phone login (only if phone is verified)
    const PhoneLoginDTO = z.object({
      phone: z.string().regex(/^\+?[0-9]{10,15}$/),
      password: z.string().min(8)
    });

    const { phone, password } = PhoneLoginDTO.parse(req.body);

    // Basic normalization to match stored format
    const digits = phone.replace(/\D/g, '');
    let normalized = phone.startsWith('+') ? phone : `+${digits}`;
    if (digits.startsWith('90')) normalized = `+${digits}`;
    else if (digits.startsWith('0')) normalized = `+90${digits.substring(1)}`;
    else if (digits.length === 10) normalized = `+90${digits}`;

    const userByPhone = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { phone: normalized }
        ]
      }
    });

    if (!userByPhone) {
      const err: any = new Error('E-posta veya şifre hatalı');
      err.status = 401; err.code = 'CREDENTIALS_INVALID';
      throw err;
    }
    
    if (!userByPhone.phoneVerified) {
      const err: any = new Error('Telefon numarası doğrulanmamış');
      err.status = 403; err.code = 'PHONE_NOT_VERIFIED';
      throw err;
    }

    // Reuse existing email+password login flow for password check and token generation
    const { user, tokens } = await AuthService.login(userByPhone.email, password);
    res.status(200).json({ user: sanitize(user), tokens });
  } catch (e) { next(humanizeError(e)); }
};

export const me = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await AuthService.getUserById(req.user.id);
    res.json({ user: sanitizeUser(user) });
  } catch (e) { next(humanizeError(e)); }
};

export const updateProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const input = UpdateProfileDTO.parse(req.body);
    const updatedUser = await AuthService.updateUser(req.user.id, input);
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (e) { next(humanizeError(e)); }
};

export const refresh = async (req: any, res: Response, next: NextFunction) => {
  try {
    const input = RefreshDTO.parse(req.body);
    const { accessToken, refreshToken } = await AuthService.refresh(req.user?.id || req.body.userId, input.refreshToken);
    res.json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900 });
  } catch (e) { next(humanizeError(e)); }
};

export const logout = async (req: any, res: Response, next: NextFunction) => {
  try {
    await AuthService.logout(req.user.id, req.body?.refreshToken);
    res.status(204).send();
  } catch (e) { next(humanizeError(e)); }
};

// City and county endpoints are now in cities.controller.ts

// Sanitization functions
const sanitizeUser = (u: any) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  birthYear: u.birthYear,
  phone: u.phone,
  phoneVerified: u.phoneVerified,
  avatar: u.avatar,
  city: u.city,
  userType: u.userType,
  points: u.points,
  lastLogin: u.lastLogin,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt
});

const sanitizeOrganizer = (o: any) => ({
  id: o.id,
  firstName: o.firstName,
  lastName: o.lastName,
  company: o.company,
  phone: o.phone,
  phoneVerified: o.phoneVerified,
  avatar: o.avatar,
  email: o.email,
  approved: o.approved,
  lastLogin: o.lastLogin,
  createdAt: o.createdAt,
  updatedAt: o.updatedAt
});

// Legacy sanitize function for backward compatibility
const sanitize = (u: any) => sanitizeUser(u);
