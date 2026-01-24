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
var YellowCardPaymentAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YellowCardPaymentAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
let YellowCardPaymentAdapter = YellowCardPaymentAdapter_1 = class YellowCardPaymentAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(YellowCardPaymentAdapter_1.name);
        this.providerName = 'yellow_card';
        this.config = {
            apiUrl: this.configService.get('yellowCard.apiUrl') ||
                'https://sandbox.yellowcard.io',
            apiKey: this.configService.get('yellowCard.apiKey') || '',
            secretKey: this.configService.get('yellowCard.secretKey') || '',
            webhookSecret: this.configService.get('yellowCard.webhookSecret') || '',
            useMock: this.configService.get('yellowCard.useMock') ?? true,
        };
        if (this.config.useMock) {
            this.logger.warn('Payment Gateway running in MOCK mode (Yellow Card)');
        }
    }
    async createSubwallet(request) {
        if (this.config.useMock) {
            return this.mockCreateSubwallet(request);
        }
        return this.apiCreateSubwallet(request);
    }
    async getBalance(subwalletId) {
        if (this.config.useMock) {
            return this.mockGetBalance(subwalletId);
        }
        return this.apiGetBalance(subwalletId);
    }
    async getOnRampChannels(country, currency) {
        if (this.config.useMock) {
            return this.mockGetOnRampChannels(country, currency);
        }
        return this.apiGetOnRampChannels(country, currency);
    }
    async initiateDeposit(request) {
        if (this.config.useMock) {
            return this.mockInitiateDeposit(request);
        }
        return this.apiInitiateDeposit(request);
    }
    async getDepositStatus(depositId) {
        if (this.config.useMock) {
            return this.mockGetDepositStatus(depositId);
        }
        return this.apiGetDepositStatus(depositId);
    }
    async internalTransfer(request) {
        if (this.config.useMock) {
            return this.mockInternalTransfer(request);
        }
        return this.apiInternalTransfer(request);
    }
    async externalTransfer(request) {
        if (this.config.useMock) {
            return this.mockExternalTransfer(request);
        }
        return this.apiExternalTransfer(request);
    }
    async getTransferStatus(transferId) {
        if (this.config.useMock) {
            return this.mockGetTransferStatus(transferId);
        }
        return this.apiGetTransferStatus(transferId);
    }
    async getRate(request) {
        if (this.config.useMock) {
            return this.mockGetRate(request);
        }
        return this.apiGetRate(request);
    }
    async submitKyc(request) {
        if (this.config.useMock) {
            return this.mockSubmitKyc(request);
        }
        return this.apiSubmitKyc(request);
    }
    async getKycStatus(subwalletId) {
        if (this.config.useMock) {
            return this.mockGetKycStatus(subwalletId);
        }
        return this.apiGetKycStatus(subwalletId);
    }
    verifyWebhookSignature(payload, signature) {
        if (this.config.useMock) {
            return true;
        }
        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex');
        return signature === expectedSignature;
    }
    parseWebhookEvent(payload) {
        return {
            id: payload.id,
            type: this.mapWebhookEventType(payload.type),
            referenceId: payload.referenceId ||
                payload.resourceId ||
                payload.id,
            externalId: payload.id,
            data: payload.data || payload,
            createdAt: new Date(payload.createdAt || Date.now()),
        };
    }
    mapWebhookEventType(ycType) {
        const mapping = {
            'payment.pending': 'deposit.pending',
            'payment.completed': 'deposit.completed',
            'payment.failed': 'deposit.failed',
            'transfer.pending': 'transfer.pending',
            'transfer.completed': 'transfer.completed',
            'transfer.failed': 'transfer.failed',
            'kyc.approved': 'kyc.approved',
            'kyc.rejected': 'kyc.rejected',
        };
        return mapping[ycType] || ycType;
    }
    mockCreateSubwallet(request) {
        const id = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
            id,
            externalId: `yc_${id}`,
            userId: request.userId,
            address: `0x${this.generateMockAddress()}`,
            currency: 'USDC',
            createdAt: new Date(),
        };
    }
    mockGetBalance(subwalletId) {
        return {
            subwalletId,
            balances: [
                { currency: 'USD', available: 100.0, pending: 0, total: 100.0 },
                { currency: 'USDC', available: 100.0, pending: 0, total: 100.0 },
            ],
        };
    }
    mockGetOnRampChannels(country, _currency) {
        if (country === 'CI') {
            return [
                {
                    id: 'orange_money_ci',
                    name: 'Orange Money',
                    type: 'mobile_money',
                    provider: 'orange',
                    country: 'CI',
                    minAmount: 1000,
                    maxAmount: 500000,
                    fee: 1.5,
                    feeType: 'percentage',
                    currency: 'XOF',
                },
                {
                    id: 'wave_ci',
                    name: 'Wave',
                    type: 'mobile_money',
                    provider: 'wave',
                    country: 'CI',
                    minAmount: 500,
                    maxAmount: 1000000,
                    fee: 1.0,
                    feeType: 'percentage',
                    currency: 'XOF',
                },
                {
                    id: 'mtn_momo_ci',
                    name: 'MTN Mobile Money',
                    type: 'mobile_money',
                    provider: 'mtn',
                    country: 'CI',
                    minAmount: 1000,
                    maxAmount: 500000,
                    fee: 1.5,
                    feeType: 'percentage',
                    currency: 'XOF',
                },
            ];
        }
        return [];
    }
    mockInitiateDeposit(request) {
        const id = `dep_${Date.now()}`;
        const rate = 0.00166;
        const fee = request.amount * 0.015;
        return {
            id,
            externalId: `yc_${id}`,
            subwalletId: request.subwalletId,
            amount: request.amount,
            sourceCurrency: request.sourceCurrency,
            targetCurrency: request.targetCurrency || 'USD',
            rate,
            fee,
            status: 'pending',
            paymentInstructions: {
                type: 'mobile_money',
                provider: 'orange',
                accountNumber: '+2250700000000',
                accountName: 'USD Wallet',
                reference: `DEP-${id.slice(-8).toUpperCase()}`,
                instructions: `Send ${request.amount} ${request.sourceCurrency} to the number above with reference DEP-${id.slice(-8).toUpperCase()}`,
            },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };
    }
    mockGetDepositStatus(depositId) {
        return {
            id: depositId,
            externalId: `yc_${depositId}`,
            subwalletId: 'mock_wallet',
            amount: 10000,
            sourceCurrency: 'XOF',
            targetCurrency: 'USD',
            rate: 0.00166,
            fee: 150,
            status: 'pending',
            paymentInstructions: {
                type: 'mobile_money',
                provider: 'orange',
                reference: `DEP-${depositId.slice(-8).toUpperCase()}`,
                instructions: 'Payment instructions',
            },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };
    }
    mockInternalTransfer(request) {
        const id = `txn_${Date.now()}`;
        return {
            id,
            externalId: `yc_${id}`,
            type: 'internal',
            fromSubwalletId: request.fromSubwalletId,
            toSubwalletId: request.toSubwalletId,
            amount: request.amount,
            currency: request.currency,
            fee: 0,
            status: 'completed',
            createdAt: new Date(),
        };
    }
    mockExternalTransfer(request) {
        const id = `txn_${Date.now()}`;
        return {
            id,
            externalId: `yc_${id}`,
            type: 'external',
            fromSubwalletId: request.subwalletId,
            toAddress: request.toAddress,
            amount: request.amount,
            currency: request.currency,
            fee: 1.0,
            status: 'pending',
            createdAt: new Date(),
        };
    }
    mockGetTransferStatus(transferId) {
        return {
            id: transferId,
            externalId: `yc_${transferId}`,
            type: 'external',
            fromSubwalletId: 'mock_wallet',
            toAddress: '0x...',
            amount: 50,
            currency: 'USD',
            fee: 1.0,
            status: 'pending',
            createdAt: new Date(),
        };
    }
    mockGetRate(request) {
        let rate = 1;
        if (request.sourceCurrency === 'XOF' && request.targetCurrency === 'USD') {
            rate = 0.00166;
        }
        else if (request.sourceCurrency === 'USD' &&
            request.targetCurrency === 'XOF') {
            rate = 602.41;
        }
        return {
            sourceCurrency: request.sourceCurrency,
            targetCurrency: request.targetCurrency,
            rate,
            sourceAmount: request.amount,
            targetAmount: request.amount * rate,
            fee: request.amount * 0.015,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        };
    }
    mockSubmitKyc(request) {
        return {
            id: `kyc_${Date.now()}`,
            subwalletId: request.subwalletId,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    mockGetKycStatus(subwalletId) {
        return {
            id: `kyc_${subwalletId}`,
            subwalletId,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    generateMockAddress() {
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < 40; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }
    apiCreateSubwallet(_request) {
        return Promise.reject(new Error('Real Yellow Card API not implemented. Set YELLOW_CARD_USE_MOCK=true'));
    }
    apiGetBalance(_subwalletId) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiGetOnRampChannels(_country, _currency) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiInitiateDeposit(_request) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiGetDepositStatus(_depositId) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiInternalTransfer(_request) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiExternalTransfer(_request) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiGetTransferStatus(_transferId) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiGetRate(_request) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiSubmitKyc(_request) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
    apiGetKycStatus(_subwalletId) {
        return Promise.reject(new Error('Real Yellow Card API not implemented'));
    }
};
exports.YellowCardPaymentAdapter = YellowCardPaymentAdapter;
exports.YellowCardPaymentAdapter = YellowCardPaymentAdapter = YellowCardPaymentAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YellowCardPaymentAdapter);
//# sourceMappingURL=yellow-card.adapter.js.map