/**
 * JWE Decrypt Interceptor
 *
 * Automatically decrypts JWE-wrapped request bodies on endpoints
 * marked with @SensitiveEndpoint().
 *
 * Expected request format:
 * {
 *   "jwe": "<JWE compact serialization>"
 * }
 *
 * The interceptor decrypts the JWE token and replaces req.body
 * with the plaintext JSON before the controller handler runs.
 *
 * Non-JWE requests pass through unchanged (graceful degradation
 * for dev/testing — disable via REQUIRE_JWE=true in production).
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ServerKeyService } from '../services/server-key.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JweDecryptInterceptor implements NestInterceptor {
  private readonly logger = new Logger(JweDecryptInterceptor.name);
  private readonly requireJwe: boolean;

  constructor(
    private readonly serverKeyService: ServerKeyService,
    private readonly configService: ConfigService,
  ) {
    this.requireJwe =
      this.configService.get<string>('REQUIRE_JWE', 'false') === 'true';
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Only process POST/PUT/PATCH with body
    if (!body || typeof body !== 'object') {
      return next.handle();
    }

    // Check if the body is a JWE envelope
    if (body.jwe && typeof body.jwe === 'string') {
      try {
        const decrypted = await this.serverKeyService.decrypt(body.jwe);
        request.body = decrypted;
        this.logger.debug(
          `Decrypted JWE payload for ${request.method} ${request.url}`,
        );
      } catch (error) {
        this.logger.warn(
          `JWE decryption failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
        throw new BadRequestException(
          'Invalid encrypted payload. Please re-fetch the server public key.',
        );
      }
    } else if (this.requireJwe) {
      // In strict mode, reject unencrypted payloads on sensitive endpoints
      throw new BadRequestException(
        'This endpoint requires encrypted payloads (JWE).',
      );
    }
    // else: plain JSON pass-through (dev/test friendly)

    return next.handle();
  }
}
