import { Injectable, Inject } from '@nestjs/common';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  RateResponse,
} from '../../../shared/domain/gateways';

export interface GetRateInput {
  sourceCurrency: string;
  targetCurrency: string;
  amount: number;
  direction?: 'buy' | 'sell';
}

@Injectable()
export class GetRateUseCase {
  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(input: GetRateInput): Promise<RateResponse> {
    return this.paymentGateway.getRate({
      sourceCurrency: input.sourceCurrency,
      targetCurrency: input.targetCurrency,
      amount: input.amount,
      direction: input.direction || 'buy',
    });
  }
}
