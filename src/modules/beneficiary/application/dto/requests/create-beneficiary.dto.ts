import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { BeneficiaryAccountType } from '../../../domain/entities/beneficiary.entity';

export class CreateBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  phoneE164?: string;

  @IsOptional()
  @IsEnum(BeneficiaryAccountType)
  accountType?: BeneficiaryAccountType;

  @IsOptional()
  @IsUUID()
  beneficiaryUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  beneficiaryWalletAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobileMoneyProvider?: string;
}
