import { IsNumber, Min, Max } from 'class-validator';

export class UpdateSpendingLimitDto {
  @IsNumber()
  @Min(10)
  @Max(10000)
  spendingLimit: number;
}
