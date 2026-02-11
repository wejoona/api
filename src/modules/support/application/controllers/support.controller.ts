import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { SupportService } from '../services/support.service';
import { CreateTicketDto, AddMessageDto } from '../dto/requests';
import {
  TicketResponseDto,
  TicketWithMessagesResponseDto,
  MessageResponseDto,
  TicketsListResponseDto,
} from '../dto/responses';
import { TicketStatus } from '../../domain/entities/support-ticket.entity';

interface UserPayload {
  id: string;
  phone: string;
}

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Support')
@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Create a new support ticket.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: UserPayload,
  ): Promise<TicketResponseDto> {
    return this.supportService.createTicket({
      userId: user.id,
      subject: dto.subject,
      category: dto.category,
      priority: dto.priority,
      message: dto.message,
    });
  }

  /**
   * Get all tickets for the current user.
   */
  @Get()
  async getTickets(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<TicketsListResponseDto> {
    const statusArray = status
      ? (status.split(',') as TicketStatus[])
      : undefined;

    return this.supportService.getUserTickets({
      userId: user.id,
      status: statusArray,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * Get active (non-resolved) tickets for the current user.
   */
  @Get('active')
  async getActiveTickets(
    @CurrentUser() user: UserPayload,
  ): Promise<TicketResponseDto[]> {
    return this.supportService.getActiveTickets(user.id);
  }

  /**
   * Get count of active tickets.
   */
  @Get('count')
  async getActiveTicketCount(
    @CurrentUser() user: UserPayload,
  ): Promise<{ count: number }> {
    const count = await this.supportService.countActiveTickets(user.id);
    return { count };
  }

  /**
   * Get a specific ticket with all messages.
   */
  @Get(':id')
  async getTicket(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<TicketWithMessagesResponseDto> {
    return this.supportService.getTicket(ticketId, user.id);
  }

  /**
   * Get messages for a ticket with pagination.
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: UserPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ messages: MessageResponseDto[]; total: number }> {
    return this.supportService.getMessages(
      ticketId,
      user.id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /**
   * Add a message to a ticket.
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() dto: AddMessageDto,
    @CurrentUser() user: UserPayload,
  ): Promise<MessageResponseDto> {
    return this.supportService.addMessage({
      ticketId,
      userId: user.id,
      message: dto.message,
      attachments: dto.attachments,
    });
  }

  /**
   * Close a ticket.
   */
  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  async closeTicket(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<TicketResponseDto> {
    return this.supportService.closeTicket(ticketId, user.id);
  }

  /**
   * Reopen a resolved ticket.
   */
  @Patch(':id/reopen')
  @HttpCode(HttpStatus.OK)
  async reopenTicket(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: UserPayload,
  ): Promise<TicketResponseDto> {
    return this.supportService.reopenTicket(ticketId, user.id, body.reason);
  }
}
