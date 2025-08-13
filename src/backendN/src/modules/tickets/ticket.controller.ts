import { Request, Response, NextFunction } from 'express';
import { CreateTicketDTO, ListTicketsQueryDTO, UpdateTicketStatusDTO, VerifyTicketDTO, SendTicketDTO } from './ticket.dto';
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

export const getMyAttendedCount = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const count = await TicketService.countUserAttendedEvents(userId);
    res.json({ count });
  } catch (e) { next(e); }
};

export const getMyTickets = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const tickets = await TicketService.getMyTickets(userId);
    res.json({ tickets });
  } catch (e) { next(e); }
};

export async function sendTicketUnregistered(req: Request, res: Response, next: NextFunction) {
  try {
    const input = SendTicketDTO.parse(req.body);  
    const purchaserUserId = (req as any).user?.id as string;
    
    // Send ticket to unregistered participant via email only
    const result = await TicketService.createAndSendUnregistered({
      eventId: input.eventId,
      ticketType: input.ticketType,
      participantEmail: input.participantEmail,
      purchaserUserId,
      price: input.price
    });
    
    res.status(200).json({ 
      message: `Bilet bilgileri ${input.participantEmail} adresine başarıyla gönderildi`,
      success: true,
      ticket: result.ticket,
      referenceCode: result.referenceCode
    });
  } catch (e) { next(e); }
}


