import { IsNumber, Min } from 'class-validator';

export class DepositToSavingsPotDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class WithdrawFromSavingsPotDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;
}
