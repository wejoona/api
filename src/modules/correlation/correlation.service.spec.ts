import { Test, TestingModule } from '@nestjs/testing';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { CorrelationService } from './correlation.service';

describe('CorrelationService', () => {
  let service: CorrelationService;
  let mockRequest: Partial<Request>;

  beforeEach(async () => {
    mockRequest = {
      headers: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorrelationService,
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
      ],
    }).compile();

    service = await module.resolve<CorrelationService>(CorrelationService);
  });

  describe('getCorrelationId', () => {
    it('should return correlation ID from request', () => {
      const expectedId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest['correlationId'] = expectedId;

      const result = service.getCorrelationId();

      expect(result).toBe(expectedId);
    });

    it('should return "unknown" if no correlation ID exists', () => {
      const result = service.getCorrelationId();

      expect(result).toBe('unknown');
    });
  });

  describe('hasCorrelationId', () => {
    it('should return true if correlation ID exists', () => {
      mockRequest['correlationId'] = '550e8400-e29b-41d4-a716-446655440000';

      const result = service.hasCorrelationId();

      expect(result).toBe(true);
    });

    it('should return false if correlation ID does not exist', () => {
      const result = service.hasCorrelationId();

      expect(result).toBe(false);
    });

    it('should return false if correlation ID is empty string', () => {
      mockRequest['correlationId'] = '';

      const result = service.hasCorrelationId();

      expect(result).toBe(false);
    });

    it('should return false if correlation ID is null', () => {
      mockRequest['correlationId'] = null;

      const result = service.hasCorrelationId();

      expect(result).toBe(false);
    });
  });
});
