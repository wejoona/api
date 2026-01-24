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
var YellowCardOnRampAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YellowCardOnRampAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
const yellowcard_types_1 = require("../yellowcard.types");
let YellowCardOnRampAdapter = YellowCardOnRampAdapter_1 = class YellowCardOnRampAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(YellowCardOnRampAdapter_1.name);
        this.providerName = 'yellowcard';
        this.supportedCountries = Object.keys(yellowcard_types_1.YELLOWCARD_COUNTRIES);
        this.config = {
            apiUrl: this.configService.get('yellowCard.apiUrl') ||
                'https://sandbox.yellowcard.io',
            apiKey: this.configService.get('yellowCard.apiKey') || '',
            secretKey: this.configService.get('yellowCard.secretKey') || '',
            webhookSecret: this.configService.get('yellowCard.webhookSecret') || '',
            useMock: false,
        };
        if (!this.config.apiKey) {
            this.logger.warn('Yellow Card API key not configured');
        }
        else {
            this.logger.log('Yellow Card On-Ramp adapter initialized');
        }
    }
    async getChannels(country, _currency) {
        try {
            const response = await fetch(`${this.config.apiUrl}/channels?country=${country}&type=payment`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to get channels');
            }
            const result = (await response.json());
            const channels = result.data || [];
            return channels.map((ch) => ({
                id: ch.id,
                name: ch.name,
                type: ch.channelType,
                provider: ch.network,
                country: ch.country,
                currency: ch.currency,
                minAmount: ch.minAmount,
                maxAmount: ch.maxAmount,
                fee: ch.percentFee,
                feeType: 'percentage',
                estimatedTime: ch.estimatedSettlementTime,
                isActive: true,
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get Yellow Card channels: ${errorMessage}`);
            throw error;
        }
    }
    async getRate(sourceCurrency, targetCurrency, amount) {
        try {
            const response = await fetch(`${this.config.apiUrl}/rates?source=${sourceCurrency}&destination=${targetCurrency}`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to get rate');
            }
            const result = (await response.json());
            const rateData = result.data;
            const rate = rateData.buy;
            const fee = amount * 0.015;
            const targetAmount = (amount - fee) * rate;
            return {
                rate,
                sourceAmount: amount,
                targetAmount,
                fee,
                expiresAt: new Date(rateData.expiresAt),
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get Yellow Card rate: ${errorMessage}`);
            throw error;
        }
    }
    async initiateDeposit(data) {
        try {
            const response = await fetch(`${this.config.apiUrl}/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    channelId: data.channelId,
                    amount: data.amount,
                    currency: data.sourceCurrency,
                    destinationCurrency: data.targetCurrency,
                    destinationAddress: data.destinationWalletId,
                    customerPhone: data.customerPhone,
                    customerEmail: data.customerEmail,
                    reference: data.idempotencyKey,
                    metadata: data.metadata,
                }),
            });
            if (!response.ok) {
                const errorData = (await response.json());
                throw new Error(`Yellow Card API error: ${errorData.message}`);
            }
            const result = (await response.json());
            const payment = result.data;
            return this.mapPaymentToDeposit(payment);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to initiate Yellow Card deposit: ${errorMessage}`);
            throw error;
        }
    }
    async getDepositStatus(providerDepositId) {
        try {
            const response = await fetch(`${this.config.apiUrl}/payments/${providerDepositId}`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to get deposit status');
            }
            const result = (await response.json());
            return this.mapPaymentToDeposit(result.data);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get Yellow Card deposit status: ${errorMessage}`);
            throw error;
        }
    }
    verifyWebhookSignature(payload, signature) {
        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex');
        return signature === expectedSignature;
    }
    parseWebhookEvent(payload) {
        const ycType = payload.type;
        const typeMap = {
            'payment.pending': 'deposit.pending',
            'payment.awaiting_payment': 'deposit.pending',
            'payment.processing': 'deposit.pending',
            'payment.complete': 'deposit.completed',
            'payment.failed': 'deposit.failed',
            'payment.expired': 'deposit.expired',
        };
        const data = payload.data;
        return {
            type: typeMap[ycType] || 'deposit.pending',
            depositId: data.id,
            data: data,
        };
    }
    mapPaymentToDeposit(payment) {
        const statusMap = {
            pending: 'pending',
            awaiting_payment: 'awaiting_payment',
            processing: 'processing',
            complete: 'completed',
            failed: 'failed',
            expired: 'expired',
        };
        return {
            providerId: payment.id,
            status: statusMap[payment.status] || 'pending',
            amount: payment.amount,
            sourceCurrency: payment.currency,
            targetAmount: payment.destinationAmount,
            targetCurrency: payment.destinationCurrency,
            rate: payment.rate,
            fee: payment.fee,
            paymentInstructions: {
                type: payment.channel.type,
                provider: payment.channel.network,
                accountNumber: payment.paymentDetails.accountNumber,
                accountName: payment.paymentDetails.accountName,
                reference: payment.paymentDetails.reference,
                instructions: payment.paymentDetails.instructions,
                expiresAt: new Date(payment.paymentDetails.expiresAt),
            },
            createdAt: new Date(payment.createdAt),
            expiresAt: new Date(payment.paymentDetails.expiresAt),
            completedAt: payment.status === 'complete' ? new Date(payment.updatedAt) : undefined,
        };
    }
};
exports.YellowCardOnRampAdapter = YellowCardOnRampAdapter;
exports.YellowCardOnRampAdapter = YellowCardOnRampAdapter = YellowCardOnRampAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YellowCardOnRampAdapter);
//# sourceMappingURL=yellowcard-onramp.adapter.js.map