import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '../entities/support-ticket.entity';

export interface FindTicketsOptions {
  userId?: string;
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export abstract class SupportTicketRepository {
  abstract findById(id: string): Promise<SupportTicket | null>;

  abstract findByUserId(userId: string): Promise<SupportTicket[]>;

  abstract findActiveByUserId(userId: string): Promise<SupportTicket[]>;

  abstract find(options: FindTicketsOptions): Promise<SupportTicket[]>;

  abstract count(options: FindTicketsOptions): Promise<number>;

  abstract save(ticket: SupportTicket): Promise<SupportTicket>;

  abstract findOpenTickets(limit?: number): Promise<SupportTicket[]>;

  abstract findAssignedTo(agentId: string): Promise<SupportTicket[]>;

  abstract countByStatus(status: TicketStatus): Promise<number>;

  abstract countActiveByUserId(userId: string): Promise<number>;
}
