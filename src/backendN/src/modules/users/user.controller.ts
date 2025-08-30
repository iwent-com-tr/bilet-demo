import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { FollowService } from './follow.service';
import { UpdateProfileDTO, UpdateUserDTO } from '../auth/auth.dto'; 
import { z } from 'zod';
import { PhoneVerificationService } from './phone-verification.service';
import { 
  SendVerificationCodeDTO, 
  VerifyCodeDTO, 
  UpdatePhoneNumberDTO,
  maskPhoneNumber 
} from './verification.dto';

// Additional DTOs for user operations
const SearchUsersDTO = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  city: z.string().optional()
});

const AdminUserUpdateDTO = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  userType: z.enum(['USER', 'ADMIN']).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  avatar: z.string().optional(),
  phoneVerified: z.boolean().optional(),
  points: z.number().int().min(0).optional()
});

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10), 1), 100);
    const q = (req.query.q as string) || undefined;
    const result = await UserService.list({ page, limit, q });
    
    // Sanitize user data in the response
    const sanitizedResult = {
      ...result,
      data: result.data.map(sanitizeUser)
    };
    
    res.json(sanitizedResult);
  } catch (e) { next(e); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try { 
    const user = await UserService.findById(req.params.id);
    res.json({ user: sanitizeUser(user) });
  } catch (e) { next(e); }
};

export const getByIdWithRelationship = async (req: Request, res: Response, next: NextFunction) => {
  try { 
    const currentUserId = (req as any).user?.id;
    const user = await UserService.findByIdWithRelationship(req.params.id, currentUserId);
    res.json({ user: sanitizeUser(user) });
  } catch (e) { next(e); }
};

export const me = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await UserService.findById(req.user.id);
    res.json({ user: sanitizeUser(user) });
  } catch (e) { next(e); }
};

export const updateMe = async (req: any, res: Response, next: NextFunction) => {
  try {
    const input = UpdateProfileDTO.parse(req.body);
    const updatedUser = await UserService.updateSelf(req.user.id, input);
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (e) { next(e); }
};

export const adminUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = AdminUserUpdateDTO.parse(req.body);
    const updatedUser = await UserService.adminUpdate(req.params.id, input);
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (e) { next(e); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { 
    await UserService.softDelete(req.params.id); 
    res.status(204).send(); 
  } catch (e) { next(e); }
};

export const getUserStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await UserService.getUserStats(req.params.id);
    res.json(result);
  } catch (e) { next(e); }
};

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit, city } = SearchUsersDTO.parse(req.query);
    const currentUserId = (req as any).user?.id;
    const users = await UserService.searchUsers({
      q,
      limit,
      city,
      excludeId: currentUserId
    });
    
    const sanitizedUsers = users.map((user: any) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      city: user.city,
      points: user.points
    }));
    
    res.json({ users: sanitizedUsers });
  } catch (e) { next(e); }
};

// Sanitization function for user data
const sanitizeUser = (user: any): any => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  userType: user.userType,
  avatar: user.avatar,
  city: user.city,
  phone: user.phone,
  phoneVerified: user.phoneVerified,
  birthYear: user.birthYear,
  points: user.points,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// For backward compatibility
export const sanitize = sanitizeUser;

// ===== PHONE VERIFICATION CONTROLLERS =====

/**
 * Send verification code to user's phone
 */
export const sendVerificationCode = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber } = SendVerificationCodeDTO.parse(req.body);
    const userId = req.user.id;

    const result = await PhoneVerificationService.sendVerificationCode(userId, phoneNumber);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        maskedPhone: maskPhoneNumber(phoneNumber)
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (e) { 
    next(e); 
  }
};

/**
 * Verify the code sent to user's phone
 */
export const verifyPhoneCode = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber, code } = VerifyCodeDTO.parse(req.body);
    const userId = req.user.id;

    const result = await PhoneVerificationService.verifyCode(userId, phoneNumber, code);
    
    if (result.success) {
      // Get updated user data
      const user = await UserService.findById(userId);
      
      res.status(200).json({
        success: true,
        message: result.message,
        user: sanitizeUser(user)
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (e) { 
    next(e); 
  }
};

/**
 * Get phone verification status for current user
 */
export const getVerificationStatus = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const status = await PhoneVerificationService.getVerificationStatus(userId);
    
    // Mask phone number for security
    const response = {
      ...status,
      phoneNumber: status.phoneNumber ? maskPhoneNumber(status.phoneNumber) : undefined
    };
    
    res.json(response);
  } catch (e) { 
    next(e); 
  }
};

/**
 * Resend verification code
 */
export const resendVerificationCode = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const result = await PhoneVerificationService.resendVerificationCode(userId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (e) { 
    next(e); 
  }
};

/**
 * Get only points for current user
 */
export const getMyPoints = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id as string;
    const points = await UserService.getPoints(userId);
    res.json({ points });
  } catch (e) { next(e); }
};

/**
 * Update phone number (requires re-verification)
 */
export const updatePhoneNumber = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { phoneNumber } = UpdatePhoneNumberDTO.parse(req.body);
    const userId = req.user.id;

    // Cancel any existing verification for old number
    const user = await UserService.findById(userId);
    if (user.phone) {
      await PhoneVerificationService.cancelVerification(userId, user.phone);
    }

    // Send verification code to new number
    const result = await PhoneVerificationService.sendVerificationCode(userId, phoneNumber);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        maskedPhone: maskPhoneNumber(phoneNumber),
        requiresVerification: true
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (e) { 
    next(e); 
  }
};

// ===== FAVORITES CONTROLLERS =====
const FavoriteDTO = z.object({ eventId: z.string().uuid() });

export const addFavorite = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { eventId } = FavoriteDTO.parse(req.body);
    const userId = req.user.id;
    const fav = await UserService.addFavorite(userId, eventId);
    res.status(201).json({ favorite: fav });
  } catch (e) { next(e); }
};

export const removeFavorite = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { eventId } = FavoriteDTO.parse(req.params);
    const userId = req.user.id;
    await UserService.removeFavorite(userId, eventId);
    res.status(204).send();
  } catch (e) { next(e); }
};

export const listFavorites = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const events = await UserService.listFavorites(userId);
    res.json({ events });
  } catch (e) { next(e); }
};

// Follow/Unfollow Artists
export const followArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { artistId } = req.params;
    const result = await FollowService.followArtist(userId, artistId);
    res.status(201).json({ success: true, favorite: result });
  } catch (e) { next(e); }
};

export const unfollowArtist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { artistId } = req.params;
    await FollowService.unfollowArtist(userId, artistId);
    res.status(204).send();
  } catch (e) { next(e); }
};

// Follow/Unfollow Venues
export const followVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { venueId } = req.params;
    const result = await FollowService.followVenue(userId, venueId);
    res.status(201).json({ success: true, favorite: result });
  } catch (e) { next(e); }
};

export const unfollowVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { venueId } = req.params;
    await FollowService.unfollowVenue(userId, venueId);
    res.status(204).send();
  } catch (e) { next(e); }
};

// Follow/Unfollow Organizers
export const followOrganizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { organizerId } = req.params;
    const result = await FollowService.followOrganizer(userId, organizerId);
    res.status(201).json({ success: true, favorite: result });
  } catch (e) { next(e); }
};

export const unfollowOrganizer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { organizerId } = req.params;
    await FollowService.unfollowOrganizer(userId, organizerId);
    res.status(204).send();
  } catch (e) { next(e); }
};

// Get user's following lists
export const getFollowing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const following = await FollowService.getUserFollowing(userId);
    res.json(following);
  } catch (e) { next(e); }
};

// Check follow status
export const checkFollowStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    const { entityType, entityId } = req.params;
    
    if (!userId) {
      return res.json({ isFollowing: false });
    }

    if (!['artist', 'venue', 'organizer'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const result = await FollowService.checkFollowStatus(
      userId, 
      entityType as 'artist' | 'venue' | 'organizer', 
      entityId
    );
    res.json(result);
  } catch (e) { next(e); }
};