import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

/**
 * Application-specific exception that carries a machine-readable error code.
 * Mobile clients can switch on `code` for localised error messages.
 *
 * Usage:
 *   throw AppException.badRequest(ERROR_CODES.TRANSFER_INSUFFICIENT_FUNDS, 'Insufficient balance');
 *   throw AppException.notFound(ERROR_CODES.PAYMENT_LINK_NOT_FOUND, 'Payment link not found');
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    status: HttpStatus,
    public readonly details?: string[],
    public readonly context?: Record<string, unknown>,
  ) {
    super(
      {
        code,
        message,
        details,
        ...context,
      },
      status,
    );
  }

  static badRequest(
    code: ErrorCode | string,
    message: string,
    details?: string[],
    context?: Record<string, unknown>,
  ): AppException {
    return new AppException(
      code,
      message,
      HttpStatus.BAD_REQUEST,
      details,
      context,
    );
  }

  static notFound(code: ErrorCode | string, message: string): AppException {
    return new AppException(code, message, HttpStatus.NOT_FOUND);
  }

  static forbidden(code: ErrorCode | string, message: string): AppException {
    return new AppException(code, message, HttpStatus.FORBIDDEN);
  }

  static conflict(code: ErrorCode | string, message: string): AppException {
    return new AppException(code, message, HttpStatus.CONFLICT);
  }

  static serviceUnavailable(
    code: ErrorCode | string,
    message: string,
    details?: string[],
    context?: Record<string, unknown>,
  ): AppException {
    return new AppException(
      code,
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
      context,
    );
  }

  static tooManyRequests(
    message: string = 'Rate limit exceeded',
  ): AppException {
    return new AppException('E9001', message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
