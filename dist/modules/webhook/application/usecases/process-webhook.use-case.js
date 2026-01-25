"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProcessWebhookUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessWebhookUseCase = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
const ioredis_1 = require("ioredis");
const payment_gateway_1 = require("../../../shared/domain/gateways/payment.gateway");
const transaction_repository_1 = require("../../../transaction/infrastructure/repositories/transaction.repository");
const wallet_repository_1 = require("../../../wallet/infrastructure/repositories/wallet.repository");
const interfaces_1 = require("../../../providers/interfaces");
const webhook_deadletter_service_1 = require("../domain/services/webhook-deadletter.service");
const services_1 = require("../../../shared/infrastructure/services");
let ProcessWebhookUseCase = ProcessWebhookUseCase_1 = class ProcessWebhookUseCase {
    constructor(paymentGateway, onRampProvider, transactionRepository, walletRepository, eventEmitter, configService, deadLetterService, cacheInvalidationService) {
        this.paymentGateway = paymentGateway;
        this.onRampProvider = onRampProvider;
        this.transactionRepository = transactionRepository;
        this.walletRepository = walletRepository;
        this.eventEmitter = eventEmitter;
        this.configService = configService;
        this.deadLetterService = deadLetterService;
        this.cacheInvalidationService = cacheInvalidationService;
        this.logger = new common_1.Logger(ProcessWebhookUseCase_1.name);
        this.isRedisConnected = false;
        this.circleWebhookSecret = this.configService.get('circle.webhookSecret', '');
        this.redis = new ioredis_1.default({
            host: this.configService.get('redis.host'),
            port: this.configService.get('redis.port'),
            password: this.configService.get('redis.password'),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                this.logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });
        this.redis.on('connect', () => {
            this.isRedisConnected = true;
            this.logger.log('Redis connected successfully for webhook processing');
        });
        this.redis.on('error', (error) => {
            this.isRedisConnected = false;
            this.logger.error(`Redis connection error: ${error.message}`);
        });
        this.redis.on('close', () => {
            this.isRedisConnected = false;
            this.logger.warn('Redis connection closed');
        });
    }
    async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit();
            this.logger.log('Redis connection closed gracefully');
        }
    }
    async checkIdempotency(webhookId) {
        if (!this.isRedisConnected) {
            this.logger.warn('Redis unavailable, skipping idempotency check');
            return false;
        }
        const key = `webhook:processed:${webhookId}`;
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
    async markAsProcessed(webhookId) {
        if (!this.isRedisConnected) {
            this.logger.warn('Redis unavailable, skipping idempotency mark');
            return;
        }
        const key = `webhook:processed:${webhookId}`;
        const ttl = 86400;
        await this.redis.setex(key, ttl, new Date().toISOString());
    }
    verifyCircleSignature(rawBody, signature) {
        if (!this.circleWebhookSecret) {
            this.logger.error('Circle webhook secret not configured');
            throw new Error('Circle webhook secret not configured');
        }
        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.circleWebhookSecret)
                .update(rawBody)
                .digest('hex');
            const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
            if (!isValid) {
                throw new Error('Invalid Circle webhook signature');
            }
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Circle webhook signature verification failed: ${errorMessage}`);
            throw new Error('Invalid webhook signature');
        }
    }
    async execute(input) {
        const provider = input.provider || 'generic';
        switch (provider) {
            case 'yellowcard':
                return this.processYellowCardWebhook(input);
            case 'circle':
                return this.processCircleWebhook(input);
            default:
                return this.processGenericWebhook(input);
        }
    }
    async processYellowCardWebhook(input) {
        try {
            this.onRampProvider.verifyWebhookSignature(input.rawBody, input.signature);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Invalid Yellow Card webhook signature: ${errorMessage}`);
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const event = this.onRampProvider.parseWebhookEvent(input.payload);
        const webhookId = `yellowcard:${event.depositId}:${event.type}`;
        this.logger.log(`Yellow Card webhook: ${event.type} for deposit ${event.depositId}`);
        const alreadyProcessed = await this.checkIdempotency(webhookId);
        if (alreadyProcessed) {
            this.logger.log(`Webhook ${webhookId} already processed, skipping duplicate`);
            return {
                success: true,
                eventType: event.type,
                processed: false,
                message: 'Already processed',
            };
        }
        try {
            switch (event.type) {
                case 'deposit.pending':
                    await this.handleYcDepositPending(event.depositId, event.data);
                    break;
                case 'deposit.completed':
                    await this.handleYcDepositCompleted(event.depositId, event.data);
                    break;
                case 'deposit.failed':
                    await this.handleYcDepositFailed(event.depositId, event.data);
                    break;
                case 'deposit.expired':
                    await this.handleYcDepositExpired(event.depositId);
                    break;
                case 'withdrawal.pending':
                    await this.handleYcWithdrawalPending(event.depositId, event.data);
                    break;
                case 'withdrawal.completed':
                    await this.handleYcWithdrawalCompleted(event.depositId, event.data);
                    break;
                case 'withdrawal.failed':
                    await this.handleYcWithdrawalFailed(event.depositId, event.data);
                    break;
                default: {
                    const unhandledType = event.type;
                    this.logger.warn(`Unhandled Yellow Card event: ${unhandledType}`);
                    return {
                        success: true,
                        eventType: unhandledType,
                        processed: false,
                        message: 'Event type not handled',
                    };
                }
            }
            await this.markAsProcessed(webhookId);
            return { success: true, eventType: event.type, processed: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing Yellow Card webhook: ${errorMessage}`, errorStack);
            await this.deadLetterService.log({
                provider: 'yellowcard',
                eventType: event.type,
                webhookId,
                payload: input.payload,
                error: error instanceof Error ? error : new Error(errorMessage),
            });
            throw error;
        }
    }
    async processCircleWebhook(input) {
        try {
            this.verifyCircleSignature(input.rawBody, input.signature);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Invalid Circle webhook signature: ${errorMessage}`);
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const payload = input.payload;
        const notificationType = payload.notificationType;
        const webhookData = payload.transfer || payload.transaction || payload.inboundTransfer || payload;
        const entityId = webhookData?.id || 'unknown';
        const webhookId = `circle:${entityId}:${notificationType}`;
        this.logger.log(`Circle webhook: ${notificationType}`);
        const alreadyProcessed = await this.checkIdempotency(webhookId);
        if (alreadyProcessed) {
            this.logger.log(`Webhook ${webhookId} already processed, skipping duplicate`);
            return {
                success: true,
                eventType: notificationType,
                processed: false,
                message: 'Already processed',
            };
        }
        try {
            switch (notificationType) {
                case 'transfers.complete':
                    this.handleCircleTransferComplete(payload);
                    break;
                case 'transfers.failed':
                    this.handleCircleTransferFailed(payload);
                    break;
                case 'transactions.complete':
                    this.handleCircleTransactionComplete(payload);
                    break;
                case 'transactions.failed':
                    this.handleCircleTransactionFailed(payload);
                    break;
                case 'inboundTransfers.complete':
                    await this.handleCircleInboundComplete(payload);
                    break;
                default:
                    this.logger.warn(`Unhandled Circle notification type: ${notificationType}`);
                    return {
                        success: true,
                        eventType: notificationType,
                        processed: false,
                        message: 'Notification type not handled',
                    };
            }
            await this.markAsProcessed(webhookId);
            return { success: true, eventType: notificationType, processed: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing Circle webhook: ${errorMessage}`, errorStack);
            await this.deadLetterService.log({
                provider: 'circle',
                eventType: notificationType,
                webhookId,
                payload: input.payload,
                error: error instanceof Error ? error : new Error(errorMessage),
            });
            throw error;
        }
    }
    async processGenericWebhook(input) {
        const isValid = this.paymentGateway.verifyWebhookSignature(input.rawBody, input.signature);
        if (!isValid) {
            this.logger.warn('Invalid webhook signature received');
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        const event = this.paymentGateway.parseWebhookEvent(input.payload);
        const webhookId = `generic:${event.referenceId}:${event.type}`;
        this.logger.log(`Processing webhook event: ${event.type} for reference: ${event.referenceId}`);
        const alreadyProcessed = await this.checkIdempotency(webhookId);
        if (alreadyProcessed) {
            this.logger.log(`Webhook ${webhookId} already processed, skipping duplicate`);
            return {
                success: true,
                eventType: event.type,
                processed: false,
                message: 'Already processed',
            };
        }
        try {
            switch (event.type) {
                case 'deposit.pending':
                    await this.handleDepositPending(event);
                    break;
                case 'deposit.completed':
                    await this.handleDepositCompleted(event);
                    break;
                case 'deposit.failed':
                    await this.handleDepositFailed(event);
                    break;
                case 'transfer.pending':
                    await this.handleTransferPending(event);
                    break;
                case 'transfer.completed':
                    await this.handleTransferCompleted(event);
                    break;
                case 'transfer.failed':
                    await this.handleTransferFailed(event);
                    break;
                case 'kyc.approved':
                    await this.handleKycApproved(event);
                    break;
                case 'kyc.rejected':
                    await this.handleKycRejected(event);
                    break;
                default: {
                    const unhandledType = event.type;
                    this.logger.warn(`Unhandled webhook event type: ${unhandledType}`);
                    return {
                        success: true,
                        eventType: unhandledType,
                        processed: false,
                        message: 'Event type not handled',
                    };
                }
            }
            await this.markAsProcessed(webhookId);
            return { success: true, eventType: event.type, processed: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing webhook: ${errorMessage}`, errorStack);
            await this.deadLetterService.log({
                provider: 'generic',
                eventType: event.type,
                webhookId,
                payload: input.payload,
                error: error instanceof Error ? error : new Error(errorMessage),
            });
            throw error;
        }
    }
    async handleYcDepositPending(depositId, _data) {
        const transaction = await this.transactionRepository.findByProviderRef(depositId);
        if (transaction) {
            transaction.updateStatus('processing');
            await this.transactionRepository.save(transaction);
            this.logger.log(`YC Deposit ${depositId} now processing`);
        }
    }
    async handleYcDepositCompleted(depositId, data) {
        const transaction = await this.transactionRepository.findByProviderRef(depositId);
        if (!transaction) {
            this.logger.warn(`Transaction not found for YC deposit: ${depositId}`);
            return;
        }
        transaction.complete();
        await this.transactionRepository.save(transaction);
        const wallet = await this.walletRepository.findById(transaction.walletId);
        if (wallet?.userId) {
            const targetAmount = typeof data.targetAmount === 'number' ||
                typeof data.targetAmount === 'string'
                ? String(data.targetAmount)
                : String(transaction.amount);
            const feeAmount = typeof data.fee === 'number' || typeof data.fee === 'string'
                ? String(data.fee)
                : '0';
            this.eventEmitter.emit('webhook.deposit.completed', {
                userId: wallet.userId,
                walletId: wallet.id,
                amount: targetAmount,
                fee: feeAmount,
                currency: 'USDC',
                externalId: depositId,
                provider: 'yellowcard',
            });
            this.eventEmitter.emit('deposit.completed', {
                userId: wallet.userId,
                amount: targetAmount,
                currency: 'USDC',
                reference: depositId,
            });
            await this.cacheInvalidationService.invalidateBalance(wallet.userId);
        }
        this.logger.log(`YC Deposit ${depositId} completed`);
    }
    async handleYcDepositFailed(depositId, data) {
        const transaction = await this.transactionRepository.findByProviderRef(depositId);
        if (transaction) {
            const reason = typeof data.reason === 'string' ? data.reason : 'Deposit failed';
            transaction.fail(reason);
            await this.transactionRepository.save(transaction);
            const wallet = await this.walletRepository.findById(transaction.walletId);
            if (wallet?.userId) {
                this.eventEmitter.emit('deposit.failed', {
                    userId: wallet.userId,
                    amount: String(transaction.amount),
                    currency: 'USDC',
                    reference: depositId,
                    error: reason,
                });
            }
            this.logger.log(`YC Deposit ${depositId} failed`);
        }
    }
    async handleYcDepositExpired(depositId) {
        const transaction = await this.transactionRepository.findByProviderRef(depositId);
        if (transaction) {
            transaction.fail('Deposit expired');
            await this.transactionRepository.save(transaction);
            this.logger.log(`YC Deposit ${depositId} expired`);
        }
    }
    async handleYcWithdrawalPending(withdrawalId, _data) {
        const transaction = await this.transactionRepository.findByProviderRef(withdrawalId);
        if (transaction) {
            transaction.updateStatus('processing');
            await this.transactionRepository.save(transaction);
            this.logger.log(`YC Withdrawal ${withdrawalId} now processing`);
        }
    }
    async handleYcWithdrawalCompleted(withdrawalId, data) {
        const transaction = await this.transactionRepository.findByProviderRef(withdrawalId);
        if (!transaction) {
            this.logger.warn(`Transaction not found for YC withdrawal: ${withdrawalId}`);
            return;
        }
        transaction.complete();
        await this.transactionRepository.save(transaction);
        const wallet = await this.walletRepository.findById(transaction.walletId);
        if (wallet?.userId) {
            this.eventEmitter.emit('webhook.withdrawal.completed', {
                userId: wallet.userId,
                walletId: wallet.id,
                withdrawalId,
                amount: String(transaction.amount),
                reference: `withdrawal-${withdrawalId}`,
                provider: 'yellowcard',
                data,
            });
            this.eventEmitter.emit('withdrawal.completed', {
                userId: wallet.userId,
                amount: String(transaction.amount),
                currency: 'USDC',
                reference: withdrawalId,
            });
            await this.cacheInvalidationService.invalidateBalance(wallet.userId);
        }
        this.logger.log(`YC Withdrawal ${withdrawalId} completed`);
    }
    async handleYcWithdrawalFailed(withdrawalId, data) {
        const transaction = await this.transactionRepository.findByProviderRef(withdrawalId);
        if (!transaction) {
            this.logger.warn(`Transaction not found for failed YC withdrawal: ${withdrawalId}`);
            return;
        }
        const reason = typeof data.reason === 'string' ? data.reason : 'Withdrawal failed';
        transaction.fail(reason);
        await this.transactionRepository.save(transaction);
        const wallet = await this.walletRepository.findById(transaction.walletId);
        if (wallet?.userId) {
            this.eventEmitter.emit('webhook.withdrawal.failed', {
                userId: wallet.userId,
                walletId: wallet.id,
                withdrawalId,
                amount: String(transaction.amount),
                reference: `withdrawal-${withdrawalId}`,
                provider: 'yellowcard',
                reason,
            });
            this.eventEmitter.emit('withdrawal.failed', {
                userId: wallet.userId,
                amount: String(transaction.amount),
                currency: 'USDC',
                reference: withdrawalId,
                error: reason,
            });
        }
        this.logger.log(`YC Withdrawal ${withdrawalId} failed: ${reason}`);
    }
    handleCircleTransferComplete(payload) {
        const transfer = payload.transfer;
        const transferId = transfer?.id;
        if (transferId) {
            this.eventEmitter.emit('webhook.transfer.completed', {
                transferId,
                provider: 'circle',
                txHash: transfer.transactionHash,
            });
            this.logger.log(`Circle transfer ${transferId} completed`);
        }
    }
    handleCircleTransferFailed(payload) {
        const transfer = payload.transfer;
        const transferId = transfer?.id;
        const errorCode = transfer?.errorCode;
        if (transferId) {
            this.eventEmitter.emit('webhook.transfer.failed', {
                transferId,
                provider: 'circle',
                errorCode,
                errorMessage: `Transfer failed: ${errorCode || 'unknown'}`,
            });
            this.logger.log(`Circle transfer ${transferId} failed: ${errorCode || 'unknown'}`);
        }
    }
    handleCircleTransactionComplete(payload) {
        const transaction = payload.transaction;
        const txHash = typeof transaction?.txHash === 'string' ? transaction.txHash : 'unknown';
        this.logger.log(`Circle on-chain transaction completed: ${txHash}`);
    }
    handleCircleTransactionFailed(payload) {
        const transaction = payload.transaction;
        const txId = typeof transaction?.id === 'string' ? transaction.id : 'unknown';
        this.logger.log(`Circle on-chain transaction failed: ${txId}`);
    }
    async handleCircleInboundComplete(payload) {
        const inbound = payload.inboundTransfer;
        const walletId = inbound?.destinationWalletId;
        const amount = inbound?.amount;
        this.logger.log(`Circle inbound transfer to wallet ${walletId}: ${amount} USDC`);
        const wallet = await this.walletRepository.findByProviderWalletId(walletId);
        if (wallet?.userId) {
            this.eventEmitter.emit('webhook.deposit.completed', {
                userId: wallet.userId,
                walletId: wallet.id,
                amount,
                currency: 'USDC',
                externalId: inbound?.id,
                provider: 'circle',
            });
            this.eventEmitter.emit('deposit.completed', {
                userId: wallet.userId,
                amount: String(amount),
                currency: 'USDC',
                reference: inbound?.id || 'circle_inbound',
            });
            await this.cacheInvalidationService.invalidateBalance(wallet.userId);
        }
    }
    async handleDepositPending(event) {
        const transaction = await this.transactionRepository.findByProviderRef(event.referenceId);
        if (transaction) {
            transaction.updateStatus('processing');
            await this.transactionRepository.save(transaction);
        }
    }
    async handleDepositCompleted(event) {
        const transaction = await this.transactionRepository.findByProviderRef(event.referenceId);
        if (transaction) {
            transaction.complete();
            await this.transactionRepository.save(transaction);
            const wallet = await this.walletRepository.findById(transaction.walletId);
            if (wallet && event.data?.amount) {
                wallet.credit(Number(event.data.amount));
                await this.walletRepository.save(wallet);
                if (wallet.userId) {
                    await this.cacheInvalidationService.invalidateBalance(wallet.userId);
                }
            }
        }
    }
    async handleDepositFailed(event) {
        const transaction = await this.transactionRepository.findByProviderRef(event.referenceId);
        if (transaction) {
            transaction.fail(event.data?.reason || 'Payment failed');
            await this.transactionRepository.save(transaction);
        }
    }
    async handleTransferPending(event) {
        const transaction = await this.transactionRepository.findByProviderRef(event.referenceId);
        if (transaction) {
            transaction.updateStatus('processing');
            await this.transactionRepository.save(transaction);
        }
    }
    async handleTransferCompleted(event) {
        const transaction = await this.transactionRepository.findByProviderRef(event.referenceId);
        if (transaction) {
            transaction.complete();
            await this.transactionRepository.save(transaction);
        }
    }
    async handleTransferFailed(event) {
        const transaction = await this.transactionRepository.findByProviderRef(event.referenceId);
        if (transaction) {
            transaction.fail(event.data?.reason || 'Transfer failed');
            await this.transactionRepository.save(transaction);
            const wallet = await this.walletRepository.findById(transaction.walletId);
            if (wallet) {
                wallet.credit(transaction.amount);
                await this.walletRepository.save(wallet);
            }
        }
    }
    async handleKycApproved(event) {
        const wallet = await this.walletRepository.findByProviderWalletId(event.referenceId);
        if (wallet) {
            wallet.updateKycStatus('verified');
            await this.walletRepository.save(wallet);
        }
    }
    async handleKycRejected(event) {
        const wallet = await this.walletRepository.findByProviderWalletId(event.referenceId);
        if (wallet) {
            wallet.updateKycStatus('rejected');
            await this.walletRepository.save(wallet);
        }
    }
};
exports.ProcessWebhookUseCase = ProcessWebhookUseCase;
exports.ProcessWebhookUseCase = ProcessWebhookUseCase = ProcessWebhookUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(payment_gateway_1.PAYMENT_GATEWAY)),
    __param(1, (0, common_1.Inject)(interfaces_1.ONRAMP_PROVIDER_CI)),
    __metadata("design:paramtypes", [Object, Object, transaction_repository_1.TransactionRepository,
        wallet_repository_1.WalletRepository,
        event_emitter_1.EventEmitter2,
        config_1.ConfigService,
        webhook_deadletter_service_1.WebhookDeadletterService,
        services_1.CacheInvalidationService])
], ProcessWebhookUseCase);
//# sourceMappingURL=process-webhook.use-case.js.map