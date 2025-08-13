import { z } from 'zod';

export const TicketStatuses = ['ACTIVE', 'USED', 'CANCELLED'] as const;
export type TicketStatus = typeof TicketStatuses[number];

export const ListTicketsQueryDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  status: z.enum(TicketStatuses).optional(),
});

export const CreateTicketDTO = z.object({
  eventId: z.string().uuid({ message: 'eventId geçerli bir UUID olmalıdır.' }),
  userId: z.string().uuid({ message: 'userId geçerli bir UUID olmalıdır.' }).optional(),
  ticketType: z.string().min(1, { message: 'ticketType zorunludur.' }),
  price: z.number().positive({ message: 'price pozitif olmalıdır.' }),
});

export const UpdateTicketStatusDTO = z.object({
  status: z.enum(TicketStatuses),
});

export const VerifyTicketDTO = z.object({
  code: z.string().min(4),
  deviceId: z.string().optional(),
  gate: z.string().optional(),
});

export type ListTicketsQuery = z.infer<typeof ListTicketsQueryDTO>;
export type CreateTicketInput = z.infer<typeof CreateTicketDTO>;
export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusDTO>;
export type VerifyTicketInput = z.infer<typeof VerifyTicketDTO>;


