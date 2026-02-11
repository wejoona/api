/**
 * Server Key Controller
 *
 * Exposes the server's RSA public key for client-side JWE encryption.
 * No authentication required — the public key is safe to share.
 */
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServerKeyService } from '../services/server-key.service';

@ApiTags('Security')
@Controller('security')
export class ServerKeyController {
  constructor(private readonly serverKeyService: ServerKeyService) {}

  @Get('public-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get server public key for JWE encryption',
    description:
      'Returns the server RSA public key in JWK format. ' +
      'Clients use this to encrypt sensitive request bodies as JWE compact tokens. ' +
      'Key rotates periodically — clients should refresh if decryption fails.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server public key in JWK format',
    schema: {
      type: 'object',
      properties: {
        kty: { type: 'string', example: 'RSA' },
        n: { type: 'string', description: 'RSA modulus' },
        e: { type: 'string', example: 'AQAB' },
        kid: { type: 'string', example: 'srv-m2k3a9f' },
        use: { type: 'string', example: 'enc' },
        alg: { type: 'string', example: 'RSA-OAEP-256' },
      },
    },
  })
  getPublicKey() {
    return this.serverKeyService.getPublicKey();
  }
}
