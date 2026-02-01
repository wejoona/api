import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../../domain/entities/support-ticket.entity';

export class TicketResponseDto {
  id: string;
  userId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  messageCount?: number;
  lastMessage?: MessageResponseDto;
}

export class MessageResponseDto {
  id: string;
  ticketId: string;
  senderType: string;
  senderId: string | null;
  message: string;
  attachments: AttachmentResponseDto[];
  createdAt: Date;
}

export class AttachmentResponseDto {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export class TicketWithMessagesResponseDto extends TicketResponseDto {
  messages: MessageResponseDto[];
}

export class TicketsListResponseDto {
  tickets: TicketResponseDto[];
  total: number;
  hasMore: boolean;
}
