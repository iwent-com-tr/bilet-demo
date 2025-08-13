import { Request, Response, NextFunction } from 'express';
import { CreateTicketDTO, ListTicketsQueryDTO, UpdateTicketStatusDTO, VerifyTicketDTO } from './ticket.dto';
import { TicketService } from './ticket.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = ListTicketsQueryDTO.parse(req.query);
    const result = await TicketService.list(query);
    res.json(result);
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = CreateTicketDTO.parse(req.body);
    const purchaserUserId = (req as any).user?.id as string;
    const ticket = await TicketService.createAndSend({ ...input, purchaserUserId });
    res.status(201).json({ ticket });
  } catch (e) { next(e); }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const ticket = await TicketService.getById(req.params.id);
    res.json({ ticket });
  } catch (e) { next(e); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const input = UpdateTicketStatusDTO.parse(req.body);
    const ticket = await TicketService.updateStatus(req.params.id, input);
    res.json({ ticket });
  } catch (e) { next(e); }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const input = VerifyTicketDTO.parse(req.body);
    const ticket = await TicketService.verify(req.params.id, input);
    res.json({ ticket, verified: true });
  } catch (e) { next(e); }
}

export async function getMyAttendedCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id as string;
    const count = await TicketService.countUserAttendedEvents(userId);
    res.json({ attendedCount: count });
  } catch (e) { next(e); }
}


