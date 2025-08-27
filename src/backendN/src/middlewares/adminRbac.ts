import { Request, Response, NextFunction } from 'express';

type AdminRole = 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY';

export function adminRbac(...allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { id: string; adminRole?: AdminRole } | undefined;
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', code: 'UNAUTHORIZED' });
    }

    if (allowedRoles.length === 0) return next();

    const role = user.adminRole ?? 'USER';
    if (allowedRoles.includes(role)) return next();

    return res.status(403).json({ 
      error: 'forbidden', 
      code: 'FORBIDDEN', 
      userRole: role, 
      requiredRoles: allowedRoles,
      message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${role}` 
    });
  };
}
