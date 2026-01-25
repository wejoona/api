/**
 * Scheduled Payment Service
 * Core service for managing scheduled/recurring payments
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  PaymentSchedule,
  PaymentExecution,
  CreateScheduleInput,
  ScheduleStatus,
  ExecutionStatus,
  ScheduleFrequency,
  ScheduleSummary,
  UpcomingPayment,
} from '../../domain/interfaces/scheduled-payment.types';
import { ScheduleRepository } from '../../infrastructure/repositories/schedule.repository';
import { ExecutionRepository } from '../../infrastructure/repositories/execution.repository';

// Frequency to milliseconds mapping
const FREQUENCY_MS: Record<ScheduleFrequency, number> = {
  once: 0,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  biweekly: 14 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class ScheduledPaymentService {
  private readonly logger = new Logger(ScheduledPaymentService.name);

  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly executionRepository: ExecutionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new payment schedule
   */
  async createSchedule(input: CreateScheduleInput): Promise<PaymentSchedule> {
    // Validate input
    if (input.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (input.startDate < new Date()) {
      throw new BadRequestException('Start date must be in the future');
    }

    if (input.endDate && input.endDate <= input.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate first execution time
    const nextExecutionAt = this.calculateNextExecution(
      input.startDate,
      input.frequency,
      input.time,
      input.timezone,
      input.dayOfWeek,
      input.dayOfMonth,
    );

    const schedule: PaymentSchedule = {
      id: uuidv4(),
      userId: input.userId,
      name: input.name,
      description: input.description,
      status: 'active',

      recipientId: input.recipientId,
      recipientType: input.recipientType,
      recipientName: input.recipientName,

      amount: input.amount,
      currency: input.currency,

      frequency: input.frequency,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      time: input.time,
      timezone: input.timezone,

      startDate: input.startDate,
      endDate: input.endDate,
      maxOccurrences: input.maxOccurrences,
      remainingOccurrences: input.maxOccurrences,

      totalExecuted: 0,
      nextExecutionAt,

      failureCount: 0,
      maxFailures: 3,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.scheduleRepository.create(schedule);

    // Emit event
    this.eventEmitter.emit('schedule.created', {
      scheduleId: schedule.id,
      userId: schedule.userId,
      recipientName: schedule.recipientName,
      amount: schedule.amount,
      currency: schedule.currency,
      frequency: schedule.frequency,
      nextExecutionAt: schedule.nextExecutionAt,
    });

    this.logger.log(`Created schedule ${schedule.id} for user ${input.userId}`);
    return schedule;
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string, userId: string): Promise<PaymentSchedule> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }
    if (schedule.userId !== userId) {
      throw new NotFoundException('Schedule not found');
    }
    return schedule;
  }

  /**
   * Get all schedules for a user
   */
  async getUserSchedules(userId: string): Promise<ScheduleSummary[]> {
    const schedules = await this.scheduleRepository.findByUserId(userId);
    return schedules.map(s => ({
      id: s.id,
      name: s.name,
      recipientName: s.recipientName || 'Unknown',
      amount: s.amount,
      currency: s.currency,
      frequency: s.frequency,
      status: s.status,
      nextExecutionAt: s.nextExecutionAt,
      totalExecuted: s.totalExecuted,
    }));
  }

  /**
   * Get upcoming payments for a user
   */
  async getUpcomingPayments(userId: string, days: number = 7): Promise<UpcomingPayment[]> {
    const schedules = await this.scheduleRepository.findByUserId(userId);
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const upcoming: UpcomingPayment[] = [];

    for (const schedule of schedules) {
      if (schedule.status !== 'active') continue;
      if (!schedule.nextExecutionAt) continue;
      if (schedule.nextExecutionAt > cutoff) continue;

      upcoming.push({
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        recipientName: schedule.recipientName || 'Unknown',
        amount: schedule.amount,
        currency: schedule.currency,
        scheduledAt: schedule.nextExecutionAt,
      });
    }

    return upcoming.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(scheduleId: string, userId: string): Promise<PaymentSchedule> {
    const schedule = await this.getSchedule(scheduleId, userId);

    if (schedule.status !== 'active') {
      throw new BadRequestException(`Cannot pause schedule in ${schedule.status} status`);
    }

    const updated = await this.scheduleRepository.update(scheduleId, {
      status: 'paused',
    });

    this.eventEmitter.emit('schedule.paused', {
      scheduleId,
      userId,
    });

    this.logger.log(`Paused schedule ${scheduleId}`);
    return updated;
  }

  /**
   * Resume a paused schedule
   */
  async resumeSchedule(scheduleId: string, userId: string): Promise<PaymentSchedule> {
    const schedule = await this.getSchedule(scheduleId, userId);

    if (schedule.status !== 'paused' && schedule.status !== 'failed') {
      throw new BadRequestException(`Cannot resume schedule in ${schedule.status} status`);
    }

    // Recalculate next execution
    const nextExecutionAt = this.calculateNextExecution(
      new Date(),
      schedule.frequency,
      schedule.time,
      schedule.timezone,
      schedule.dayOfWeek,
      schedule.dayOfMonth,
    );

    const updated = await this.scheduleRepository.update(scheduleId, {
      status: 'active',
      failureCount: 0, // Reset failure count
      nextExecutionAt,
    });

    this.eventEmitter.emit('schedule.resumed', {
      scheduleId,
      userId,
      nextExecutionAt,
    });

    this.logger.log(`Resumed schedule ${scheduleId}`);
    return updated;
  }

  /**
   * Cancel a schedule
   */
  async cancelSchedule(scheduleId: string, userId: string): Promise<PaymentSchedule> {
    const schedule = await this.getSchedule(scheduleId, userId);

    if (schedule.status === 'cancelled' || schedule.status === 'completed') {
      throw new BadRequestException(`Schedule is already ${schedule.status}`);
    }

    const updated = await this.scheduleRepository.update(scheduleId, {
      status: 'cancelled',
    });

    this.eventEmitter.emit('schedule.cancelled', {
      scheduleId,
      userId,
    });

    this.logger.log(`Cancelled schedule ${scheduleId}`);
    return updated;
  }

  /**
   * Update schedule details
   */
  async updateSchedule(
    scheduleId: string,
    userId: string,
    updates: Partial<CreateScheduleInput>,
  ): Promise<PaymentSchedule> {
    const schedule = await this.getSchedule(scheduleId, userId);

    if (schedule.status !== 'active' && schedule.status !== 'paused') {
      throw new BadRequestException(`Cannot update schedule in ${schedule.status} status`);
    }

    // Recalculate next execution if schedule timing changed
    let nextExecutionAt = schedule.nextExecutionAt;
    if (updates.time || updates.frequency || updates.dayOfWeek || updates.dayOfMonth) {
      nextExecutionAt = this.calculateNextExecution(
        schedule.nextExecutionAt || new Date(),
        updates.frequency || schedule.frequency,
        updates.time || schedule.time,
        updates.timezone || schedule.timezone,
        updates.dayOfWeek ?? schedule.dayOfWeek,
        updates.dayOfMonth ?? schedule.dayOfMonth,
      );
    }

    const updated = await this.scheduleRepository.update(scheduleId, {
      name: updates.name,
      description: updates.description,
      amount: updates.amount,
      frequency: updates.frequency,
      time: updates.time,
      dayOfWeek: updates.dayOfWeek,
      dayOfMonth: updates.dayOfMonth,
      endDate: updates.endDate,
      maxOccurrences: updates.maxOccurrences,
      nextExecutionAt,
    });

    this.logger.log(`Updated schedule ${scheduleId}`);
    return updated;
  }

  /**
   * Execute a scheduled payment (called by job processor)
   */
  async executeSchedule(scheduleId: string): Promise<PaymentExecution> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.status !== 'active') {
      throw new BadRequestException(`Cannot execute schedule in ${schedule.status} status`);
    }

    // Create execution record
    const execution: PaymentExecution = {
      id: uuidv4(),
      scheduleId,
      userId: schedule.userId,
      status: 'processing',
      amount: schedule.amount,
      currency: schedule.currency,
      recipientId: schedule.recipientId,
      scheduledAt: schedule.nextExecutionAt || new Date(),
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.executionRepository.create(execution);

    try {
      // TODO: Actually execute the payment via transfer service
      // const transactionId = await this.transferService.transfer({
      //   fromUserId: schedule.userId,
      //   toId: schedule.recipientId,
      //   amount: schedule.amount,
      //   currency: schedule.currency,
      // });

      // For now, simulate success
      const transactionId = `tx_${uuidv4()}`;

      // Update execution as completed
      await this.executionRepository.update(execution.id, {
        status: 'completed',
        transactionId,
        executedAt: new Date(),
        completedAt: new Date(),
      });

      // Update schedule
      const nextExecutionAt = this.calculateNextExecution(
        new Date(),
        schedule.frequency,
        schedule.time,
        schedule.timezone,
        schedule.dayOfWeek,
        schedule.dayOfMonth,
      );

      const shouldComplete = schedule.frequency === 'once' ||
        (schedule.maxOccurrences && schedule.totalExecuted + 1 >= schedule.maxOccurrences) ||
        (schedule.endDate && nextExecutionAt > schedule.endDate);

      await this.scheduleRepository.update(scheduleId, {
        status: shouldComplete ? 'completed' : 'active',
        totalExecuted: schedule.totalExecuted + 1,
        lastExecutedAt: new Date(),
        nextExecutionAt: shouldComplete ? undefined : nextExecutionAt,
        failureCount: 0,
        remainingOccurrences: schedule.remainingOccurrences
          ? schedule.remainingOccurrences - 1
          : undefined,
      });

      // Emit event
      this.eventEmitter.emit('scheduled.payment.executed', {
        executionId: execution.id,
        scheduleId,
        userId: schedule.userId,
        recipientName: schedule.recipientName,
        amount: schedule.amount,
        currency: schedule.currency,
        status: 'completed',
      });

      this.logger.log(`Executed schedule ${scheduleId}, transaction ${transactionId}`);
      return { ...execution, status: 'completed', transactionId };

    } catch (error: any) {
      // Update execution as failed
      await this.executionRepository.update(execution.id, {
        status: 'failed',
        failureReason: error.message,
        executedAt: new Date(),
      });

      // Update schedule failure count
      const newFailureCount = schedule.failureCount + 1;
      await this.scheduleRepository.update(scheduleId, {
        status: newFailureCount >= schedule.maxFailures ? 'failed' : 'active',
        failureCount: newFailureCount,
        lastFailureReason: error.message,
      });

      // Emit event
      this.eventEmitter.emit('scheduled.payment.executed', {
        executionId: execution.id,
        scheduleId,
        userId: schedule.userId,
        recipientName: schedule.recipientName,
        amount: schedule.amount,
        currency: schedule.currency,
        status: 'failed',
        failureReason: error.message,
      });

      this.logger.error(`Failed to execute schedule ${scheduleId}: ${error.message}`);
      return { ...execution, status: 'failed', failureReason: error.message };
    }
  }

  /**
   * Get execution history for a schedule
   */
  async getExecutionHistory(
    scheduleId: string,
    userId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ executions: PaymentExecution[]; total: number }> {
    await this.getSchedule(scheduleId, userId); // Verify ownership
    return this.executionRepository.findByScheduleId(scheduleId, options);
  }

  /**
   * Get schedules due for execution
   */
  async getDueSchedules(): Promise<PaymentSchedule[]> {
    return this.scheduleRepository.findDueForExecution();
  }

  // Private helpers

  private calculateNextExecution(
    fromDate: Date,
    frequency: ScheduleFrequency,
    time: string,
    timezone: string,
    dayOfWeek?: number,
    dayOfMonth?: number,
  ): Date {
    const [hours, minutes] = time.split(':').map(Number);
    let next = new Date(fromDate);

    // Set time
    next.setHours(hours, minutes, 0, 0);

    // If time has passed today, start from tomorrow
    if (next <= new Date()) {
      next.setDate(next.getDate() + 1);
    }

    switch (frequency) {
      case 'once':
        // Just use the calculated time
        break;

      case 'daily':
        // Already calculated above
        break;

      case 'weekly':
        if (dayOfWeek !== undefined) {
          const currentDay = next.getDay();
          const daysUntil = (dayOfWeek - currentDay + 7) % 7;
          if (daysUntil === 0 && next <= new Date()) {
            next.setDate(next.getDate() + 7);
          } else {
            next.setDate(next.getDate() + daysUntil);
          }
        }
        break;

      case 'biweekly':
        if (dayOfWeek !== undefined) {
          const currentDay = next.getDay();
          const daysUntil = (dayOfWeek - currentDay + 7) % 7;
          next.setDate(next.getDate() + daysUntil + 14);
        } else {
          next.setDate(next.getDate() + 14);
        }
        break;

      case 'monthly':
        if (dayOfMonth !== undefined) {
          next.setDate(dayOfMonth);
          if (next <= new Date()) {
            next.setMonth(next.getMonth() + 1);
          }
        } else {
          next.setMonth(next.getMonth() + 1);
        }
        break;

      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        if (dayOfMonth) next.setDate(dayOfMonth);
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        if (dayOfMonth) next.setDate(dayOfMonth);
        break;
    }

    return next;
  }
}
