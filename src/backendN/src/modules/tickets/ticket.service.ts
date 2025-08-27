import { prisma } from '../../lib/prisma';
import { generateQrPngDataUrl, dataUrlToBase64 } from '../../lib/qr';
import { sendEmail } from '../../lib/email';
import { joinUserToEventRoom } from '../../chat';
import { oneSignalService } from '../push-notification/onesignal.service';
import type { ListTicketsQuery, CreateTicketInput, UpdateTicketStatusInput, VerifyTicketInput } from './ticket.dto';

export function generateReferenceCode(): string {
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

    // Add ticket holder tags for push notifications
    try {
      await this.addTicketHolderTags(userId, params.eventId, params.ticketType, referenceCode);
    } catch (error) {
      console.warn('Failed to add ticket holder tags:', error);
    }

    return ticket;
  }

  static async updateStatus(id: string, input: UpdateTicketStatusInput) {
    const ticket = await prisma.ticket.update({ where: { id }, data: { status: input.status } });
    
    // Handle tag removal for cancelled tickets
    if (input.status === 'CANCELLED' && ticket.userId) {
      try {
        await this.removeTicketHolderTags(ticket.userId, ticket.eventId);
      } catch (error) {
        console.warn('Failed to remove ticket holder tags on cancellation:', error);
      }
    }
    
    return ticket;
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

  static async createAndSendUnregistered(params: { eventId: string; ticketType: string; participantEmail: string; purchaserUserId: string; price: number }) {
    // Get event information
    const event = await prisma.event.findUnique({ 
      where: { id: params.eventId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        venue: true,
        city: true,
        address: true
      }
    });
    
    if (!event) { 
      const e: any = new Error('event not found'); 
      e.status = 404; 
      e.code = 'EVENT_NOT_FOUND'; 
      throw e; 
    }

    // Generate QR code for reference and create a database record
    const referenceCode = generateReferenceCode();
    const qrPayload = JSON.stringify({ 
      t: 'ticket', 
      id: referenceCode, 
      e: params.eventId, 
      email: params.participantEmail,
      purchaser: params.purchaserUserId
    });
    const qrDataUrl = await generateQrPngDataUrl(qrPayload);
    const { base64, mime } = dataUrlToBase64(qrDataUrl);

    // Create ticket record for tracking (linked to purchaser for now)
    const ticket = await prisma.ticket.create({
      data: {
        eventId: params.eventId,
        userId: params.purchaserUserId, // Link to purchaser for tracking
        ticketType: params.ticketType,
        price: params.price.toString(),
        qrCode: referenceCode,
        referenceCode,
      },
    });

    // Send email to participant
    const subject = `Biletiniz: ${event.name}`;
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🎫 Bilet Bilgileri</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">${event.name}</h3>
          <p><strong>Bilet Türü:</strong> ${params.ticketType}</p>
          <p><strong>Tarih:</strong> ${new Date(event.startDate).toLocaleDateString('tr-TR')}</p>
          <p><strong>Saat:</strong> ${new Date(event.startDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Konum:</strong> ${event.venue || event.city || 'Belirtilmemiş'}</p>
          ${event.address ? `<p><strong>Adres:</strong> ${event.address}</p>` : ''}
        </div>
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #1976d2;">
            <strong>Önemli:</strong> Bu bilet sizin için satın alındı. Etkinlik gününde organizatör tarafından doğrulanacaktır.
          </p>
        </div>
        <p>Referans Kodu: <strong>${referenceCode}</strong></p>
        <p style="margin-top:16px;">Girişte aşağıdaki QR kodunu gösteriniz:</p>
        <div style="margin: 12px 0;">
          <img src="cid:ticket-qrcode" alt="Bilet QR Kodu" style="display:block;width:220px;height:220px;"/>
        </div>
        <p style="color: #666; font-size: 14px;">
          Herhangi bir sorunuz için organizatör ile iletişime geçiniz.
        </p>
        <p>İyi eğlenceler!</p>
      </div>
    `;

    const textContent = `
Bilet Bilgileri

${event.name}
Bilet Türü: ${params.ticketType}
Tarih: ${new Date(event.startDate).toLocaleDateString('tr-TR')}
Saat: ${new Date(event.startDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
Konum: ${event.venue || event.city || 'Belirtilmemiş'}
${event.address ? `Adres: ${event.address}` : ''}

Referans Kodu: ${referenceCode}

Önemli: Bu bilet sizin için satın alındı. Etkinlik gününde organizatör tarafından doğrulanacaktır.

Herhangi bir sorunuz için organizatör ile iletişime geçiniz.
    `;

    try {
      await sendEmail({
        to: params.participantEmail,
        subject,
        html,
        text: textContent,
        attachments: [
          { 
            filename: `ticket-${referenceCode}.png`, 
            type: mime, 
            content: base64, 
            disposition: 'inline', 
            content_id: 'ticket-qrcode' 
          },
        ],
      });
    } catch (err) {
      console.warn('ticket email send failed:', (err as any)?.message || err);
      throw new Error('Email gönderimi başarısız oldu');
    }

    return {
      ticket,
      referenceCode,
      participantEmail: params.participantEmail,
      eventId: params.eventId,
      ticketType: params.ticketType,
      sent: true
    };
  }

  /**
   * Add ticket holder tags for push notification segmentation
   */
  static async addTicketHolderTags(userId: string, eventId: string, ticketType: string, referenceCode: string) {
    try {
      // Get user's push subscriptions
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          subscribed: true
        }
      });

      if (subscriptions.length === 0) {
        console.log(`No active push subscriptions found for user ${userId}`);
        return;
      }

      // Get event details for better tagging
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          name: true,
          category: true,
          startDate: true,
          city: true
        }
      });

      if (!event) {
        console.warn(`Event ${eventId} not found for tagging`);
        return;
      }

      // Create comprehensive tags for segmentation
      const tags = {
        ticket_holder: 'true',
        event_id: eventId,
        ticket_type: ticketType.toLowerCase().replace(/\s+/g, '_'),
        event_category: event.category.toLowerCase(),
        event_city: event.city.toLowerCase(),
        ticket_reference: referenceCode,
        purchase_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        event_month: event.startDate.toISOString().slice(0, 7), // YYYY-MM
        // Additional useful segments
        has_ticket: 'true',
        customer_type: 'ticket_buyer'
      };

      // Update tags for all user's devices
      const updatePromises = subscriptions.map(subscription =>
        oneSignalService.updatePlayerTags(subscription.onesignalUserId, tags)
      );

      await Promise.all(updatePromises);

      console.log(`Successfully added ticket holder tags for user ${userId}, event ${eventId}`);
    } catch (error) {
      console.error('Failed to add ticket holder tags:', error);
      throw error;
    }
  }

  /**
   * Remove ticket holder tags when ticket is cancelled
   */
  static async removeTicketHolderTags(userId: string, eventId: string) {
    try {
      // Get user's push subscriptions
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          userId,
          subscribed: true
        }
      });

      if (subscriptions.length === 0) {
        return;
      }

      // Check if user has other active tickets for this event
      const remainingTickets = await prisma.ticket.count({
        where: {
          userId,
          eventId,
          status: { in: ['ACTIVE', 'USED'] }
        }
      });

      // Only remove event-specific tags if no other tickets remain
      if (remainingTickets === 0) {
        const tagsToRemove = [
          'ticket_holder',
          'event_id',
          'ticket_type',
          'ticket_reference'
        ];

        // Remove tags from all user's devices
        const removePromises = subscriptions.map(subscription =>
          oneSignalService.deletePlayerTags(subscription.onesignalUserId, tagsToRemove)
        );

        await Promise.all(removePromises);

        console.log(`Removed ticket holder tags for user ${userId}, event ${eventId}`);
      }
    } catch (error) {
      console.error('Failed to remove ticket holder tags:', error);
    }
  }
}


