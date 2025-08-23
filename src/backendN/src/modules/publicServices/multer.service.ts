import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { NextFunction, Request, Response } from 'express';
import { resolveIsAdmin, resolveIsOrganizer } from './resolveRoles.service';

const BANNERS_DIR = path.join(process.cwd(), 'uploads', 'banners');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDir(BANNERS_DIR);
    cb(null, BANNERS_DIR);
  },
  filename: (req, file, cb) => {
    const eventId = (req.params as any)?.id || 'event';
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${eventId}-${Date.now()}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('unsupported file type'));
  }
  cb(null, true);
}

export const uploadBanner = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export function resolveBannerPublicUrl(filename: string): string {
  // Served from /uploads
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') || '';
  const urlPath = `/uploads/banners/${filename}`;
  return `${base}${urlPath}`;
}

export async function uploadBannerResponse(req: Request, res: Response, next: NextFunction) {
  try {
    const requesterId = (req as any).user?.id as string | undefined;
    const isAdmin = await resolveIsAdmin(requesterId);
    const isOrganizer = await resolveIsOrganizer(requesterId);

    if (!isAdmin && !isOrganizer) {
      return res.status(403).json({ error: 'forbidden', code: 'FORBIDDEN' });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'no file provided', code: 'FILE_REQUIRED' });
    }

    const bannerUrl = resolveBannerPublicUrl(file.filename);
    res.json({ bannerUrl });
  } catch (e) { next(e); }
}

