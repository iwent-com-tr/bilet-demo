import { prisma } from '../../lib/prisma';

export async function resolveIsAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return !!user && user.userType === 'ADMIN';
}

export async function resolveIsOrganizer(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const organizer = await prisma.organizer.findUnique({ where: { id: userId } });
  return !!organizer;
}