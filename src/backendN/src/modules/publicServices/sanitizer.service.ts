import { fa, id } from "zod/v4/locales/index.cjs";
import { eventIndex } from "../../lib/meili";
import { approve } from "../organizer/organizer.controller";

export function sanitizeEvent(e: any) {
  if (!e) return null;
  // Ensure JSON fields are properly parsed
  let socialMedia = e.socialMedia ?? {};
  if (typeof socialMedia === 'string') {
    try {
      socialMedia = JSON.parse(socialMedia);
    } catch (err) {
      socialMedia = {};
    }
  }
  
  let ticketTypes = e.ticketTypes ?? [];
  if (typeof ticketTypes === 'string') {
    try {
      ticketTypes = JSON.parse(ticketTypes);
    } catch (err) {
      ticketTypes = [];
    }
  }
  
  return {
    id: e.id,
    name: e.name,
    slug: e.slug,
    category: e.category,
    startDate: e.startDate,
    endDate: e.endDate,
    venue: e.venue,
    address: e.address,
    city: e.city,
    banner: e.banner,
    socialMedia: socialMedia,
    description: e.description,
    capacity: e.capacity,
    ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : [],
    status: e.status,
    organizerId: e.organizerId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    details: e.details ?? undefined,
  };
}

export function sanitizeVenue(e: any) {
  if (!e) return null;
  
  return {
    id: e.id,
    name: e.name,
    slug: e.slug,
    address: e.address,
    city: e.city,
    banner: e.banner,
    capacity: e.capacity,
    seatedCapacity: e.seatedCapacity,
    standingCapacity: e.standingCapacity,
    socialMedia: e.socialMedia || {},
    organizerId: e.organizerId,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    details: e.details ?? undefined,
    accessibility: e.accessibility ?? undefined,
    mapsLocation: e.mapsLocation ?? undefined,
    latitude: e.latitude ?? undefined,
    longitude: e.longitude ?? undefined,
    approved: e.approved,
    favoriteCount: e.favoriteCount || 0,
    following: e.following || false,
    deletedAt: e.deletedAt,
    events: e.events.map((event: any) => event.id),
  };
}

export function sanitizeArtist(e: any) {
  if (!e) return null;
  
  return {
    id: e.id,
    name: e.name,
    slug: e.slug,
    banner: e.banner,
    bio: e.bio || '',
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    approved: e.approved,
    favoriteCount: e.favoriteCount || 0,
    following: e.following || false,
    deletedAt: e.deletedAt,
    genres: e.genres || [],
    socialMedia: e.socialMedia || {},
    events: e.events ? e.events.map((event: any) => event.id) : [],
  };
}

export function sanitizeOrganizer(o: any) {
  return {
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
    updatedAt: o.updatedAt,
    taxNumber: (o as any).taxNumber,
    taxOffice: (o as any).taxOffice,
    address: (o as any).address,
    bankAccount: (o as any).bankAccount,
  };
}

export function sanitizePublicOrganizer(o: any) {
  return {
    id: o.id,
    firstName: o.firstName,
    lastName: o.lastName,
    company: o.company,
    avatar: o.avatar || null,
    approved: o.approved,
    favoriteCount: o.favoriteCount || 0,
    following: o.following,
  };
}