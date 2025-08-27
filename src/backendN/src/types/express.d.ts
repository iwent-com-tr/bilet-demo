// Type definitions for Express Request extensions
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email?: string;
      name?: string;
      role?: 'USER' | 'ADMIN' | 'ORGANIZER';
      adminRole?: 'ADMIN' | 'SUPPORT' | 'READONLY' | 'USER';
      avatarUrl?: string;
    };
  }
}