import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { PinVerificationGuard } from '../../../../common/guards/pin-verification.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { RecurringTransferService } from '../services/recurring-transfer.service';
import { CreateRecurringTransferDto } from '../dto/create-recurring-transfer.dto';
import { UpdateRecurringTransferDto } from '../dto/update-recurring-transfer.dto';

interface UserPayload {
  id: string;
  phone: string;
  walletId?: string;
}

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
@ApiTags('Recurring Transfers')
@Controller('recurring-transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecurringTransferController {
  private mapTransfer(transfer: any) {
    return {
      id: transfer.id,
      walletId: transfer.walletId,
      recipientPhone: transfer.recipientPhone,
      recipientName: transfer.recipientName,
      amount: transfer.amount,
      currency: transfer.currency,
      frequency: transfer.frequency,
      startDate: transfer.startDate,
      endDate: transfer.endDate,
      nextExecutionDate: transfer.nextExecutionDate,
      occurrencesTotal: transfer.occurrencesTotal,
      occurrencesRemaining: transfer.occurrencesRemaining,
      status: transfer.status,
      note: transfer.note,
      dayOfWeek: transfer.dayOfWeek,
      dayOfMonth: transfer.dayOfMonth,
      executedCount: transfer.executedCount,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
    };
  }

  constructor(
    private readonly recurringTransferService: RecurringTransferService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all recurring transfers' })
  async getAll(@CurrentUser() user: UserPayload) {
    const walletId = user.walletId;
    if (!walletId) {
      return { transfers: [] };
    }

    const transfers =
      await this.recurringTransferService.getRecurringTransfers(walletId);
    return { transfers, data: transfers };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled executions' })
  async getUpcoming(
    @CurrentUser() user: UserPayload,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      return { upcoming: [] };
    }

    const upcoming = await this.recurringTransferService.getUpcomingExecutions(
      walletId,
      limit || 10,
    );
    return { upcoming, data: upcoming };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recurring transfer details' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) throw new BadRequestException('User has no wallet');
    const transfer = await this.recurringTransferService.getRecurringTransfer(
      walletId,
      id,
    );
    return this.mapTransfer(transfer);
  }

  @Post()
  @UseGuards(PinVerificationGuard)
  @ApiOperation({ summary: 'Create a recurring transfer (requires PIN)' })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Recurring transfer created' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({
    status: 403,
    description: 'PIN verification required or expired',
  })
  async create(
    @Body() dto: CreateRecurringTransferDto,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) throw new BadRequestException('User has no wallet');
    const transfer =
      await this.recurringTransferService.createRecurringTransfer({
        walletId,
        recipientPhone: dto.recipientPhone,
        recipientName: dto.recipientName,
        amount: dto.amount,
        currency: dto.currency || 'XOF',
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        occurrences: dto.occurrences,
        note: dto.note,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
      });
    return this.mapTransfer(transfer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recurring transfer' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringTransferDto,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) throw new BadRequestException('User has no wallet');
    const transfer =
      await this.recurringTransferService.updateRecurringTransfer(
        walletId,
        id,
        {
          amount: dto.amount,
          frequency: dto.frequency,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          note: dto.note,
          dayOfWeek: dto.dayOfWeek,
          dayOfMonth: dto.dayOfMonth,
        },
      );
    return this.mapTransfer(transfer);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a recurring transfer' })
  async pause(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
    }

    const transfer = await this.recurringTransferService.pauseRecurringTransfer(
      walletId,
      id,
    );

    return {
      id: transfer.id,
      status: transfer.status,
      updatedAt: transfer.updatedAt,
    };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused recurring transfer' })
  async resume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
    }

    const transfer =
      await this.recurringTransferService.resumeRecurringTransfer(walletId, id);

    return {
      id: transfer.id,
      status: transfer.status,
      updatedAt: transfer.updatedAt,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a recurring transfer' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
    }

    await this.recurringTransferService.cancelRecurringTransfer(walletId, id);
    return { success: true };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get execution history for a recurring transfer' })
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
    }

    const history = await this.recurringTransferService.getExecutionHistory(
      walletId,
      id,
    );
    return { history, data: history };
  }

  @Get(':id/next-dates')
  @ApiOperation({ summary: 'Preview next execution dates' })
  async getNextDates(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Query('count', new ParseIntPipe({ optional: true })) count?: number,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
    }

    const dates = await this.recurringTransferService.getNextExecutionDates(
      walletId,
      id,
      count || 3,
    );
    return { dates, data: dates };
  }
}
