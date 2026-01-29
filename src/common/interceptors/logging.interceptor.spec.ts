import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { Request, Response } from 'express';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let logSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);

    // Mock request
    mockRequest = {
      method: 'POST',
      url: '/api/v1/wallet/transfer',
      path: '/wallet/transfer',
      headers: {
        'user-agent': 'Jest Test',
        'content-type': 'application/json',
      } as any,
      body: {
        amount: 100,
        recipientId: 'user-123',
        pin: '123456',
      },
      query: {},
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1',
      } as any,
    } as any;

    // Mock response
    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
    } as any;

    // Mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    // Mock call handler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ success: true })),
    };

    // Spy on logger methods
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Correlation ID', () => {
    it('should generate correlation ID and add headers', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-Request-ID',
            expect.any(String),
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-Correlation-ID',
            expect.any(String),
          );
          done();
        },
      });
    });

    it('should use existing correlation ID from header', (done) => {
      const existingId = 'test-correlation-id';
      mockRequest.headers = {
        ...mockRequest.headers,
        'x-correlation-id': existingId,
      } as any;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'X-Request-ID',
            existingId,
          );
          done();
        },
      });
    });
  });

  describe('Request Logging', () => {
    it('should log request in development mode', (done) => {
      process.env.NODE_ENV = 'development';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(logSpy).toHaveBeenCalled();
          const logCall = logSpy.mock.calls.find((call) => {
            try {
              const data = JSON.parse(call[0]);
              return data.type === 'http_request';
            } catch {
              return false;
            }
          });
          expect(logCall).toBeDefined();
          done();
        },
      });
    });

    it('should include user ID when authenticated', (done) => {
      (mockRequest as any).user = { id: 'user-123', email: 'test@example.com' };

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = logSpy.mock.calls.find((call) => {
            try {
              const data = JSON.parse(call[0]);
              return data.type === 'http_request';
            } catch {
              return false;
            }
          });

          if (logCall) {
            const logData = JSON.parse(logCall[0]);
            expect(logData.userId).toBe('user-123');
          }
          done();
        },
      });
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should redact PIN in request body', (done) => {
      process.env.NODE_ENV = 'development';

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = logSpy.mock.calls.find((call) => {
            try {
              const data = JSON.parse(call[0]);
              return data.type === 'http_request';
            } catch {
              return false;
            }
          });

          if (logCall) {
            const logData = JSON.parse(logCall[0]);
            expect(logData.body.pin).toBe('[REDACTED]');
            expect(logData.body.amount).toBe(100);
          }
          done();
        },
      });
    });

    it('should redact authorization header', (done) => {
      process.env.NODE_ENV = 'development';
      mockRequest.headers = {
        ...mockRequest.headers,
        authorization: 'Bearer secret-token',
      } as any;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = logSpy.mock.calls.find((call) => {
            try {
              const data = JSON.parse(call[0]);
              return data.type === 'http_request';
            } catch {
              return false;
            }
          });

          if (logCall) {
            const logData = JSON.parse(logCall[0]);
            expect(logData.headers.authorization).toBe('[REDACTED]');
          }
          done();
        },
      });
    });
  });

  describe('Response Logging', () => {
    it('should log successful response with duration', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const responseCalls = logSpy.mock.calls.filter((call) => {
            try {
              const data = JSON.parse(call[0]);
              return data.type === 'http_response';
            } catch {
              return false;
            }
          });

          expect(responseCalls.length).toBeGreaterThan(0);
          const responseLog = JSON.parse(responseCalls[0][0]);
          expect(responseLog.statusCode).toBe(200);
          expect(responseLog.duration).toBeGreaterThanOrEqual(0);
          expect(responseLog.correlationId).toBeDefined();
          done();
        },
      });
    });

    it('should warn on client errors (4xx)', (done) => {
      mockResponse.statusCode = 400;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(warnSpy).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('Error Logging', () => {
    it('should log errors with error details', (done) => {
      const error: any = new Error('Test error');
      error.status = 500;
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalled();
          const errorCall = errorSpy.mock.calls[0];
          const errorLog = JSON.parse(errorCall[0]);

          expect(errorLog.type).toBe('http_error');
          expect(errorLog.error.message).toBe('Test error');
          expect(errorLog.statusCode).toBe(500);
          done();
        },
      });
    });

    it('should default to 500 for errors without status', (done) => {
      const error = new Error('Unknown error');
      mockCallHandler.handle = jest
        .fn()
        .mockReturnValue(throwError(() => error));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          const errorCall = errorSpy.mock.calls[0];
          const errorLog = JSON.parse(errorCall[0]);
          expect(errorLog.statusCode).toBe(500);
          done();
        },
      });
    });
  });

  describe('IP Address Detection', () => {
    it('should extract IP from x-forwarded-for header', (done) => {
      mockRequest.headers = {
        ...mockRequest.headers,
        'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      } as any;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = logSpy.mock.calls.find((call) => {
            try {
              const data = JSON.parse(call[0]);
              return data.type === 'http_request';
            } catch {
              return false;
            }
          });

          if (logCall) {
            const logData = JSON.parse(logCall[0]);
            expect(logData.ip).toBe('1.2.3.4');
          }
          done();
        },
      });
    });

    it('should use x-real-ip if x-forwarded-for not present', (done) => {
      mockRequest.headers = {
        ...mockRequest.headers,
        'x-real-ip': '9.8.7.6',
      } as any;

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = logSpy.mock.calls.find((call) => {
            try {
              const data = JSON.parse(call[0]);
              return data.type === 'http_request';
            } catch {
              return false;
            }
          });

          if (logCall) {
            const logData = JSON.parse(logCall[0]);
            expect(logData.ip).toBe('9.8.7.6');
          }
          done();
        },
      });
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should use debug level for requests in production', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          expect(debugSpy).toHaveBeenCalled();
          done();
        },
      });
    });

    it('should log only field names not values in production', (done) => {
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        complete: () => {
          const logCall = debugSpy.mock.calls.find((call) => {
            try {
              const data = JSON.parse(call[0]);
              return data.type === 'http_request';
            } catch {
              return false;
            }
          });

          if (logCall) {
            const logData = JSON.parse(logCall[0]);
            expect(logData.bodyFields).toBeDefined();
            expect(logData.body).toBeUndefined();
          }
          done();
        },
      });
    });
  });
});
