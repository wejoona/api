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
var YellowCardOffRampAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YellowCardOffRampAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
const yellowcard_types_1 = require("../yellowcard.types");
let YellowCardOffRampAdapter = YellowCardOffRampAdapter_1 = class YellowCardOffRampAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(YellowCardOffRampAdapter_1.name);
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
            this.logger.log('Yellow Card Off-Ramp adapter initialized');
        }
    }
    async getChannels(country, _currency) {
        try {
            const response = await fetch(`${this.config.apiUrl}/channels?country=${country}&type=payout`, {
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
            const rate = rateData.sell;
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
    async initiateWithdrawal(data) {
        try {
            const destination = data.destination;
            const response = await fetch(`${this.config.apiUrl}/payouts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    channelId: data.channelId,
                    amount: data.amount,
                    currency: 'USDC',
                    destinationCurrency: data.targetCurrency,
                    destination: {
                        type: 'mobile_money',
                        network: destination.provider,
                        accountNumber: destination.phoneNumber,
                        accountName: destination.accountName,
                    },
                    reference: data.idempotencyKey,
                    metadata: data.metadata,
                }),
            });
            if (!response.ok) {
                const errorData = (await response.json());
                throw new Error(`Yellow Card API error: ${errorData.message}`);
            }
            const result = (await response.json());
            return this.mapPayoutToWithdrawal(result.data);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to initiate Yellow Card withdrawal: ${errorMessage}`);
            throw error;
        }
    }
    async getWithdrawalStatus(providerWithdrawalId) {
        try {
            const response = await fetch(`${this.config.apiUrl}/payouts/${providerWithdrawalId}`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to get withdrawal status');
            }
            const result = (await response.json());
            return this.mapPayoutToWithdrawal(result.data);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get Yellow Card withdrawal status: ${errorMessage}`);
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
            'payout.pending': 'withdrawal.pending',
            'payout.processing': 'withdrawal.pending',
            'payout.complete': 'withdrawal.completed',
            'payout.failed': 'withdrawal.failed',
        };
        const data = payload.data;
        return {
            type: typeMap[ycType] || 'withdrawal.pending',
            withdrawalId: data.id,
            data: data,
        };
    }
    mapPayoutToWithdrawal(payout) {
        const statusMap = {
            pending: 'pending',
            processing: 'processing',
            complete: 'completed',
            failed: 'failed',
            cancelled: 'cancelled',
        };
        return {
            providerId: payout.id,
            status: statusMap[payout.status] || 'pending',
            sourceAmount: payout.amount,
            sourceCurrency: payout.currency,
            targetAmount: payout.destinationAmount,
            targetCurrency: payout.destinationCurrency,
            rate: payout.rate,
            fee: payout.fee,
            destination: {
                provider: payout.destination.type,
                phoneNumber: payout.destination.accountNumber,
                accountName: payout.destination.accountName,
            },
            reference: payout.reference,
            errorMessage: payout.failureReason,
            createdAt: new Date(payout.createdAt),
            completedAt: payout.completedAt
                ? new Date(payout.completedAt)
                : undefined,
        };
    }
};
exports.YellowCardOffRampAdapter = YellowCardOffRampAdapter;
exports.YellowCardOffRampAdapter = YellowCardOffRampAdapter = YellowCardOffRampAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YellowCardOffRampAdapter);
//# sourceMappingURL=yellowcard-offramp.adapter.js.map