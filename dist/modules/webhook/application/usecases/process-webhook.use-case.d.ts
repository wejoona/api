import { OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { IPaymentGateway } from '@modules/shared/domain/gateways/payment.gateway';
import { TransactionRepository } from '@modules/transaction/infrastructure/repositories/transaction.repository';
import { WalletRepository } from '@modules/wallet/infrastructure/repositories/wallet.repository';
import { IOnRampProvider } from '@modules/providers/interfaces';
export interface ProcessWebhookInput {
    payload: Record<string, unknown>;
    signature: string;
    rawBody: string;
    provider?: 'yellowcard' | 'circle' | 'generic';
}
export interface ProcessWebhookOutput {
    success: boolean;
    eventType: string;
    processed: boolean;
    message?: string;
}
export declare class ProcessWebhookUseCase implements OnModuleDestroy {
    private readonly paymentGateway;
    private readonly onRampProvider;
    private readonly transactionRepository;
    private readonly walletRepository;
    private readonly eventEmitter;
    private readonly configService;
    private readonly logger;
    private readonly circleWebhookSecret;
    private readonly redis;
    private isRedisConnected;
    constructor(paymentGateway: IPaymentGateway, onRampProvider: IOnRampProvider, transactionRepository: TransactionRepository, walletRepository: WalletRepository, eventEmitter: EventEmitter2, configService: ConfigService);
    onModuleDestroy(): Promise<void>;
    private checkIdempotency;
    private markAsProcessed;
    private verifyCircleSignature;
    execute(input: ProcessWebhookInput): Promise<ProcessWebhookOutput>;
    private processYellowCardWebhook;
    private processCircleWebhook;
    private processGenericWebhook;
    private handleYcDepositPending;
    private handleYcDepositCompleted;
    private handleYcDepositFailed;
    private handleYcDepositExpired;
    private handleCircleTransferComplete;
    private handleCircleTransferFailed;
    private handleCircleTransactionComplete;
    private handleCircleTransactionFailed;
    private handleCircleInboundComplete;
    private handleDepositPending;
    private handleDepositCompleted;
    private handleDepositFailed;
    private handleTransferPending;
    private handleTransferCompleted;
    private handleTransferFailed;
    private handleKycApproved;
    private handleKycRejected;
}
