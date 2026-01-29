/**
 * Schedule Repository
 * In-memory implementation (replace with DB in production)
 */

import { Injectable } from '@nestjs/common';
import {
  PaymentSchedule,
  ScheduleStatus,
} from '../../domain/interfaces/scheduled-payment.types';

@Injectable()
export class ScheduleRepository {
  private readonly schedules = new Map<string, PaymentSchedule>();

  async findById(id: string): Promise<PaymentSchedule | null> {
    return this.schedules.get(id) || null;
  }

  async findByUserId(userId: string): Promise<PaymentSchedule[]> {
    return Array.from(this.schedules.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByStatus(status: ScheduleStatus): Promise<PaymentSchedule[]> {
    return Array.from(this.schedules.values()).filter(
      (s) => s.status === status,
    );
  }

  async findDueForExecution(): Promise<PaymentSchedule[]> {
    const now = new Date();
    return Array.from(this.schedules.values()).filter(
      (s) =>
        s.status === 'active' && s.nextExecutionAt && s.nextExecutionAt <= now,
    );
  }

  async findUpcoming(
    userId: string,
    beforeDate: Date,
  ): Promise<PaymentSchedule[]> {
    return Array.from(this.schedules.values())
      .filter(
        (s) =>
          s.userId === userId &&
          s.status === 'active' &&
          s.nextExecutionAt &&
          s.nextExecutionAt <= beforeDate,
      )
      .sort(
        (a, b) =>
          (a.nextExecutionAt?.getTime() || 0) -
          (b.nextExecutionAt?.getTime() || 0),
      );
  }

  async create(schedule: PaymentSchedule): Promise<PaymentSchedule> {
    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  async update(
    id: string,
    updates: Partial<PaymentSchedule>,
  ): Promise<PaymentSchedule> {
    const existing = this.schedules.get(id);
    if (!existing) throw new Error(`Schedule not found: ${id}`);

    const updated: PaymentSchedule = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.schedules.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.schedules.delete(id);
  }

  async countByUserId(userId: string): Promise<number> {
    return Array.from(this.schedules.values()).filter(
      (s) => s.userId === userId && s.status === 'active',
    ).length;
  }
}
