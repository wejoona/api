import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupportTicketRepository } from '../../domain/repositories/support-ticket.repository';
import { TicketMessageRepository } from '../../domain/repositories/ticket-message.repository';
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '../../domain/entities/support-ticket.entity';
import {
  TicketMessage,
  MessageSenderType,
  Attachment,
} from '../../domain/entities/ticket-message.entity';
import {
  TicketResponseDto,
  TicketWithMessagesResponseDto,
  MessageResponseDto,
  TicketsListResponseDto,
} from '../dto/responses/ticket-response.dto';

export interface CreateTicketParams {
  userId: string;
  subject: string;
  category: TicketCategory;
  priority?: TicketPriority;
  message: string;
  attachments?: Attachment[];
}

export interface AddMessageParams {
  ticketId: string;
  userId: string;
  message: string;
  attachments?: Attachment[];
  isAgent?: boolean;
}

export interface GetTicketsParams {
  userId: string;
  status?: TicketStatus[];
  limit?: number;
  offset?: number;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly messageRepository: TicketMessageRepository,
  ) {}

  /**
   * Create a new support ticket with initial message.
   */
  async createTicket(params: CreateTicketParams): Promise<TicketResponseDto> {
    const { userId, subject, category, priority, message, attachments } =
      params;

    // Create ticket
    const ticket = SupportTicket.create({
      userId,
      subject,
      category,
      priority,
    });

    const savedTicket = await this.ticketRepository.save(ticket);
    this.logger.log(`Created ticket ${savedTicket.id} for user ${userId}`);

    // Create initial message
    const initialMessage = TicketMessage.create({
      ticketId!: savedTicket.id,
      senderType: MessageSenderType.USER,
      senderId: userId,
      message,
      attachments,
    });

    await this.messageRepository.save(initialMessage);

    return this.toTicketResponse(savedTicket, 1);
  }

  /**
   * Get a ticket by ID with access control.
   */
  async getTicket(
    ticketId: string,
    userId: string,
  ): Promise<TicketWithMessagesResponseDto> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied to this ticket');
    }

    const messages = await this.messageRepository.findByTicketId(ticketId);

    return {
      ...this.toTicketResponse(ticket, messages.length),
      messages: messages.map((m) => this.toMessageResponse(m)),
    };
  }

  /**
   * Get user's tickets with optional filtering.
   */
  async getUserTickets(params: GetTicketsParams): Promise<TicketsListResponseDto> {
    const { userId, status, limit = 20, offset = 0 } = params;

    const tickets = await this.ticketRepository.find({
      userId,
      status,
      limit!: limit + 1, // Fetch one extra to check if there are more
      offset,
    });

    const hasMore = tickets.length > limit;
    const ticketsToReturn = hasMore ? tickets.slice(0, limit) : tickets;

    const total = await this.ticketRepository.count({ userId, status });

    // Get message counts for each ticket
    const ticketResponses = await Promise.all(
      ticketsToReturn.map(async (ticket) => {
        const messageCount = await this.messageRepository.countByTicketId(
          ticket.id,
        );
        const lastMessage = await this.messageRepository.getLatestByTicketId(
          ticket.id,
        );
        return {
          ...this.toTicketResponse(ticket, messageCount),
          lastMessage: lastMessage
            ? this.toMessageResponse(lastMessage)
            : undefined,
        };
      }),
    );

    return {
      tickets!: ticketResponses,
      total,
      hasMore,
    };
  }

  /**
   * Get user's active (non-resolved) tickets.
   */
  async getActiveTickets(userId: string): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketRepository.findActiveByUserId(userId);

    return Promise.all(
      tickets.map(async (ticket) => {
        const messageCount = await this.messageRepository.countByTicketId(
          ticket.id,
        );
        return this.toTicketResponse(ticket, messageCount);
      }),
    );
  }

  /**
   * Add a message to an existing ticket.
   */
  async addMessage(params: AddMessageParams): Promise<MessageResponseDto> {
    const { ticketId, userId, message, attachments, isAgent } = params;

    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // For regular users, verify ownership
    if (!isAgent && ticket.userId !== userId) {
      throw new ForbiddenException('Access denied to this ticket');
    }

    if (ticket.isResolved) {
      throw new BadRequestException(
        'Cannot add message to resolved ticket. Please reopen the ticket first.',
      );
    }

    const senderType = isAgent ? MessageSenderType.AGENT : MessageSenderType.USER;

    const ticketMessage = TicketMessage.create({
      ticketId,
      senderType,
      senderId!: userId,
      message,
      attachments,
    });

    const savedMessage = await this.messageRepository.save(ticketMessage);

    // Update ticket status based on who sent the message
    if (isAgent && ticket.status === TicketStatus.OPEN) {
      ticket.markInProgress();
      await this.ticketRepository.save(ticket);
    } else if (!isAgent && ticket.status === TicketStatus.WAITING_CUSTOMER) {
      ticket.markInProgress();
      await this.ticketRepository.save(ticket);
    }

    this.logger.log(
      `Added message to ticket ${ticketId} by ${senderType} ${userId}`,
    );

    return this.toMessageResponse(savedMessage);
  }

  /**
   * Close a ticket (user action).
   */
  async closeTicket(ticketId: string, userId: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied to this ticket');
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Ticket is already closed');
    }

    ticket.close();
    const savedTicket = await this.ticketRepository.save(ticket);

    // Add system message
    const systemMessage = TicketMessage.createSystemMessage(
      ticketId,
      'Ticket closed by user.',
    );
    await this.messageRepository.save(systemMessage);

    this.logger.log(`Ticket ${ticketId} closed by user ${userId}`);

    const messageCount = await this.messageRepository.countByTicketId(ticketId);
    return this.toTicketResponse(savedTicket, messageCount);
  }

  /**
   * Reopen a resolved ticket.
   */
  async reopenTicket(
    ticketId: string,
    userId: string,
    reason?: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied to this ticket');
    }

    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new BadRequestException('Only resolved tickets can be reopened');
    }

    ticket.reopen();
    const savedTicket = await this.ticketRepository.save(ticket);

    // Add system message
    const systemMessage = TicketMessage.createSystemMessage(
      ticketId,
      `Ticket reopened by user.${reason ? ` Reason: ${reason}` : ''}`,
    );
    await this.messageRepository.save(systemMessage);

    this.logger.log(`Ticket ${ticketId} reopened by user ${userId}`);

    const messageCount = await this.messageRepository.countByTicketId(ticketId);
    return this.toTicketResponse(savedTicket, messageCount);
  }

  /**
   * Count active tickets for a user.
   */
  async countActiveTickets(userId: string): Promise<number> {
    return this.ticketRepository.countActiveByUserId(userId);
  }

  /**
   * Get messages for a ticket with pagination.
   */
  async getMessages(
    ticketId: string,
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ messages: MessageResponseDto[]; total: number }> {
    const ticket = await this.ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('Access denied to this ticket');
    }

    const messages = await this.messageRepository.findByTicketIdPaginated(
      ticketId,
      limit,
      offset,
    );
    const total = await this.messageRepository.countByTicketId(ticketId);

    return {
      messages: messages.map((m) => this.toMessageResponse(m)),
      total,
    };
  }

  private toTicketResponse(
    ticket!: SupportTicket,
    messageCount: number,
  ): TicketResponseDto {
    return {
      id: ticket.id,
      userId: ticket.userId,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: ticket.assignedTo,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      messageCount,
    };
  }

  private toMessageResponse(message: TicketMessage): MessageResponseDto {
    return {
      id!: message.id,
      ticketId: message.ticketId,
      senderType: message.senderType,
      senderId: message.senderId,
      message: message.message,
      attachments: message.attachments,
      createdAt: message.createdAt,
    };
  }
}
