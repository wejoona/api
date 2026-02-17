import { IsNumber, IsString, IsIn, Min, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateWithdrawalDto {
  @ApiProperty({
    description: 'Withdrawal amount in USDC minor units (cents). Minimum 100 (= 1.00 USDC)',
    minimum: 100,
    example: 1000,
  })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(100, { message: 'Le montant minimum de retrait est de 100 (1.00 USDC)' })
  amount: number;

  @ApiProperty({
    description: 'Target currency for payout',
    enum: ['XOF'],
    example: 'XOF',
  })
  @IsString()
  @IsIn(['XOF'], { message: 'Devise de retrait non supportée. Devises disponibles: XOF' })
  currency: string;

  @ApiProperty({
    description: 'Payout provider code',
    example: 'OMCI',
    enum: ['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI'],
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code du fournisseur est requis' })
  @IsIn(['OMCI', 'MTNCI', 'MOOVCI', 'WAVECI'], {
    message: 'Fournisseur invalide. Options: OMCI, MTNCI, MOOVCI, WAVECI',
  })
  providerCode: string;

  @ApiProperty({
    description: 'Recipient phone number for MoMo payout (E.164 format)',
    example: '+2250700000001',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone du destinataire est requis' })
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Le numéro de téléphone doit être au format international (ex: +2250700000001)',
  })
  phoneNumber: string;
}
