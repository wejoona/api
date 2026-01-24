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
var CircleWalletAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleWalletAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let CircleWalletAdapter = CircleWalletAdapter_1 = class CircleWalletAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CircleWalletAdapter_1.name);
        this.providerName = 'circle';
        this.config = {
            apiKey: this.configService.get('circle.apiKey') || '',
            entitySecret: this.configService.get('circle.entitySecretCipherText') || '',
            baseUrl: this.configService.get('circle.apiUrl') ||
                'https://api.circle.com/v1/w3s',
            walletSetId: this.configService.get('circle.walletSetId'),
            useMock: false,
        };
        this.defaultBlockchain =
            this.configService.get('circle.defaultBlockchain') || 'MATIC';
        if (!this.config.apiKey) {
            this.logger.warn('Circle API key not configured');
        }
        else {
            this.logger.log('Circle Wallet adapter initialized');
        }
    }
    async createWallet(data) {
        try {
            const response = await fetch(`${this.config.baseUrl}/wallets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                    'X-Entity-Secret': this.config.entitySecret,
                },
                body: JSON.stringify({
                    idempotencyKey: data.userId,
                    userId: data.userProviderId,
                    blockchains: [this.defaultBlockchain],
                    metadata: data.metadata
                        ? [{ name: 'internalUserId', refId: data.userId }]
                        : undefined,
                }),
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            const circleWallet = result.data.wallets[0];
            return this.mapCircleWallet(circleWallet);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create Circle wallet: ${errorMessage}`);
            throw error;
        }
    }
    async getWallet(providerWalletId) {
        try {
            const response = await fetch(`${this.config.baseUrl}/wallets/${providerWalletId}`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (response.status === 404) {
                return null;
            }
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            return this.mapCircleWallet(result.data.wallet);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get Circle wallet: ${errorMessage}`);
            throw error;
        }
    }
    async getBalance(providerWalletId) {
        try {
            const response = await fetch(`${this.config.baseUrl}/wallets/${providerWalletId}/balances`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            const balances = result.data.tokenBalances || [];
            return balances.map((b) => ({
                currency: b.token.symbol,
                available: b.amount,
                pending: '0',
                total: b.amount,
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get Circle wallet balance: ${errorMessage}`);
            throw error;
        }
    }
    async getDepositAddress(providerWalletId, _blockchain) {
        const wallet = await this.getWallet(providerWalletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        return wallet.address;
    }
    async listWallets(userProviderId) {
        try {
            const response = await fetch(`${this.config.baseUrl}/wallets?userId=${userProviderId}`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            const wallets = result.data.wallets || [];
            return wallets.map((w) => this.mapCircleWallet(w));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to list Circle wallets: ${errorMessage}`);
            throw error;
        }
    }
    mapCircleWallet(circleWallet) {
        return {
            providerId: circleWallet.id,
            address: circleWallet.address,
            blockchain: circleWallet.blockchain,
            balances: [],
            status: circleWallet.state === 'LIVE' ? 'active' : 'frozen',
            createdAt: new Date(circleWallet.createDate),
        };
    }
};
exports.CircleWalletAdapter = CircleWalletAdapter;
exports.CircleWalletAdapter = CircleWalletAdapter = CircleWalletAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CircleWalletAdapter);
//# sourceMappingURL=circle-wallet.adapter.js.map