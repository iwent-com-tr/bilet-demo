import { prisma } from '../../lib/prisma';
import { UnifiedAuthService } from '../../lib/unified-auth.service';

export async function resolveIsAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;
  
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { userType: true, deletedAt: true }
  });
  
  return !!user && !user.deletedAt && user.userType === 'ADMIN';
}

export async function resolveIsOrganizer(userId?: string): Promise<boolean> {
  if (!userId) return false;
  
  const organizer = await prisma.organizer.findUnique({ 
    where: { id: userId },
    select: { id: true, deletedAt: true }
  });
  
  return !!organizer && !organizer.deletedAt;
}

/**
 * Enhanced role resolution using unified authentication
 */
export async function resolveUserRole(userId?: string): Promise<{
  isUser: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  role: 'USER' | 'ADMIN' | 'ORGANIZER' | null;
}> {
  if (!userId) {
    return {
      isUser: false,
      isAdmin: false,
      isOrganizer: false,
      role: null
    };
  }

  const isAdmin = await resolveIsAdmin(userId);
  if (isAdmin) {
    return {
      isUser: true,
      isAdmin: true,
      isOrganizer: false,
      role: 'ADMIN'
    };
  }

  const isOrganizer = await resolveIsOrganizer(userId);
  if (isOrganizer) {
    return {
      isUser: false,
      isAdmin: false,
      isOrganizer: true,
      role: 'ORGANIZER'
    };
  }

  // Check if it's a regular user
  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { userType: true, deletedAt: true }
  });
  
  if (user && !user.deletedAt && user.userType === 'USER') {
    return {
      isUser: true,
      isAdmin: false,
      isOrganizer: false,
      role: 'USER'
    };
  }

  return {
    isUser: false,
    isAdmin: false,
    isOrganizer: false,
    role: null
  };
}