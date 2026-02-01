import { IsString, IsNotEmpty, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPinDto {
  @ApiProperty({
    description: 'SHA256 hash of the PIN (client-side hashed for security)',
    example: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64, { message: 'PIN hash must be 64 characters (SHA256)' })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'PIN hash must be a valid SHA256 hash',
  })
  pinHash: string;
}

export class ChangePinDto {
  @ApiProperty({
    description: 'SHA256 hash of the old PIN (client-side hashed for security)',
    example: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64, { message: 'PIN hash must be 64 characters (SHA256)' })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'PIN hash must be a valid SHA256 hash',
  })
  oldPinHash: string;

  @ApiProperty({
    description: 'SHA256 hash of the new PIN (client-side hashed for security)',
    example: 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64, { message: 'PIN hash must be 64 characters (SHA256)' })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'PIN hash must be a valid SHA256 hash',
  })
  newPinHash: string;
}

export class VerifyPinDto {
  @ApiProperty({
    description: 'SHA256 hash of the PIN (client-side hashed for security)',
    example: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64, { message: 'PIN hash must be 64 characters (SHA256)' })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'PIN hash must be a valid SHA256 hash',
  })
  pinHash: string;
}

export class ResetPinDto {
  @ApiProperty({
    description: 'OTP code sent to user phone',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;

  @ApiProperty({
    description: 'SHA256 hash of the new PIN (client-side hashed for security)',
    example: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64, { message: 'PIN hash must be 64 characters (SHA256)' })
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'PIN hash must be a valid SHA256 hash',
  })
  newPinHash: string;
}
