import { Cache } from 'cache-manager';
import { IPaymentGateway, RateResponse } from '../../../shared/domain/gateways';
export interface GetRateInput {
    sourceCurrency: string;
    targetCurrency: string;
    amount: number;
    direction?: 'buy' | 'sell';
}
export declare class GetRateUseCase {
    private readonly paymentGateway;
    private readonly cacheManager;
    private readonly CACHE_TTL;
    constructor(paymentGateway: IPaymentGateway, cacheManager: Cache);
    execute(input: GetRateInput): Promise<RateResponse>;
}
