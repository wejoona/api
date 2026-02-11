/**
 * @SensitiveEndpoint() decorator
 *
 * Marks a controller method as handling sensitive data.
 * Applies the JweDecryptInterceptor to decrypt incoming JWE payloads.
 *
 * Usage:
 *   @SensitiveEndpoint()
 *   @Post('transfer/internal')
 *   async createTransfer(@Body() dto: CreateTransferDto) { ... }
 */
import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { JweDecryptInterceptor } from '../interceptors/jwe-decrypt.interceptor';

export function SensitiveEndpoint() {
  return applyDecorators(UseInterceptors(JweDecryptInterceptor));
}
