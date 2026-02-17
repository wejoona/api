import { IsNumber, IsString, IsIn, IsOptional, Min, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateDepositDto {
  @ApiProperty({
    description: 'Deposit amount in minor currency units (centimes for XOF). Minimum 100 XOF.',
    minimum: 100,
    example: 6000,
  })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(100, { message: 'Le montant minimum de dépôt est de 100 XOF' })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    enum: ['XOF', 'XAF'],
    example: 'XOF',
  })
  @IsString()
  @IsIn(['XOF', 'XAF'], { message: 'Devise non supportée. Devises disponibles: XOF, XAF' })
  currency: string;

  @ApiProperty({
    description: 'Payment provider code',
    example: 'OMCI',
    enum: ['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI'],
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code du fournisseur est requis' })
  @IsIn(['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI'], {
    message: 'Fournisseur invalide. Options: OMCI, MTNCI, MOOVCI, WAVECI',
  })
  providerCode: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format (defaults to user\'s registered phone)',
    example: '+2250700000001',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Le numéro de téléphone doit être au format international (ex: +2250700000001)',
  })
  phoneNumber?: string;
}