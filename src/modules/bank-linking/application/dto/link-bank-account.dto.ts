import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

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
  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class WithdrawToBankDto {
  @IsNumber()
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;
}
