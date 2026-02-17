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

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
@ApiTags('Support')
@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Create a new support ticket.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created', type: TicketResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid ticket data' })
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
  @ApiOperation({ summary: 'List user support tickets' })
  @ApiQuery({ name: 'status', required: false, description: 'Comma-separated status filter' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated ticket list' })
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
  @ApiOperation({ summary: 'Get active (open) tickets' })
  @ApiResponse({ status: 200, description: 'Active tickets list' })
  async getActiveTickets(
    @CurrentUser() user: UserPayload,
  ): Promise<TicketResponseDto[]> {
    return this.supportService.getActiveTickets(user.id);
  }

  /**
   * Get count of active tickets.
   */
  @Get('count')
  @ApiOperation({ summary: 'Get count of active tickets' })
  @ApiResponse({ status: 200, description: 'Active ticket count' })
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
  @ApiOperation({ summary: 'Get ticket with messages' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket with messages' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
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
  @ApiOperation({ summary: 'Get ticket messages (paginated)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Paginated message list' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
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
  @ApiOperation({ summary: 'Add a message to a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 201, description: 'Message added' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
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
  @ApiOperation({ summary: 'Close a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket closed' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
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
  @ApiOperation({ summary: 'Reopen a resolved ticket' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket reopened' })
  @ApiResponse({ status: 400, description: 'Ticket is not in a closable state' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async reopenTicket(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: UserPayload,
  ): Promise<TicketResponseDto> {
    return this.supportService.reopenTicket(ticketId, user.id, body.reason);
  }
}
