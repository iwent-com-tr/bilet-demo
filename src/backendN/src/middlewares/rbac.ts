import { Request, Response, NextFunction } from 'express';

type Role = 'USER' | 'ADMIN' | 'ORGANIZER';

function isSelfAccess(req: Request): boolean {
  const userId = (req as any).user?.id as string | undefined;
  const paramId = (req.params?.id as string | undefined) || (req.query?.id as string | undefined);
  return Boolean(userId && paramId && userId === paramId);
}

export function rbac(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { id: string; role?: Role } | undefined;
    if (!user) {
      return res.status(401).json({ error: 'unauthorized', code: 'UNAUTHORIZED' });
    }

    // Self-access shortcut: allow when the route targets the same user id
    if (isSelfAccess(req)) return next();

    if (allowedRoles.length === 0) return next();

    const role = user.role ?? 'USER';
    if (allowedRoles.includes(role)) return next();

    return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
  };
}


