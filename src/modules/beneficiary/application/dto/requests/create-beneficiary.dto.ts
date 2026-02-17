import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BeneficiaryAccountType } from '../../../domain/entities/beneficiary.entity';

export class CreateBeneficiaryDto {
  @ApiProperty({ description: 'Display name for the beneficiary', example: 'Mamadou Diallo', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du bénéficiaire est requis' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  name: string;

  @ApiPropertyOptional({ description: 'Phone in E.164 format', example: '+2250701234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Le numéro de téléphone doit être au format international (ex: +2250701234567)',
  })
  phoneE164?: string;

  @ApiPropertyOptional({ description: 'Account type', enum: ['internal', 'external', 'bank', 'mobile_money'] })
  @IsOptional()
  @IsEnum(BeneficiaryAccountType, { message: 'Type de compte invalide' })
  accountType?: BeneficiaryAccountType;

  @ApiPropertyOptional({ description: 'Korido user ID if internal beneficiary' })
  @IsOptional()
  @IsUUID('4', { message: 'ID utilisateur invalide' })
  beneficiaryUserId?: string;

  @ApiPropertyOptional({ description: 'External wallet address', example: '0x742d35Cc...' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  beneficiaryWalletAddress?: string;

  @ApiPropertyOptional({ description: 'Bank code for bank transfers', example: 'SGBFCI' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankCode?: string;

  @ApiPropertyOptional({ description: 'Bank account number', example: 'CI12345678901234' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Mobile money provider code', example: 'OMCI' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobileMoneyProvider?: string;
}
