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
var MockYellowCardOnRampAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockYellowCardOnRampAdapter = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
let MockYellowCardOnRampAdapter = MockYellowCardOnRampAdapter_1 = class MockYellowCardOnRampAdapter {
    constructor() {
        this.logger = new common_1.Logger(MockYellowCardOnRampAdapter_1.name);
        this.providerName = 'yellowcard_mock';
        this.supportedCountries = [
            'CI',
            'SN',
            'ML',
            'BF',
            'BJ',
            'TG',
            'NE',
            'GW',
        ];
        this.channelsMockData = this.loadChannelsMockData();
        this.ratesMockData = this.loadRatesMockData();
        this.logger.warn('Yellow Card On-Ramp running in MOCK mode');
    }
    loadChannelsMockData() {
        try {
            const mockDataPath = path.join(__dirname, '../mock-data/yellowcard/channels.json');
            const data = fs.readFileSync(mockDataPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {
                CI: {
                    onramp: [
                        {
                            id: 'orange_ci_onramp',
                            name: 'Orange Money',
                            type: 'mobile_money',
                            provider: 'orange',
                            currency: 'XOF',
                            minAmount: 500,
                            maxAmount: 1000000,
                            fee: 1.5,
                            feeType: 'percentage',
                            estimatedTime: '5-15 minutes',
                            isActive: true,
                        },
                    ],
                },
            };
        }
    }
    loadRatesMockData() {
        try {
            const mockDataPath = path.join(__dirname, '../mock-data/yellowcard/rates.json');
            const data = fs.readFileSync(mockDataPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {
                XOF_USDC: {
                    rate: 0.00166,
                    fee: 1.5,
                    expiresInMinutes: 5,
                },
            };
        }
    }
    async getChannels(country, _currency) {
        const countryData = this.channelsMockData[country];
        if (!countryData?.onramp) {
            return [];
        }
        return countryData.onramp.map((ch) => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            provider: ch.provider,
            country,
            currency: ch.currency,
            minAmount: ch.minAmount,
            maxAmount: ch.maxAmount,
            fee: ch.fee,
            feeType: ch.feeType,
            estimatedTime: ch.estimatedTime,
            isActive: ch.isActive,
        }));
    }
    async getRate(_sourceCurrency, _targetCurrency, amount) {
        const rateData = this.ratesMockData.XOF_USDC;
        const fee = amount * (rateData.fee / 100);
        const targetAmount = (amount - fee) * rateData.rate;
        return {
            rate: rateData.rate,
            sourceAmount: amount,
            targetAmount: Math.round(targetAmount * 100) / 100,
            fee,
            expiresAt: new Date(Date.now() + rateData.expiresInMinutes * 60 * 1000),
        };
    }
    async initiateDeposit(data) {
        const providerId = `yc_pay_${(0, uuid_1.v4)().slice(0, 8)}`;
        const rateData = this.ratesMockData.XOF_USDC;
        const fee = data.amount * (rateData.fee / 100);
        const targetAmount = (data.amount - fee) * rateData.rate;
        this.logger.log(`[MOCK] Initiated deposit: ${providerId} for ${data.amount} ${data.sourceCurrency}`);
        return {
            providerId,
            status: 'awaiting_payment',
            amount: data.amount,
            sourceCurrency: data.sourceCurrency,
            targetAmount: Math.round(targetAmount * 100) / 100,
            targetCurrency: data.targetCurrency,
            rate: rateData.rate,
            fee,
            paymentInstructions: {
                type: 'mobile_money',
                provider: 'orange',
                accountNumber: '+2250700000000',
                accountName: 'JoonaPay',
                reference: `DEP-${providerId.slice(-8).toUpperCase()}`,
                instructions: `Send ${data.amount} XOF to +2250700000000 via Orange Money. Use reference: DEP-${providerId.slice(-8).toUpperCase()}`,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };
    }
    async getDepositStatus(providerDepositId) {
        return {
            providerId: providerDepositId,
            status: 'awaiting_payment',
            amount: 10000,
            sourceCurrency: 'XOF',
            targetAmount: 16.45,
            targetCurrency: 'USDC',
            rate: 0.00166,
            fee: 150,
            paymentInstructions: {
                type: 'mobile_money',
                provider: 'orange',
                reference: `DEP-${providerDepositId.slice(-8).toUpperCase()}`,
                instructions: 'Payment instructions',
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        };
    }
    verifyWebhookSignature(_payload, _signature) {
        return true;
    }
    parseWebhookEvent(payload) {
        const data = payload.data;
        return {
            type: 'deposit.pending',
            depositId: data?.id || 'mock_deposit_id',
            data: payload,
        };
    }
};
exports.MockYellowCardOnRampAdapter = MockYellowCardOnRampAdapter;
exports.MockYellowCardOnRampAdapter = MockYellowCardOnRampAdapter = MockYellowCardOnRampAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MockYellowCardOnRampAdapter);
//# sourceMappingURL=mock-yellowcard-onramp.adapter.js.map