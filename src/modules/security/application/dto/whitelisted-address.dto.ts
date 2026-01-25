import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  WhitelistedAddress,
  AddressType,
  WhitelistStatus,
} from '../../domain/entities';

export class CreateWhitelistedAddressDto {
  @ApiProperty({
    description: 'Wallet address to whitelist',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  address: string;

  @ApiProperty({
    description: 'Label for the address',
    example: 'My Hardware Wallet',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;

  @ApiPropertyOptional({
    description: 'Address type',
    enum: ['internal', 'external'],
    default: 'external',
  })
  @IsOptional()
  @IsEnum(['internal', 'external'])
  addressType?: 'internal' | 'external';

  @ApiPropertyOptional({
    description: 'Network (e.g., polygon, ethereum)',
    example: 'polygon',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  network?: string;
}

export class VerifyWhitelistedAddressDto {
  @ApiProperty({
    description: 'User PIN to verify ownership',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN must be 6 digits' })
  pin: string;
}

export class UpdateWhitelistedAddressDto {
  @ApiPropertyOptional({
    description: 'New label for the address',
    example: 'My Main Wallet',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;
}

export class WhitelistedAddressResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '0x1234567890abcdef1234567890abcdef12345678' })
  address: string;

  @ApiProperty({ example: 'My Hardware Wallet' })
  label: string;

  @ApiProperty({ enum: ['internal', 'external'], example: 'external' })
  addressType: AddressType;

  @ApiPropertyOptional({ example: 'polygon' })
  network: string | null;

  @ApiProperty({ enum: ['pending', 'active', 'revoked'], example: 'active' })
  status: WhitelistStatus;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: false })
  isNewAddress: boolean;

  @ApiProperty({ example: 0 })
  hoursUntilTrusted: number;

  @ApiProperty({ example: 5 })
  usageCount: number;

  @ApiPropertyOptional({ example: '2026-01-20T12:00:00.000Z' })
  lastUsedAt: Date | null;

  @ApiProperty({ example: '2026-01-18T12:00:00.000Z' })
  createdAt: Date;

  static fromDomain(address: WhitelistedAddress): WhitelistedAddressResponse {
    const response = new WhitelistedAddressResponse();
    response.id = address.id;
    response.address = address.address;
    response.label = address.label;
    response.addressType = address.addressType;
    response.network = address.network;
    response.status = address.status;
    response.isVerified = address.isVerified;
    response.isNewAddress = address.isNewAddress;
    response.hoursUntilTrusted = address.hoursUntilTrusted;
    response.usageCount = address.usageCount;
    response.lastUsedAt = address.lastUsedAt;
    response.createdAt = address.createdAt;
    return response;
  }
}

export class WhitelistedAddressListResponse {
  @ApiProperty({ type: [WhitelistedAddressResponse] })
  addresses: WhitelistedAddressResponse[];

  @ApiProperty({ example: 5 })
  total: number;

  static fromDomain(
    addresses: WhitelistedAddress[],
  ): WhitelistedAddressListResponse {
    const response = new WhitelistedAddressListResponse();
    response.addresses = addresses.map(WhitelistedAddressResponse.fromDomain);
    response.total = addresses.length;
    return response;
  }
}

export class CheckAddressResponse {
  @ApiProperty({ example: true })
  isWhitelisted: boolean;

  @ApiProperty({ example: true })
  isNew: boolean;

  @ApiProperty({ example: 12, description: 'Hours until address is trusted' })
  hoursUntilTrusted: number;

  @ApiProperty({ example: false })
  requiresDelay: boolean;

  @ApiProperty({
    example: 1000,
    description: 'Maximum withdrawal without delay (in USDC)',
  })
  instantLimit: number;
}
