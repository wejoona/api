import { YellowCardAuthService } from './yellow-card-auth.service';
import { YellowCardRatesService } from './yellow-card-rates.service';
import { YellowCardPaymentsService } from './yellow-card-payments.service';
import { YellowCardChannelsService } from './yellow-card-channels.service';
import { YellowCardWebhooksService } from './yellow-card-webhooks.service';
import { CreateSubwalletRequest, SubwalletResponse, InitiateDepositRequest, DepositResponse, InternalTransferRequest, ExternalTransferRequest, TransferResponse, BalanceResponse, OnRampChannel, RateRequest, RateResponse } from './yellow-card.types';
export declare class YellowCardService {
    private readonly authService;
    private readonly ratesService;
    private readonly paymentsService;
    private readonly channelsService;
    private readonly webhooksService;
    private readonly logger;
    constructor(authService: YellowCardAuthService, ratesService: YellowCardRatesService, paymentsService: YellowCardPaymentsService, channelsService: YellowCardChannelsService, webhooksService: YellowCardWebhooksService);
    createSubwallet(request: CreateSubwalletRequest): Promise<SubwalletResponse>;
    getBalance(subwalletId: string): Promise<BalanceResponse>;
    getOnRampChannels(country: string): Promise<OnRampChannel[]>;
    initiateDeposit(request: InitiateDepositRequest): Promise<DepositResponse>;
    internalTransfer(request: InternalTransferRequest): Promise<TransferResponse>;
    externalTransfer(request: ExternalTransferRequest): Promise<TransferResponse>;
    getRate(request: RateRequest): Promise<RateResponse>;
    verifyWebhookSignature(payload: string, signature: string): boolean;
}
