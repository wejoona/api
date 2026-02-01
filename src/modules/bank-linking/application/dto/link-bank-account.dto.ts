import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LinkBankAccountDto {
  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsString()
  @IsNotEmpty()
  account_holder_name: string;

  @IsOptional()
  @IsString()
  country_code?: string;
}

export class VerifyBankAccountDto {
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class DepositFromBankDto {
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class WithdrawToBankDto {
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
