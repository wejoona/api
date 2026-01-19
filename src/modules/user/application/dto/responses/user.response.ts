import { ApiProperty } from '@nestjs/swagger';
import { User, KycStatus } from '../../domain/entities';

export class UserResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '+2250701234567' })
  phone: string;

  @ApiProperty({ example: true })
  phoneVerified: boolean;

  @ApiProperty({ example: 'Amadou', nullable: true })
  firstName: string | null;

  @ApiProperty({ example: 'Diallo', nullable: true })
  lastName: string | null;

  @ApiProperty({ example: 'amadou@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'CI' })
  countryCode: string;

  @ApiProperty({
    example: 'approved',
    enum: ['pending', 'submitted', 'approved', 'rejected'],
  })
  kycStatus: KycStatus;

  @ApiProperty({ example: true })
  canTransact: boolean;

  @ApiProperty({ example: true })
  canWithdraw: boolean;

  @ApiProperty({ example: '2026-01-18T12:00:00.000Z' })
  createdAt: Date;

  static fromDomain(user: User): UserResponse {
    const response = new UserResponse();
    response.id = user.id;
    response.phone = user.phone;
    response.phoneVerified = user.phoneVerified;
    response.firstName = user.firstName;
    response.lastName = user.lastName;
    response.email = user.email;
    response.countryCode = user.countryCode;
    response.kycStatus = user.kycStatus;
    response.canTransact = user.canTransact;
    response.canWithdraw = user.canWithdraw;
    response.createdAt = user.createdAt;
    return response;
  }
}
