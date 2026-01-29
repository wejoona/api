/**
 * Execution Repository
 * In-memory implementation (replace with DB in production)
 */

import { Injectable } from '@nestjs/common';
import {
  PaymentExecution,
  ExecutionStatus,
} from '../../domain/interfaces/scheduled-payment.types';

@Injectable()
export class ExecutionRepository {
  private readonly executions = new Map<string, PaymentExecution>();

  async findById(id: string): Promise<PaymentExecution | null> {
    return this.executions.get(id) || null;
  }

  async findByScheduleId(
    scheduleId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ executions: PaymentExecution[]; total: number }> {
    const { page = 1, limit = 20 } = options;

    const all = Array.from(this.executions.values())
      .filter((e) => e.scheduleId === scheduleId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = all.length;
    const executions = all.slice((page - 1) * limit, page * limit);

    return { executions, total };
  }

  async findByUserId(userId: string): Promise<PaymentExecution[]> {
    return Array.from(this.executions.values())
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByStatus(status: ExecutionStatus): Promise<PaymentExecution[]> {
    return Array.from(this.executions.values()).filter(
      (e) => e.status === status,
    );
  }

  async findPending(): Promise<PaymentExecution[]> {
    return Array.from(this.executions.values()).filter(
      (e) => e.status === 'pending' || e.status === 'processing',
    );
  }

  async create(execution: PaymentExecution): Promise<PaymentExecution> {
    this.executions.set(execution.id, execution);
    return execution;
  }

  async update(
    id: string,
    updates: Partial<PaymentExecution>,
  ): Promise<PaymentExecution> {
    const existing = this.executions.get(id);
    if (!existing) throw new Error(`Execution not found: ${id}`);

    const updated: PaymentExecution = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.executions.set(id, updated);
    return updated;
  }

  async countByScheduleId(scheduleId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
  }> {
    const executions = Array.from(this.executions.values()).filter(
      (e) => e.scheduleId === scheduleId,
    );

    return {
      total: executions.length,
      completed: executions.filter((e) => e.status === 'completed').length,
      failed: executions.filter((e) => e.status === 'failed').length,
    };
  }
}
