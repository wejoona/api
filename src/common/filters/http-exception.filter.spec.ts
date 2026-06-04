import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';
import { AppException } from '../exceptions';
import { ERROR_CODES } from '../constants/error-codes';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  const createHost = (url = '/api/v1/wallet/transfer/internal') =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          url,
          method: 'POST',
          headers: { 'x-correlation-id': 'corr-1' },
        }),
      }),
    }) as unknown as ArgumentsHost;

  const body = () => response.json.mock.calls[0][0];

  beforeEach(() => {
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    filter = new GlobalExceptionFilter();
  });

  it('keeps unavailable feature codes stable for mobile clients', () => {
    filter.catch(
      AppException.badRequest(
        ERROR_CODES.CARD_PROVIDER_UNAVAILABLE,
        'Card issuing is not available yet',
        undefined,
        {
          reason: 'provider_or_feature_disabled',
          featureReason: 'card_issuing_unavailable',
          provider: null,
        },
      ),
      createHost('/api/v1/cards'),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      success: false,
      error: {
        code: ERROR_CODES.CARD_PROVIDER_UNAVAILABLE,
        message: 'Card issuing is not available yet',
        reason: 'provider_or_feature_disabled',
        featureReason: 'card_issuing_unavailable',
        provider: null,
        context: {
          reason: 'provider_or_feature_disabled',
          featureReason: 'card_issuing_unavailable',
          provider: null,
        },
      },
      meta: {
        path: '/api/v1/cards',
        method: 'POST',
        correlationId: 'corr-1',
      },
    });
  });

  it('preserves forbidden ownership context', () => {
    filter.catch(
      new ForbiddenException({
        code: 'FORBIDDEN_OWNERSHIP',
        message: 'Access denied',
        resource: 'payment_link',
      }),
      createHost('/api/v1/payment-links/link-1'),
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(body()).toMatchObject({
      success: false,
      error: {
        code: 'FORBIDDEN_OWNERSHIP',
        message: 'Access denied',
        context: { resource: 'payment_link' },
      },
    });
  });

  it('preserves insufficient-funds context', () => {
    filter.catch(
      new BadRequestException({
        code: ERROR_CODES.TRANSFER_INSUFFICIENT_FUNDS,
        message: 'Insufficient balance',
        required: '100.50',
        available: '20.00',
        currency: 'USDC',
      }),
      createHost(),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      success: false,
      error: {
        code: ERROR_CODES.TRANSFER_INSUFFICIENT_FUNDS,
        message: 'Insufficient balance',
        context: {
          required: '100.50',
          available: '20.00',
          currency: 'USDC',
        },
      },
    });
  });

  it('preserves AppException settlement support context', () => {
    filter.catch(
      AppException.badRequest(
        ERROR_CODES.WITHDRAWAL_FAILED,
        'Transfer failed. Please try again later.',
        undefined,
        {
          supportReference: 'support-ref-1',
          ledgerReference: 'ledger-ref-1',
          ledgerTransactionId: 'blnk-1',
          settlementStatus: 'voided',
        },
      ),
      createHost('/api/v1/wallet/withdraw'),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(body()).toMatchObject({
      success: false,
      error: {
        code: ERROR_CODES.WITHDRAWAL_FAILED,
        message: 'Transfer failed. Please try again later.',
        context: {
          supportReference: 'support-ref-1',
          ledgerReference: 'ledger-ref-1',
          ledgerTransactionId: 'blnk-1',
          settlementStatus: 'voided',
        },
      },
    });
  });

  it('preserves invalid PIN context without leaking the PIN', () => {
    filter.catch(
      new BadRequestException({
        code: ERROR_CODES.PIN_INCORRECT,
        message: 'Invalid PIN',
        attemptsRemaining: 2,
      }),
      createHost('/api/v1/wallet/pin/verify'),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(JSON.stringify(body())).not.toContain('123456');
    expect(body()).toMatchObject({
      success: false,
      error: {
        code: ERROR_CODES.PIN_INCORRECT,
        message: 'Invalid PIN',
        context: { attemptsRemaining: 2 },
      },
    });
  });

  it('keeps missing wallet states stable when no domain code is provided', () => {
    filter.catch(
      new NotFoundException('Wallet not found'),
      createHost('/api/v1/wallet'),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(body()).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Wallet not found',
      },
    });
  });
});
