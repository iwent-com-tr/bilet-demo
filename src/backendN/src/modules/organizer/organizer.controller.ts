import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrganizerService } from './organizer.service';
import { PhoneVerificationService } from '../users/phone-verification.service';
import {
  ListOrganizersQueryDTO,
  AdminCreateOrganizerDTO,
  OrganizerAdminUpdateDTO,
  OrganizerSelfUpdateDTO,
  ApproveDTO,
  OrganizerEventsQueryDTO,
} from './organizer.dto';

import { sanitizeOrganizer, sanitizePublicOrganizer } from '../publicServices/sanitizer.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, q } = ListOrganizersQueryDTO.parse(req.query);
    const result = await OrganizerService.list({ page, limit, q });
    res.json({ ...result, data: result.data.map(sanitizeOrganizer) });
  } catch (e) { next(e); }
}

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, q } = ListOrganizersQueryDTO.parse(req.query);
    const result = await OrganizerService.listPublic({ page, limit, q });
    res.json({ ...result, data: result.data.map(sanitizePublicOrganizer) });
  } catch (e) { next(e); }
}

export async function adminCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const input = AdminCreateOrganizerDTO.parse(req.body);
    const organizer = await OrganizerService.adminCreate(input);
    res.status(201).json({ organizer: sanitizeOrganizer(organizer) });
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const organizer = await OrganizerService.findById(req.params.id);
    res.json({ organizer: sanitizeOrganizer(organizer) });
  } catch (e) { next(e); }
}

export async function getPublicById(req: Request, res: Response, next: NextFunction) {
  try {
    const organizer = await OrganizerService.findById(req.params.id);
    // Return only safe public information
    const publicInfo = {
      id: organizer.id,
      company: organizer.company,
      approved: organizer.approved,
      avatar: organizer.avatar
    };
    res.json(publicInfo);
  } catch (e) { next(e); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const isAdmin = ((req as any).user?.role === 'ADMIN');
    if (isAdmin) {
      const input = OrganizerAdminUpdateDTO.parse(req.body);
      const organizer = await OrganizerService.adminUpdate(req.params.id, input);
      return res.json({ organizer: sanitizeOrganizer(organizer) });
    }
    const input = OrganizerSelfUpdateDTO.parse(req.body);
    const organizer = await OrganizerService.selfUpdate(req.params.id, input);
    res.json({ organizer: sanitizeOrganizer(organizer) });
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await OrganizerService.softDelete(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const { approved } = ApproveDTO.parse(req.body);
    const organizer = await OrganizerService.setApproval(req.params.id, approved);
    res.json({ organizer: sanitizeOrganizer(organizer) });
  } catch (e) { next(e); }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const input = OrganizerSelfUpdateDTO.parse(req.body);
    const organizer = await OrganizerService.selfUpdate(req.params.id, input);
    res.json({ organizer: sanitizeOrganizer(organizer) });
  } catch (e) { next(e); }
}

// ===== PHONE VERIFICATION (Organizer) =====
const SendCodeDTO = z.object({ phoneNumber: z.string().min(6) });
const VerifyCodeDTO = z.object({ phoneNumber: z.string().min(6), code: z.string().min(3) });

export async function sendVerificationCode(req: any, res: Response, next: NextFunction) {
  try {
    const { phoneNumber } = SendCodeDTO.parse(req.body);
    const organizerId = req.user.id;
    const result = await PhoneVerificationService.sendVerificationCodeForOrganizer(organizerId, phoneNumber);
    if (result.success) return res.json(result);
    return res.status(400).json(result);
  } catch (e) { next(e); }
}

export async function verifyPhoneCode(req: any, res: Response, next: NextFunction) {
  try {
    const { phoneNumber, code } = VerifyCodeDTO.parse(req.body);
    const organizerId = req.user.id;
    const result = await PhoneVerificationService.verifyCodeForOrganizer(organizerId, phoneNumber, code);
    if (result.success) return res.json(result);
    return res.status(400).json(result);
  } catch (e) { next(e); }
}

export async function getVerificationStatus(req: any, res: Response, next: NextFunction) {
  try {
    const organizerId = req.user.id;
    const status = await PhoneVerificationService.getVerificationStatusForOrganizer(organizerId);
    res.json(status);
  } catch (e) { next(e); }
}

export async function resendVerificationCode(req: any, res: Response, next: NextFunction) {
  try {
    const organizerId = req.user.id;
    const result = await PhoneVerificationService.resendVerificationCodeForOrganizer(organizerId);
    if (result.success) return res.json(result);
    return res.status(400).json(result);
  } catch (e) { next(e); }
}

// ===== EVENT REPORT GENERATION =====
export async function generateEventReport(req: any, res: Response, next: NextFunction) {
  try {
    const organizerId = req.user.id;
    const eventId = req.params.eventId;
    
    if (!eventId) {
      return res.status(400).json({ 
        error: 'event id required', 
        code: 'EVENT_ID_REQUIRED' 
      });
    }

    const { workbook, fileName } = await OrganizerService.generateEventReport(organizerId, eventId);

    // Set response headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Stream the Excel file to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { 
    console.error('Excel report generation error:', e);
    next(e); 
  }
}

// ===== ORGANIZER EVENTS LISTING =====
export async function getOrganizerEvents(req: any, res: Response, next: NextFunction) {
  try {
    const organizerId = req.params.organizerId;
    const requesterId = req.user?.id;
    
    // Check if the requester is the same organizer or an admin
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.userType === 'ADMIN';
    if (!isAdmin && requesterId !== organizerId) {
      return res.status(403).json({ 
        error: 'forbidden', 
        code: 'FORBIDDEN',
        message: 'You can only access your own events' 
      });
    }
    
    const query = OrganizerEventsQueryDTO.parse(req.query);
    const result = await OrganizerService.getOrganizerEvents(organizerId, query);
    
    // Sanitize events data
    const sanitizedEvents = result.data.map(event => ({
      id: event.id,
      name: event.name,
      slug: event.slug,
      category: event.category,
      startDate: event.startDate,
      endDate: event.endDate,
      venue: event.venue,
      address: event.address,
      city: event.city,
      banner: event.banner,
      description: event.description,
      status: event.status,
      organizerId: event.organizerId,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));
    
    res.json({
      page: result.page,
      limit: result.limit,
      total: result.total,
      data: sanitizedEvents
    });
  } catch (e) { 
    next(e); 
  }
}