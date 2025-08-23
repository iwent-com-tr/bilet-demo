import { prisma } from "../../lib/prisma";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function generateUniqueEventSlug(base: string): Promise<string> {
  const initial = slugify(base);
  const existing = await prisma.event.findMany({
    where: { slug: { startsWith: initial } },
    select: { slug: true },
  });
  if (existing.length === 0) return initial;
  const taken = new Set(existing.map((e: { slug: string }) => e.slug));
  let i = 1;
  while (taken.has(`${initial}-${i}`)) i += 1;
  return `${initial}-${i}`;
}

export async function generateUniqueArtistSlug(base: string): Promise<string> {
  const initial = slugify(base);
  const existing = await prisma.artist.findMany({
    where: { slug: { startsWith: initial } },
    select: { slug: true },
  });
  if (existing.length === 0) return initial;
  const taken = new Set(existing.map((e: { slug: string }) => e.slug));
  let i = 1;
  while (taken.has(`${initial}-${i}`)) i += 1;
  return `${initial}-${i}`;
}

export async function generateUniqueVenueSlug(base: string): Promise<string> {
  const initial = slugify(base);
  const existing = await prisma.venue.findMany({
    where: { slug: { startsWith: initial } },
    select: { slug: true },
  });
  if (existing.length === 0) return initial;
  const taken = new Set(existing.map((e: { slug: string }) => e.slug));
  let i = 1;
  while (taken.has(`${initial}-${i}`)) i += 1;
  return `${initial}-${i}`;
}