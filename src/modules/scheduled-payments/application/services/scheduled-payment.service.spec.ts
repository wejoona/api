import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScheduledPaymentService } from './scheduled-payment.service';
import { PaymentSchedule } from '../../domain/interfaces/scheduled-payment.types';

describe('ScheduledPaymentService execution boundary', () => {
  let service: ScheduledPaymentService;
  let scheduleRepository: { findById: jest.Mock; update: jest.Mock };
  let executionRepository: { create: jest.Mock; update: jest.Mock };
  let internalTransferUseCase: { execute: jest.Mock };
  let userRepository: { findById: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const schedule: PaymentSchedule = {
    id: 'schedule-id',
    userId: 'sender-user-id',
    name: 'Weekly transfer',
    status: 'active',
    recipientId: 'recipient-user-id',
    recipientType: 'internal',
    recipientName: 'Recipient',
    amount: 25,
    currency: 'USDC',
    frequency: 'weekly',
    time: '09:00',
    timezone: 'Africa/Abidjan',
    startDate: new Date('2026-06-04T09:00:00.000Z'),
    totalExecuted: 0,
    nextExecutionAt: new Date('2026-06-05T09:00:00.000Z'),
    failureCount: 0,
    maxFailures: 3,
    createdAt: new Date('2026-06-04T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
  };

  beforeEach(() => {
    scheduleRepository = {
      findById: jest.fn().mockResolvedValue(schedule),
      update: jest.fn().mockImplementation(async (_id, updates) => ({
        ...schedule,
        ...updates,
      })),
    };
    executionRepository = {
      create: jest.fn().mockImplementation(async (execution) => execution),
      update: jest.fn().mockImplementation(async (_id, updates) => updates),
    };
    internalTransferUseCase = {
      execute: jest.fn().mockResolvedValue({
        transactionId: 'transfer-tx-123',
      }),
    };
    userRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'recipient-user-id',
        phone: '+2250701234567',
      }),
    };
    eventEmitter = { emit: jest.fn() };

    service = new ScheduledPaymentService(
      scheduleRepository as any,
      executionRepository as any,
      eventEmitter as unknown as EventEmitter2,
      internalTransferUseCase as any,
      userRepository as any,
    );
  });

  it('executes scheduled transfers through InternalTransferUseCase so risk, limits, and ledger checks re-run', async () => {
    const result = await service.executeSchedule(schedule.id);

    expect(result).toMatchObject({
      status: 'completed',
      transactionId: 'transfer-tx-123',
    });
    expect(internalTransferUseCase.execute).toHaveBeenCalledWith({
      fromUserId: schedule.userId,
      toPhone: '+2250701234567',
      amount: schedule.amount,
      currency: schedule.currency,
    });
    expect(executionRepository.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        status: 'completed',
        transactionId: 'transfer-tx-123',
      }),
    );
  });

  it('records failed scheduled executions without bypassing transfer policy', async () => {
    internalTransferUseCase.execute.mockRejectedValue(
      new Error('Insufficient balance'),
    );

    const result = await service.executeSchedule(schedule.id);

    expect(result).toMatchObject({
      status: 'failed',
      failureReason: 'Insufficient balance',
    });
    expect(internalTransferUseCase.execute).toHaveBeenCalledTimes(1);
    expect(scheduleRepository.update).toHaveBeenCalledWith(schedule.id, {
      status: 'active',
      failureCount: 1,
      lastFailureReason: 'Insufficient balance',
    });
  });
});
