import { prisma } from '../../lib/prisma';
import { generateQrPngDataUrl, dataUrlToBase64 } from '../../lib/qr';
import { sendEmail } from '../../lib/email';
import { joinUserToEventRoom } from '../../chat';
import type { ListTicketsQuery, CreateTicketInput, UpdateTicketStatusInput, VerifyTicketInput } from './ticket.dto';

function generateReferenceCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  for (let i = 0; i < 8; i++) ref += alphabet[Math.floor(Math.random() * alphabet.length)];
  return ref;
}

export class TicketService {
  static async list(filters: ListTicketsQuery) {
    const { page, limit, userId, eventId, status } = filters;
    const where: any = {};
    if (userId) where.userId = userId;
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    const [total, data] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { page, limit, total, data };
  }

  static async getById(id: string) {
    const t = await prisma.ticket.findUnique({ where: { id } });
    if (!t) { const e: any = new Error('ticket not found'); e.status = 404; e.code = 'NOT_FOUND'; throw e; }
    return t;
  }

  static async createAndSend(params: CreateTicketInput & { purchaserUserId: string }) {
    const userId = params.userId ?? params.purchaserUserId;
    const [event, user] = await Promise.all([
      prisma.event.findUnique({ where: { id: params.eventId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!event) { const e: any = new Error('event not found'); e.status = 404; e.code = 'EVENT_NOT_FOUND'; throw e; }
    if (!user) { const e: any = new Error('user not found'); e.status = 404; e.code = 'USER_NOT_FOUND'; throw e; }

    // Generate QR
    const referenceCode = generateReferenceCode();
    const qrPayload = JSON.stringify({ t: 'ticket', id: referenceCode, e: params.eventId, u: userId });
    const qrDataUrl = await generateQrPngDataUrl(qrPayload);
    const { base64, mime } = dataUrlToBase64(qrDataUrl);

    const ticket = await prisma.ticket.create({
      data: {
        eventId: params.eventId,
        userId,
        ticketType: params.ticketType,
        price: params.price,
        qrCode: referenceCode,
        referenceCode,
      },
    });

    const subject = `Biletiniz: ${event.name}`;
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111;">
        <p>Merhaba ${user.firstName},</p>
        <p><strong>${event.name}</strong> etkinliği için biletiniz oluşturuldu.</p>
        <p>Tarih: ${new Date(event.startDate).toLocaleString()}</p>
        <p>Yer: ${event.venue}, ${event.city}</p>
        <p>Referans Kodu: <strong>${referenceCode}</strong></p>
        <p style=\"margin-top:16px;\">Girişte aşağıdaki QR kodunu gösteriniz:</p>
        <div style=\"margin: 12px 0;\">
          <img src=\"cid:ticket-qrcode\" alt=\"Bilet QR Kodu\" style=\"display:block;width:220px;height:220px;\"/>
        </div>
        <p>İyi eğlenceler!</p>
      </div>
    `;
    try {
      await sendEmail({
        to: user.email,
        subject,
        html,
        attachments: [
          { filename: `ticket-${referenceCode}.png`, type: mime, content: base64, disposition: 'inline', content_id: 'ticket-qrcode' },
        ],
      });
    } catch (err) {
      console.warn('ticket email send failed:', (err as any)?.message || err);
    }

    // Realtime: auto-join purchaser to event room
    try { await joinUserToEventRoom(userId, params.eventId); } catch {}

    return ticket;
  }

  static async updateStatus(id: string, input: UpdateTicketStatusInput) {
    return prisma.ticket.update({ where: { id }, data: { status: input.status } });
  }

  static async verify(id: string, input: VerifyTicketInput) {
    const ticket = await this.getById(id);
    const isValid = ticket.referenceCode === input.code && ticket.status === 'ACTIVE';
    if (ticket.status === 'USED') {
      const e: any = new Error('ticket already used');
      e.status = 400; e.code = 'TICKET_ALREADY_USED';
      throw e;
    }
    if (!isValid) {
      const e: any = new Error('invalid ticket');
      e.status = 400; e.code = 'TICKET_INVALID';
      throw e;
    }
    const updated = await prisma.ticket.update({
      where: { id },
      data: { status: 'USED', entryTime: new Date(), deviceId: input.deviceId, gate: input.gate },
    });
    return updated;
  }

  static async countUserAttendedEvents(userId: string) {
    const rows = await prisma.ticket.findMany({
      where: { userId, status: { in: ['USED', 'ACTIVE'] } },
      select: { eventId: true },
      distinct: ['eventId']
    });
    return rows.length;
  }

  static async getMyTickets(userId: string) {
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            startDate: true,
            endDate: true,
            venue: true,
            city: true,
            banner: true,
            category: true
          }
        }
      }
    });
    return tickets;
  }
}


