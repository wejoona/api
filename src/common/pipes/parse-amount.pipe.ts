import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseAmountPipe implements PipeTransform<string | number, number> {
  private readonly maxAmount: number;

  constructor(maxAmount = 10_000_000) {
    this.maxAmount = maxAmount;
  }

  transform(value: string | number): number {
    const amount = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(amount) || !isFinite(amount)) throw new BadRequestException('Invalid amount');
    if (amount <= 0) throw new BadRequestException('Amount must be greater than 0');
    if (amount > this.maxAmount) throw new BadRequestException(`Amount exceeds maximum (${this.maxAmount})`);
    return Math.round(amount * 100) / 100;
  }
}
