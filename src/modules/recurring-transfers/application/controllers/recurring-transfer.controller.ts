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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { RecurringTransferService } from '../services/recurring-transfer.service';
import { CreateRecurringTransferDto } from '../dto/create-recurring-transfer.dto';
import { UpdateRecurringTransferDto } from '../dto/update-recurring-transfer.dto';

interface UserPayload {
  id: string;
  phone: string;
  walletId?: string;
}

@Controller('recurring-transfers')
@UseGuards(JwtAuthGuard)
export class RecurringTransferController {
  constructor(
    private readonly recurringTransferService: RecurringTransferService,
  ) {}

  @Get()
  async getAll(@CurrentUser() user: UserPayload) {
    const walletId = user.walletId;
    if (!walletId) {
      return { transfers: [] };
    }

    const transfers =
      await this.recurringTransferService.getRecurringTransfers(walletId);
    return { transfers };
  }

  @Get('upcoming')
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
    return { upcoming };
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    const transfer = await this.recurringTransferService.getRecurringTransfer(
      walletId,
      id,
    );

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

  @Post()
  async create(
    @Body() dto: CreateRecurringTransferDto,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

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

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringTransferDto,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

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

  @Post(':id/pause')
  async pause(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
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
  async resume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
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
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    await this.recurringTransferService.cancelRecurringTransfer(walletId, id);
    return { success: true };
  }

  @Get(':id/history')
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    const history = await this.recurringTransferService.getExecutionHistory(
      walletId,
      id,
    );
    return { history };
  }

  @Get(':id/next-dates')
  async getNextDates(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserPayload,
    @Query('count', new ParseIntPipe({ optional: true })) count?: number,
  ) {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    const dates = await this.recurringTransferService.getNextExecutionDates(
      walletId,
      id,
      count || 3,
    );
    return { dates };
  }
}
