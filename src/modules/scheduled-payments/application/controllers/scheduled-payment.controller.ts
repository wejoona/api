/**
 * Scheduled Payment Controller
 * API endpoints for scheduled/recurring payments
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ScheduledPaymentService } from '../services/scheduled-payment.service';
import { ScheduleFrequency } from '../../domain/interfaces/scheduled-payment.types';

class CreateScheduleDto {
  name: string;
  description?: string;
  recipientId: string;
  recipientType: 'internal' | 'external' | 'merchant';
  recipientName?: string;
  amount: number;
  currency: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

class UpdateScheduleDto {
  name?: string;
  description?: string;
  amount?: number;
  frequency?: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
  endDate?: string;
  maxOccurrences?: number;
}

@ApiTags('Scheduled Payments')
@ApiBearerAuth()
@Controller('scheduled-payments')
@UseGuards(JwtAuthGuard)
export class ScheduledPaymentController {
  constructor(private readonly service: ScheduledPaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a scheduled payment' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  async createSchedule(
    @CurrentUser() user: any,
    @Body() dto: CreateScheduleDto,
  ) {
    const schedule = await this.service.createSchedule({
      userId: user.id,
      name: dto.name,
      description: dto.description,
      recipientId: dto.recipientId,
      recipientType: dto.recipientType,
      recipientName: dto.recipientName,
      amount: dto.amount,
      currency: dto.currency,
      frequency: dto.frequency,
      dayOfWeek: dto.dayOfWeek,
      dayOfMonth: dto.dayOfMonth,
      time: dto.time,
      timezone: dto.timezone,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      maxOccurrences: dto.maxOccurrences,
    });

    return {
      success: true,
      data: schedule,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all scheduled payments' })
  @ApiResponse({ status: 200, description: 'Schedules retrieved' })
  async getSchedules(@CurrentUser() user: any) {
    const schedules = await this.service.getUserSchedules(user.id);
    return {
      success: true,
      data: schedules,
    };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming payments' })
  @ApiResponse({ status: 200, description: 'Upcoming payments retrieved' })
  async getUpcoming(
    @CurrentUser() user: any,
    @Query('days') days?: number,
  ) {
    const upcoming = await this.service.getUpcomingPayments(user.id, days || 7);
    return {
      success: true,
      data: upcoming,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule details' })
  @ApiResponse({ status: 200, description: 'Schedule retrieved' })
  async getSchedule(
    @CurrentUser() user: any,
    @Param('id') scheduleId: string,
  ) {
    const schedule = await this.service.getSchedule(scheduleId, user.id);
    return {
      success: true,
      data: schedule,
    };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateSchedule(
    @CurrentUser() user: any,
    @Param('id') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    const schedule = await this.service.updateSchedule(scheduleId, user.id, {
      name: dto.name,
      description: dto.description,
      amount: dto.amount,
      frequency: dto.frequency,
      dayOfWeek: dto.dayOfWeek,
      dayOfMonth: dto.dayOfMonth,
      time: dto.time,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      maxOccurrences: dto.maxOccurrences,
    });

    return {
      success: true,
      data: schedule,
    };
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause schedule' })
  @ApiResponse({ status: 200, description: 'Schedule paused' })
  async pauseSchedule(
    @CurrentUser() user: any,
    @Param('id') scheduleId: string,
  ) {
    const schedule = await this.service.pauseSchedule(scheduleId, user.id);
    return {
      success: true,
      data: schedule,
    };
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume schedule' })
  @ApiResponse({ status: 200, description: 'Schedule resumed' })
  async resumeSchedule(
    @CurrentUser() user: any,
    @Param('id') scheduleId: string,
  ) {
    const schedule = await this.service.resumeSchedule(scheduleId, user.id);
    return {
      success: true,
      data: schedule,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel schedule' })
  @ApiResponse({ status: 200, description: 'Schedule cancelled' })
  async cancelSchedule(
    @CurrentUser() user: any,
    @Param('id') scheduleId: string,
  ) {
    const schedule = await this.service.cancelSchedule(scheduleId, user.id);
    return {
      success: true,
      data: schedule,
    };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get execution history' })
  @ApiResponse({ status: 200, description: 'History retrieved' })
  async getHistory(
    @CurrentUser() user: any,
    @Param('id') scheduleId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.service.getExecutionHistory(
      scheduleId,
      user.id,
      { page: page || 1, limit: limit || 20 },
    );

    return {
      success: true,
      data: result.executions,
      meta: {
        total: result.total,
        page: page || 1,
        limit: limit || 20,
      },
    };
  }
}
