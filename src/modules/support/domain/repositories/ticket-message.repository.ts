import {
  TicketMessage,
  MessageSenderType,
} from '../entities/ticket-message.entity';

export interface FindMessagesOptions {
  ticketId: string;
  senderType?: MessageSenderType;
  limit?: number;
  offset?: number;
}

export abstract class TicketMessageRepository {
  abstract findById(id: string): Promise<TicketMessage | null>;

  abstract findByTicketId(ticketId: string): Promise<TicketMessage[]>;

  abstract findByTicketIdPaginated(
    ticketId: string,
    limit: number,
    offset: number,
  ): Promise<TicketMessage[]>;

  abstract save(message: TicketMessage): Promise<TicketMessage>;

  abstract countByTicketId(ticketId: string): Promise<number>;

  abstract getLatestByTicketId(ticketId: string): Promise<TicketMessage | null>;

  abstract findFirstBySenderType(
    ticketId: string,
    senderType: MessageSenderType,
  ): Promise<TicketMessage | null>;
}
