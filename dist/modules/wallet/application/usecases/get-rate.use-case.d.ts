import { IPaymentGateway, RateResponse } from '../../../shared/domain/gateways';
export interface GetRateInput {
    sourceCurrency: string;
    targetCurrency: string;
    amount: number;
    direction?: 'buy' | 'sell';
}
export declare class GetRateUseCase {
    private readonly paymentGateway;
    constructor(paymentGateway: IPaymentGateway);
    execute(input: GetRateInput): Promise<RateResponse>;
}
