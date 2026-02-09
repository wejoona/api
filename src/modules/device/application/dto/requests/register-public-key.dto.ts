import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class RegisterPublicKeyDto {
  @ApiProperty({
    description: 'ECDH P-256 public key in JWK format',
    example: {
      kty: 'EC',
      crv: 'P-256',
      x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
      y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
    },
  })
  @IsObject()
  @IsNotEmpty()
  publicKeyJwk: Record<string, unknown>;
}
