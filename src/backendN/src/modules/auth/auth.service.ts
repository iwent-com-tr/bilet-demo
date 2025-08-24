// src/modules/auth/auth.service.ts
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/crypto';
import { signAccess, signRefresh, verifyRefresh } from '../../lib/jwt';
import type { RegisterInput } from './auth.dto';
import { any } from 'zod';

// UserType enum values matching the Prisma schema
const UserType = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  ORGANIZER: 'ORGANIZER',
  SUPPORT: 'SUPPORT',
  READONLY: 'READONLY'
} as const;

export class AuthService {
  static async register(userData: RegisterInput) {
    const { email, password, firstName, lastName, birthYear, adminRole, phone, city, userType, avatar } = userData;
    
    const exists = await prisma.user.findUnique({ where: { email } });
    const existsOrganizer = await prisma.organizer.findUnique({ where: { email } });
    if (exists || existsOrganizer) {
      const err: any = new Error('email already in use');
      err.status = 409; err.code = 'EMAIL_TAKEN';
      throw err;
    }
    const phoneExists = await prisma.user.findUnique({ where: { phone } });
    if (phoneExists) {
      const err: any = new Error('phone already in use');
      err.status = 409; err.code = 'PHONE_TAKEN';
      throw err;
    }
    // Password validation is now handled by the DTO, but keeping basic checks
    if (password.length < 8) {
      const err: any = new Error('password must be at least 8 characters long');
      err.status = 400; err.code = 'PASSWORD_TOO_SHORT';
      throw err;
    }
    if (!password.match(/[A-Z]/)) {
      const err: any = new Error('password must contain at least one uppercase letter');
      err.status = 400; err.code = 'PASSWORD_NO_UPPERCASE';
      throw err;
    }
    if (!password.match(/[^A-Za-z0-9]/)) {
      const err: any = new Error('password must contain at least one special character');
      err.status = 400; err.code = 'PASSWORD_NO_SPECIAL_CHAR';
      throw err;
    }
    
    // Determine the correct adminRole based on userType
    let finalAdminRole: 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY';
    if (userType === 'USER') {
      // If userType is USER, adminRole must always be USER regardless of the request
      finalAdminRole = 'USER';
    } else if (userType === 'ADMIN') {
      // If userType is ADMIN, adminRole can be customizable (default to USER if not provided)
      finalAdminRole = (adminRole as 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY') || 'USER';
    } else {
      // Default case (should not happen with proper validation)
      finalAdminRole = 'USER';
    }
    
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        firstName,
        lastName,
        birthYear,
        phone,
        city,
        userType: userType || UserType.USER,
        adminRole: finalAdminRole,
        avatar,
        phoneVerified: false,
        points: 0
      }
    });
    
    const accessToken = signAccess({ sub: user.id, userType: user.userType });
    const refreshToken = signRefresh({ sub: user.id });
    
    return { user, tokens: { accessToken, refreshToken } };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.password))) {
      const err: any = new Error('invalid credentials');
      err.status = 401; err.code = 'CREDENTIALS_INVALID';
      throw err;
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    const accessToken = signAccess({ sub: user.id, userType: user.userType });
    const refreshToken = signRefresh({ sub: user.id });
    
    return { user, tokens: { accessToken, refreshToken } };
  }

  static async refresh(userId: string, incomingToken?: string) {
    if (!incomingToken) {
      const err: any = new Error('refresh token required');
      err.status = 401; err.code = 'TOKEN_MISSING';
      throw err;
    }
    
    try {
      const payload = verifyRefresh(incomingToken); // throws on invalid/expired
      if (payload.sub !== userId) {
        const err: any = new Error('token user mismatch');
        err.status = 401; err.code = 'TOKEN_USER_MISMATCH';
        throw err;
      }
      
      // Get user for updated token
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        const err: any = new Error('user not found');
        err.status = 404; err.code = 'USER_NOT_FOUND';
        throw err;
      }
      
      const newRefreshToken = signRefresh({ sub: userId });
      const accessToken = signAccess({ sub: userId, userType: user.userType });
      
      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      const err: any = new Error('invalid refresh token');
      err.status = 401; err.code = 'TOKEN_INVALID';
      throw err;
    }
  }

  static async logout(userId: string, incomingToken?: string) {
    // For now, just return success since we're not storing refresh tokens in DB
    // In the future, you might want to implement a blacklist or token revocation system
    return { ok: true };
  }
  
  static async registerOrganizer(organizerData: any) {
    const { email, password, firstName, lastName, company, phone, taxNumber, taxOffice, address, bankAccount, avatar } = organizerData;
    
    const exists = await prisma.organizer.findUnique({ where: { email } }) || await prisma.user.findUnique({ where: { email } });
    if (exists) {
      const err: any = new Error('email already in use');
      err.status = 409; err.code = 'EMAIL_TAKEN';
      throw err;
    }
    // Ensure phone is not used by any organizer or user
    const organizerPhoneExists = await prisma.organizer.findFirst({ where: { phone } });
    if (organizerPhoneExists) {
      const err: any = new Error('phone already in use');
      err.status = 409; err.code = 'PHONE_TAKEN';
      throw err;
    }
    const passwordHash = await hashPassword(password);
    const organizer = await prisma.organizer.create({
      data: {
        email,
        password: passwordHash,
        firstName,
        lastName,
        company,
        phone,
        taxNumber,
        taxOffice,
        address,
        bankAccount,
        avatar,
        phoneVerified: false,
        approved: false, // Requires admin approval
        devices: []
      }
    });
    
    const accessToken = signAccess({ sub: organizer.id, userType: 'ORGANIZER' });
    const refreshToken = signRefresh({ sub: organizer.id });
    
    return { organizer, tokens: { accessToken, refreshToken } };
  }
  
  static async loginOrganizer(email: string, password: string) {
    const organizer = await prisma.organizer.findUnique({ where: { email } });
    if (!organizer || !(await verifyPassword(password, organizer.password))) {
      const err: any = new Error('invalid credentials');
      err.status = 401; err.code = 'CREDENTIALS_INVALID';
      throw err;
    }
    
    if (!organizer.approved) {
      const err: any = new Error('organizer account not approved');
      err.status = 403; err.code = 'ACCOUNT_NOT_APPROVED';
      throw err;
    }
    
    // Update last login
    await prisma.organizer.update({
      where: { id: organizer.id },
      data: { lastLogin: new Date() }
    });
    
    const accessToken = signAccess({ sub: organizer.id, userType: 'ORGANIZER' });
    const refreshToken = signRefresh({ sub: organizer.id });
    
    return { organizer, tokens: { accessToken, refreshToken } };
  }
  
  static async updateUser(userId: string, updateData: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err: any = new Error('user not found');
      err.status = 404; err.code = 'USER_NOT_FOUND';
      throw err;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    
    return updatedUser;
  }
  
  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        birthYear: true,
        phone: true,
        phoneVerified: true,
        avatar: true,
        city: true,
        userType: true,
        adminRole: true,
        points: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user) {
      const err: any = new Error('user not found');
      err.status = 404; err.code = 'USER_NOT_FOUND';
      throw err;
    }
    
    return user;
  }
}