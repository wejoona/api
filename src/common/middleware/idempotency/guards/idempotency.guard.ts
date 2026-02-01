import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IDEMPOTENCY_KEY } from '../decorators/idempotent.decorator';
import { IdempotentOptions } from '../decorators/idempotent.decorator';

/**
 * Idempotency Guard
 *
 * Enforces idempotency requirements set via @Idempotent decorator.
 * This guard checks if an idempotency key is required and present.
 *
 * Usage:
 * Applied automatically when using @Idempotent decorator, or can be
 * applied manually via @UseGuards(IdempotencyGuard)
 */
@Injectable()
export class IdempotencyGuard implements CanActivate {
  private readonly HEADER_NAME = 'idempotency-key';

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get idempotency metadata from decorator
    const options = this.reflector.get<IdempotentOptions>(
      IDEMPOTENCY_KEY,
      context.getHandler(),
    );

    // If no @Idempotent decorator, allow request
    if (!options) {
      return true;
    }

    // If idempotency key is not required, allow request
    if (!options.required) {
      return true;
    }

    // Check if idempotency key is present
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers[this.HEADER_NAME];

    if (!idempotencyKey) {
      throw new BadRequestException(
        `${this.HEADER_NAME} header is required for this endpoint`,
      );
    }

    return true;
  }
}
