import { IsNumber, IsOptional, Min } from 'class-validator';

export class PayPaymentLinkDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
