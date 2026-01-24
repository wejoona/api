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
var YellowCardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YellowCardService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
let YellowCardService = YellowCardService_1 = class YellowCardService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(YellowCardService_1.name);
        this.config = {
            apiUrl: this.configService.get('yellowCard.apiUrl'),
            apiKey: this.configService.get('yellowCard.apiKey'),
            secretKey: this.configService.get('yellowCard.secretKey'),
            webhookSecret: this.configService.get('yellowCard.webhookSecret'),
            useMock: this.configService.get('yellowCard.useMock'),
        };
        if (this.config.useMock) {
            this.logger.warn('Yellow Card service running in MOCK mode');
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
    async getOnRampChannels(country) {
        if (this.config.useMock) {
            return this.mockGetOnRampChannels(country);
        }
        return this.apiGetOnRampChannels(country);
    }
    async initiateDeposit(request) {
        if (this.config.useMock) {
            return this.mockInitiateDeposit(request);
        }
        return this.apiInitiateDeposit(request);
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
    async getRate(request) {
        if (this.config.useMock) {
            return this.mockGetRate(request);
        }
        return this.apiGetRate(request);
    }
    verifyWebhookSignature(payload, signature) {
        if (this.config.useMock) {
            return true;
        }
        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret || '')
            .update(payload)
            .digest('hex');
        return signature === expectedSignature;
    }
    mockCreateSubwallet(request) {
        const id = `mock_wallet_${Date.now()}`;
        return {
            id,
            name: request.name,
            email: request.email || null,
            country: request.country,
            phone: request.phone || null,
            address: `0x${this.generateMockAddress()}`,
            balance: 0,
            currency: 'USDC',
            createdAt: new Date().toISOString(),
        };
    }
    mockGetBalance(subwalletId) {
        return {
            subwalletId,
            balances: [
                {
                    currency: 'USD',
                    available: 100.0,
                    pending: 0,
                    total: 100.0,
                },
                {
                    currency: 'USDC',
                    available: 100.0,
                    pending: 0,
                    total: 100.0,
                },
            ],
        };
    }
    mockGetOnRampChannels(country) {
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
                },
            ];
        }
        return [];
    }
    mockInitiateDeposit(request) {
        const id = `mock_deposit_${Date.now()}`;
        const rate = 0.00166;
        return {
            id,
            subwalletId: request.subwalletId,
            amount: request.amount,
            sourceCurrency: request.sourceCurrency,
            targetCurrency: 'USD',
            rate,
            fee: request.amount * 0.015,
            targetAmount: request.amount * rate,
            status: 'pending',
            paymentInstructions: {
                type: 'mobile_money',
                provider: 'orange',
                accountNumber: '+2250700000000',
                accountName: 'JoonaPay USD Wallet',
                reference: `DEP-${id.slice(-8).toUpperCase()}`,
                instructions: `Send ${request.amount} ${request.sourceCurrency} to the number above with reference ${id.slice(-8).toUpperCase()}`,
            },
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
    }
    mockInternalTransfer(request) {
        const id = `mock_transfer_${Date.now()}`;
        return {
            id,
            type: 'internal',
            fromSubwalletId: request.fromSubwalletId,
            toSubwalletId: request.toSubwalletId,
            amount: request.amount,
            currency: request.currency,
            fee: 0,
            status: 'completed',
            createdAt: new Date().toISOString(),
        };
    }
    mockExternalTransfer(request) {
        const id = `mock_transfer_${Date.now()}`;
        return {
            id,
            type: 'external',
            fromSubwalletId: request.subwalletId,
            toAddress: request.toAddress,
            amount: request.amount,
            currency: request.currency,
            fee: 1.0,
            status: 'pending',
            createdAt: new Date().toISOString(),
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
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
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
    generateSignature(method, path, timestamp, body) {
        const message = body
            ? `${timestamp}${method}${path}${body}`
            : `${timestamp}${method}${path}`;
        return crypto
            .createHmac('sha256', this.config.secretKey || '')
            .update(message)
            .digest('hex');
    }
    async makeRequest(method, path, body) {
        const timestamp = new Date().toISOString();
        const bodyStr = body ? JSON.stringify(body) : undefined;
        const signature = this.generateSignature(method, path, timestamp, bodyStr);
        const headers = {
            'Content-Type': 'application/json',
            'X-YC-Timestamp': timestamp,
            Authorization: `YcHmacV1 ${this.config.apiKey}:${signature}`,
        };
        const url = `${this.config.apiUrl}${path}`;
        try {
            const response = await fetch(url, {
                method,
                headers,
                body: bodyStr,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message ||
                    `HTTP ${response.status}`;
                this.logger.error(`Yellow Card API error: ${errorMessage}`);
                throw new Error(`Yellow Card API error: ${errorMessage}`);
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Yellow Card')) {
                throw error;
            }
            this.logger.error(`Yellow Card request failed: ${error}`);
            throw new Error(`Yellow Card API request failed: ${error}`);
        }
    }
    async apiCreateSubwallet(request) {
        this.logger.log(`Creating subwallet for ${request.name} in ${request.country}`);
        const response = await this.makeRequest('POST', '/business/subwallets', {
            name: request.name,
            email: request.email,
            country: request.country,
            phone: request.phone,
        });
        return {
            id: response.data.id,
            name: response.data.name,
            email: response.data.email || null,
            country: response.data.country,
            phone: response.data.phone || null,
            address: response.data.walletAddress,
            balance: response.data.balance,
            currency: response.data.currency,
            createdAt: response.data.createdAt,
        };
    }
    async apiGetBalance(subwalletId) {
        this.logger.debug(`Getting balance for subwallet ${subwalletId}`);
        const response = await this.makeRequest('GET', `/business/subwallets/${subwalletId}/balances`);
        return {
            subwalletId,
            balances: response.data.balances.map((b) => ({
                currency: b.currency,
                available: b.available,
                pending: b.pending,
                total: b.total,
            })),
        };
    }
    async apiGetOnRampChannels(country) {
        this.logger.debug(`Getting on-ramp channels for ${country}`);
        const response = await this.makeRequest('GET', `/business/channels?country=${country}&type=payment`);
        return response.data.map((ch) => ({
            id: ch.id,
            name: ch.name,
            type: ch.channelType,
            provider: ch.network,
            country: ch.country,
            minAmount: ch.minAmount,
            maxAmount: ch.maxAmount,
            fee: ch.percentFee,
            feeType: ch.flatFee > 0 ? 'fixed' : 'percentage',
        }));
    }
    async apiInitiateDeposit(request) {
        this.logger.log(`Initiating deposit: ${request.amount} ${request.sourceCurrency} to ${request.subwalletId}`);
        const response = await this.makeRequest('POST', '/business/payments', {
            subwalletId: request.subwalletId,
            amount: request.amount,
            currency: request.sourceCurrency,
            channelId: request.channelId,
            customerPhone: request.customerPhone,
        });
        const payment = response.data;
        return {
            id: payment.id,
            subwalletId: payment.subwalletId,
            amount: payment.amount,
            sourceCurrency: payment.currency,
            targetCurrency: payment.destinationCurrency,
            rate: payment.rate,
            fee: payment.fee,
            targetAmount: payment.destinationAmount,
            status: payment.status,
            paymentInstructions: {
                type: payment.paymentDetails.type,
                provider: payment.paymentDetails.network,
                accountNumber: payment.paymentDetails.accountNumber,
                accountName: payment.paymentDetails.accountName,
                reference: payment.paymentDetails.reference,
                instructions: payment.paymentDetails.instructions,
            },
            createdAt: payment.createdAt,
            expiresAt: payment.paymentDetails.expiresAt,
        };
    }
    async apiInternalTransfer(request) {
        this.logger.log(`Internal transfer: ${request.amount} ${request.currency} from ${request.fromSubwalletId} to ${request.toSubwalletId}`);
        const response = await this.makeRequest('POST', '/business/transfers', {
            fromSubwalletId: request.fromSubwalletId,
            toSubwalletId: request.toSubwalletId,
            amount: request.amount,
            currency: request.currency,
            reference: request.reference,
        });
        const transfer = response.data;
        return {
            id: transfer.id,
            type: 'internal',
            fromSubwalletId: transfer.fromSubwalletId,
            toSubwalletId: transfer.toSubwalletId,
            amount: transfer.amount,
            currency: transfer.currency,
            fee: transfer.fee,
            status: transfer.status,
            createdAt: transfer.createdAt,
        };
    }
    async apiExternalTransfer(request) {
        this.logger.log(`External transfer: ${request.amount} ${request.currency} from ${request.subwalletId} to ${request.toAddress}`);
        const response = await this.makeRequest('POST', '/business/withdrawals', {
            subwalletId: request.subwalletId,
            toAddress: request.toAddress,
            amount: request.amount,
            currency: request.currency,
            network: request.network,
            reference: request.reference,
        });
        const withdrawal = response.data;
        return {
            id: withdrawal.id,
            type: 'external',
            fromSubwalletId: withdrawal.subwalletId,
            toAddress: withdrawal.toAddress,
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            fee: withdrawal.fee,
            status: withdrawal.status,
            txHash: withdrawal.txHash,
            createdAt: withdrawal.createdAt,
        };
    }
    async apiGetRate(request) {
        this.logger.debug(`Getting rate: ${request.amount} ${request.sourceCurrency} to ${request.targetCurrency}`);
        const response = await this.makeRequest('GET', `/business/rates?source=${request.sourceCurrency}&destination=${request.targetCurrency}`);
        const rate = response.data;
        const conversionRate = request.sourceCurrency === 'USD' ? rate.sell : rate.buy;
        const fee = request.amount * 0.015;
        const targetAmount = (request.amount - fee) * conversionRate;
        return {
            sourceCurrency: request.sourceCurrency,
            targetCurrency: request.targetCurrency,
            rate: conversionRate,
            sourceAmount: request.amount,
            targetAmount,
            fee,
            expiresAt: rate.expiresAt,
        };
    }
};
exports.YellowCardService = YellowCardService;
exports.YellowCardService = YellowCardService = YellowCardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], YellowCardService);
//# sourceMappingURL=yellow-card.service.js.map