import { v4 as uuidv4 } from 'uuid';

export enum MessageSenderType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface TicketMessageProps {
  id?: string;
  ticketId: string;
  senderType: MessageSenderType;
  senderId?: string | null;
  message: string;
  attachments?: Attachment[];
  createdAt?: Date;
}

export interface CreateTicketMessageProps {
  ticketId: string;
  senderType: MessageSenderType;
  senderId?: string | null;
  message: string;
  attachments?: Attachment[];
}

export class TicketMessage {
  readonly id: string;
  readonly ticketId: string;
  readonly senderType: MessageSenderType;
  readonly senderId: string | null;
  readonly message: string;
  readonly attachments: Attachment[];
  readonly createdAt: Date;

  private constructor(props: TicketMessageProps) {
    this.id = props.id || uuidv4();
    this.ticketId = props.ticketId;
    this.senderType = props.senderType;
    this.senderId = props.senderId ?? null;
    this.message = props.message;
    this.attachments = props.attachments ?? [];
    this.createdAt = props.createdAt ?? new Date();
  }

  get isFromUser(): boolean {
    return this.senderType === MessageSenderType.USER;
  }

  get isFromAgent(): boolean {
    return this.senderType === MessageSenderType.AGENT;
  }

  get isSystemMessage(): boolean {
    return this.senderType === MessageSenderType.SYSTEM;
  }

  get hasAttachments(): boolean {
    return this.attachments.length > 0;
  }

  static create(props: CreateTicketMessageProps): TicketMessage {
    return new TicketMessage(props);
  }

  static createSystemMessage(
    ticketId: string,
    message: string,
  ): TicketMessage {
    return new TicketMessage({
      ticketId,
      senderType: MessageSenderType.SYSTEM,
      senderId: null,
      message,
    });
  }

  static reconstitute(props: TicketMessageProps): TicketMessage {
    return new TicketMessage(props);
  }
}
