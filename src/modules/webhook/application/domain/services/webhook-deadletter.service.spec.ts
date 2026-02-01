import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WebhookDeadletterService,
  LogDeadletterParams,
} from './webhook-deadletter.service';
import { WebhookDeadletterOrmEntity } from '../../../infrastructure/orm-entities/webhook-deadletter.orm-entity';

describe('WebhookDeadletterService', () => {
  let service: WebhookDeadletterService;
  let repository: jest.Mocked<Repository<WebhookDeadletterOrmEntity>>;

  const mockDeadletterEntity = {
    id: 'deadletter-123',
    provider: 'yellowcard',
    eventType: 'deposit.completed',
    webhookId: 'webhook-123',
    payload: { depositId: 'deposit-123' },
    errorMessage: 'Database connection failed',
    errorStack: 'Error stack trace',
    status: 'pending',
    retryCount: 0,
    lastRetryAt: null,
    resolvedAt: null,
    resolvedBy: null,
    resolutionNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as WebhookDeadletterOrmEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookDeadletterService,
        {
          provide: getRepositoryToken(WebhookDeadletterOrmEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            increment: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookDeadletterService>(WebhookDeadletterService);
    repository = module.get(getRepositoryToken(WebhookDeadletterOrmEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('should log a failed webhook with Error object', async () => {
      const params: LogDeadletterParams = {
        provider: 'yellowcard',
        eventType: 'deposit.completed',
        webhookId: 'webhook-123',
        payload: { depositId: 'deposit-123' },
        error: new Error('Database connection failed'),
      };

      repository.create.mockReturnValue(mockDeadletterEntity);
      repository.save.mockResolvedValue(mockDeadletterEntity);

      const result = await service.log(params);

      expect(repository.create).toHaveBeenCalledWith({
        provider: 'yellowcard',
        eventType: 'deposit.completed',
        webhookId: 'webhook-123',
        payload: { depositId: 'deposit-123' },
        errorMessage: 'Database connection failed',
        errorStack: expect.any(String),
        status: 'pending',
        retryCount: 0,
      });
      expect(repository.save).toHaveBeenCalledWith(mockDeadletterEntity);
      expect(result).toEqual(mockDeadletterEntity);
    });

    it('should log a failed webhook with string error', async () => {
      const params: LogDeadletterParams = {
        provider: 'circle',
        eventType: 'transfer.failed',
        payload: { transferId: 'transfer-123' },
        error: 'Invalid payload format',
      };

      repository.create.mockReturnValue(mockDeadletterEntity);
      repository.save.mockResolvedValue(mockDeadletterEntity);

      await service.log(params);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Invalid payload format',
          errorStack: null,
        }),
      );
    });

    it('should log without webhookId', async () => {
      const params: LogDeadletterParams = {
        provider: 'generic',
        eventType: 'unknown.event',
        payload: { data: 'test' },
        error: new Error('Unknown event type'),
      };

      repository.create.mockReturnValue(mockDeadletterEntity);
      repository.save.mockResolvedValue(mockDeadletterEntity);

      await service.log(params);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookId: null,
        }),
      );
    });
  });

  describe('findPending', () => {
    it('should find all pending dead-letter entries', async () => {
      const mockEntries = [
        { ...mockDeadletterEntity, id: '1', status: 'pending' },
        { ...mockDeadletterEntity, id: '2', status: 'pending' },
      ];

      repository.find.mockResolvedValue(mockEntries as any);

      const result = await service.findPending();

      expect(repository.find).toHaveBeenCalledWith({
        where: { status: 'pending' },
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(mockEntries);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no pending entries', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findPending();

      expect(result).toEqual([]);
    });
  });

  describe('findByProvider', () => {
    it('should find entries by provider', async () => {
      const mockEntries = [
        { ...mockDeadletterEntity, provider: 'yellowcard' },
        { ...mockDeadletterEntity, provider: 'yellowcard', id: '2' },
      ];

      repository.find.mockResolvedValue(mockEntries as any);

      const result = await service.findByProvider('yellowcard');

      expect(repository.find).toHaveBeenCalledWith({
        where: { provider: 'yellowcard' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockEntries);
    });
  });

  describe('resolve', () => {
    it('should mark entry as resolved', async () => {
      const id = 'deadletter-123';
      const resolvedBy = 'admin-user-123';
      const notes = 'Manually processed via admin panel';

      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.resolve(id, resolvedBy, notes);

      expect(repository.update).toHaveBeenCalledWith(id, {
        status: 'resolved',
        resolvedAt: expect.any(Date),
        resolvedBy,
        resolutionNotes: notes,
      });
    });

    it('should resolve without notes', async () => {
      const id = 'deadletter-123';
      const resolvedBy = 'admin-user-123';

      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.resolve(id, resolvedBy);

      expect(repository.update).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          status: 'resolved',
          resolutionNotes: null,
        }),
      );
    });
  });

  describe('ignore', () => {
    it('should mark entry as ignored with reason', async () => {
      const id = 'deadletter-123';
      const ignoredBy = 'admin-user-456';
      const reason = 'Duplicate entry, already processed';

      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.ignore(id, ignoredBy, reason);

      expect(repository.update).toHaveBeenCalledWith(id, {
        status: 'ignored',
        resolvedAt: expect.any(Date),
        resolvedBy: ignoredBy,
        resolutionNotes: reason,
      });
    });

    it('should ignore without reason', async () => {
      const id = 'deadletter-123';
      const ignoredBy = 'admin-user-456';

      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.ignore(id, ignoredBy);

      expect(repository.update).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          status: 'ignored',
          resolutionNotes: null,
        }),
      );
    });
  });

  describe('incrementRetry', () => {
    it('should increment retry count', async () => {
      const id = 'deadletter-123';

      repository.increment.mockResolvedValue({ affected: 1 } as any);
      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.incrementRetry(id);

      expect(repository.increment).toHaveBeenCalledWith(
        { id },
        'retryCount',
        1,
      );
      expect(repository.update).toHaveBeenCalledWith(id, {
        lastRetryAt: expect.any(Date),
      });
    });
  });

  describe('getStats', () => {
    it('should return statistics about dead-letter queue', async () => {
      repository.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(10) // resolved
        .mockResolvedValueOnce(2); // ignored

      const result = await service.getStats();

      expect(repository.count).toHaveBeenCalledTimes(3);
      expect(repository.count).toHaveBeenNthCalledWith(1, {
        where: { status: 'pending' },
      });
      expect(repository.count).toHaveBeenNthCalledWith(2, {
        where: { status: 'resolved' },
      });
      expect(repository.count).toHaveBeenNthCalledWith(3, {
        where: { status: 'ignored' },
      });

      expect(result).toEqual({
        pending: 5,
        resolved: 10,
        ignored: 2,
        total: 17,
      });
    });

    it('should handle zero counts', async () => {
      repository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getStats();

      expect(result).toEqual({
        pending: 0,
        resolved: 0,
        ignored: 0,
        total: 0,
      });
    });
  });
});
