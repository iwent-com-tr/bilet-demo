/**
 * Unified Authentication Service
 * Handles authentication for both Users and Organizers with proper role management
 */

import { prisma } from './prisma';
import { verifyAccess } from './jwt';

export type AuthenticatedEntity = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  type: 'USER' | 'ORGANIZER';
  userType?: 'USER' | 'ADMIN'; // Only for users
  adminRole?: 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY'; // Only for users
  avatar?: string;
  deletedAt?: Date | null;
};

export type AuthenticationResult = {
  entity: AuthenticatedEntity;
  role: 'USER' | 'ADMIN' | 'ORGANIZER';
  permissions: string[];
};

/**
 * Unified authentication that works for both Users and Organizers
 */
export class UnifiedAuthService {
  
  /**
   * Authenticate a user/organizer by JWT token
   */
  static async authenticateByToken(token: string): Promise<AuthenticationResult | null> {
    try {
      const payload = verifyAccess(token);
      const userId = payload.sub;
      
      if (!userId) {
        return null;
      }

      // Try to find as User first
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          userType: true,
          adminRole: true,
          avatar: true,
          deletedAt: true
        }
      });

      if (user && !user.deletedAt) {
        const entity: AuthenticatedEntity = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          type: 'USER',
          userType: user.userType as 'USER' | 'ADMIN',
          adminRole: user.adminRole as 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY',
          avatar: user.avatar || undefined,
          deletedAt: user.deletedAt
        };

        const role = user.userType === 'ADMIN' ? 'ADMIN' : 'USER';
        const permissions = this.getUserPermissions(user.userType as string, user.adminRole as string);

        return {
          entity,
          role: role as 'USER' | 'ADMIN' | 'ORGANIZER',
          permissions
        };
      }

      // Try to find as Organizer
      const organizer = await prisma.organizer.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          deletedAt: true
        }
      });

      if (organizer && !organizer.deletedAt) {
        const entity: AuthenticatedEntity = {
          id: organizer.id,
          email: organizer.email,
          firstName: organizer.firstName,
          lastName: organizer.lastName,
          type: 'ORGANIZER',
          avatar: organizer.avatar || undefined,
          deletedAt: organizer.deletedAt
        };

        const permissions = this.getOrganizerPermissions();

        return {
          entity,
          role: 'ORGANIZER',
          permissions
        };
      }

      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  /**
   * Get permissions for a user based on their type and admin role
   */
  private static getUserPermissions(userType: string, adminRole: string): string[] {
    const permissions: string[] = ['user:read', 'user:update_self'];

    if (userType === 'ADMIN') {
      permissions.push(
        'admin:read',
        'admin:write',
        'user:read_all',
        'user:update_all',
        'event:read_all',
        'organizer:read_all'
      );

      // Additional permissions based on admin role
      switch (adminRole) {
        case 'ADMIN':
          permissions.push(
            'admin:full_access',
            'user:delete',
            'event:delete',
            'organizer:delete',
            'system:manage'
          );
          break;
        case 'SUPPORT':
          permissions.push(
            'user:support',
            'event:support',
            'organizer:support'
          );
          break;
        case 'READONLY':
          // Read-only permissions already included above
          break;
      }
    }

    return permissions;
  }

  /**
   * Get permissions for an organizer
   */
  private static getOrganizerPermissions(): string[] {
    return [
      'organizer:read',
      'organizer:update_self',
      'event:create',
      'event:read_own',
      'event:update_own',
      'event:delete_own',
      'ticket:read_own_events',
      'chat:moderate_own_events',
      'venue:create',
      'artist:create'
    ];
  }

  /**
   * Check if an entity has a specific permission
   */
  static hasPermission(authResult: AuthenticationResult, permission: string): boolean {
    return authResult.permissions.includes(permission);
  }

  /**
   * Check if an entity can access a specific resource
   */
  static canAccessResource(
    authResult: AuthenticationResult, 
    resourceType: string, 
    resourceOwnerId?: string
  ): boolean {
    const { entity, role, permissions } = authResult;

    // Admins can access everything
    if (role === 'ADMIN' && permissions.includes('admin:full_access')) {
      return true;
    }

    // Users can access their own resources
    if (role === 'USER' && resourceOwnerId === entity.id) {
      return true;
    }

    // Organizers can access their own resources
    if (role === 'ORGANIZER' && resourceOwnerId === entity.id) {
      return true;
    }

    // Check specific permissions
    const readAllPermission = `${resourceType}:read_all`;
    if (permissions.includes(readAllPermission)) {
      return true;
    }

    return false;
  }

  /**
   * Create a standardized request user object for Express
   */
  static createRequestUser(authResult: AuthenticationResult) {
    return {
      id: authResult.entity.id,
      email: authResult.entity.email,
      name: `${authResult.entity.firstName} ${authResult.entity.lastName}`,
      role: authResult.role,
      adminRole: authResult.entity.adminRole || 'USER',
      avatarUrl: authResult.entity.avatar,
      type: authResult.entity.type,
      permissions: authResult.permissions
    };
  }

  /**
   * Get the chat role for socket authentication
   */
  static getChatRole(authResult: AuthenticationResult): 'USER' | 'ADMIN' | 'ORGANIZER' {
    return authResult.role;
  }

  /**
   * Check if entity is admin
   */
  static isAdmin(authResult: AuthenticationResult): boolean {
    return authResult.role === 'ADMIN';
  }

  /**
   * Check if entity is organizer
   */
  static isOrganizer(authResult: AuthenticationResult): boolean {
    return authResult.role === 'ORGANIZER';
  }

  /**
   * Check if entity is user
   */
  static isUser(authResult: AuthenticationResult): boolean {
    return authResult.role === 'USER';
  }
}

export default UnifiedAuthService;