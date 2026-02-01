import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditService } from '../../../modules/admin/application/services/audit.service';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let auditService: jest.Mocked<AuditService>;
  let reflector: jest.Mocked<Reflector>;

  const mockRequest = {
    user: { id: 'user-123', role: 'user' },
    method: 'POST',
    url: '/api/transfers',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Jest/Test' },
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getHandler: jest.fn(),
    getArgs: () => [mockRequest, { amount: 1000 }],
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: () => of({ id: 'transfer-123', amount: 1000 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogInterceptor,
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<AuditLogInterceptor>(AuditLogInterceptor);
    auditService = module.get(AuditService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should not log if no audit options present', (done) => {
    reflector.get.mockReturnValue(null);

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(auditService.log).not.toHaveBeenCalled();
        done();
      });
  });

  it('should log basic audit event', (done) => {
    const options = {
      action: 'transfer.create',
      resourceType: 'transfer',
      resourceIdPath: 'result.id',
    };

    reflector.get.mockReturnValue(options);

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'transfer.create',
            resourceType: 'transfer',
            resourceId: 'transfer-123',
            actorId: 'user-123',
            actorType: 'user',
            ipAddress: '127.0.0.1',
            userAgent: 'Jest/Test',
          }),
        );
        done();
      });
  });

  it('should include arguments when specified', (done) => {
    const options = {
      action: 'transfer.create',
      resourceType: 'transfer',
      includeArgs: [1],
    };

    reflector.get.mockReturnValue(options);

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              args: [{ amount: 1000 }],
            }),
          }),
        );
        done();
      });
  });

  it('should include result when specified', (done) => {
    const options = {
      action: 'transfer.create',
      resourceType: 'transfer',
      includeResult: true,
    };

    reflector.get.mockReturnValue(options);

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              result: { id: 'transfer-123', amount: 1000 },
            }),
          }),
        );
        done();
      });
  });

  it('should redact sensitive fields', (done) => {
    const options = {
      action: 'auth.login',
      resourceType: 'auth',
      includeArgs: true,
      sensitiveFields: ['password', 'pin'],
    };

    reflector.get.mockReturnValue(options);

    const sensitiveContext = {
      ...mockExecutionContext,
      getArgs: () => [mockRequest, { password: 'secret123', username: 'user' }],
    };

    const sensitiveHandler: CallHandler = {
      handle: () => of({ token: 'abc123', userId: 'user-123' }),
    };

    interceptor
      .intercept(sensitiveContext as ExecutionContext, sensitiveHandler)
      .subscribe(() => {
        const logCall = auditService.log.mock.calls[0][0];
        expect(logCall.details.args).toContainEqual(
          expect.objectContaining({
            password: '[REDACTED]',
            username: 'user',
          }),
        );
        done();
      });
  });

  it('should log on error when logOnError is true', (done) => {
    const options = {
      action: 'transfer.create',
      resourceType: 'transfer',
      logOnError: true,
    };

    reflector.get.mockReturnValue(options);

    const errorHandler: CallHandler = {
      handle: () => throwError(() => new Error('Transfer failed')),
    };

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, errorHandler)
      .subscribe({
        error: () => {
          setTimeout(() => {
            expect(auditService.log).toHaveBeenCalledWith(
              expect.objectContaining({
                details: expect.objectContaining({
                  success: false,
                  error: expect.objectContaining({
                    name: 'Error',
                    message: 'Transfer failed',
                  }),
                }),
              }),
            );
            done();
          }, 100);
        },
      });
  });

  it('should extract resource ID from nested path', (done) => {
    const options = {
      action: 'transfer.create',
      resourceType: 'transfer',
      resourceIdPath: 'result.data.transferId',
    };

    reflector.get.mockReturnValue(options);

    const nestedHandler: CallHandler = {
      handle: () => of({ data: { transferId: 'nested-123' } }),
    };

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, nestedHandler)
      .subscribe(() => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            resourceId: 'nested-123',
          }),
        );
        done();
      });
  });

  it('should extract custom details', (done) => {
    const options = {
      action: 'transfer.create',
      resourceType: 'transfer',
      detailsExtractor: (args: any[], result: any) => ({
        customField: 'customValue',
        amount: result.amount,
      }),
    };

    reflector.get.mockReturnValue(options);

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              customField: 'customValue',
              amount: 1000,
            }),
          }),
        );
        done();
      });
  });

  it('should identify admin actor type', (done) => {
    const adminContext = {
      ...mockExecutionContext,
      switchToHttp: () => ({
        getRequest: () => ({
          ...mockRequest,
          user: { id: 'admin-123', role: 'admin' },
        }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
    };

    const options = {
      action: 'user.delete',
      resourceType: 'user',
    };

    reflector.get.mockReturnValue(options);

    interceptor
      .intercept(adminContext as ExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            actorType: 'admin',
          }),
        );
        done();
      });
  });

  it('should include duration in details', (done) => {
    const options = {
      action: 'transfer.create',
      resourceType: 'transfer',
    };

    reflector.get.mockReturnValue(options);

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler)
      .subscribe(() => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              duration: expect.any(Number),
            }),
          }),
        );
        done();
      });
  });

  it('should not fail request if audit logging fails', (done) => {
    const options = {
      action: 'transfer.create',
      resourceType: 'transfer',
    };

    reflector.get.mockReturnValue(options);
    auditService.log.mockRejectedValue(new Error('Audit service down'));

    interceptor
      .intercept(mockExecutionContext as ExecutionContext, mockCallHandler)
      .subscribe({
        next: (result) => {
          expect(result).toEqual({ id: 'transfer-123', amount: 1000 });
          done();
        },
        error: () => {
          fail('Should not error if audit logging fails');
        },
      });
  });
});
