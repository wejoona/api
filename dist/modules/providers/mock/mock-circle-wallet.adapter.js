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
var MockCircleWalletAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCircleWalletAdapter = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
let MockCircleWalletAdapter = MockCircleWalletAdapter_1 = class MockCircleWalletAdapter {
    constructor() {
        this.logger = new common_1.Logger(MockCircleWalletAdapter_1.name);
        this.providerName = 'circle_mock';
        this.mockData = this.loadMockData();
        this.logger.warn('Circle Wallet running in MOCK mode');
    }
    loadMockData() {
        try {
            const mockDataPath = path.join(__dirname, '../mock-data/circle/wallets.json');
            const data = fs.readFileSync(mockDataPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {
                defaultWallet: {
                    providerId: 'wallet_mock_001',
                    blockchain: 'MATIC',
                    address: '0x1234567890abcdef1234567890abcdef12345678',
                    balance: '100.00',
                    currency: 'USDC',
                    status: 'active',
                },
                blockchains: ['MATIC', 'ETH', 'SOL', 'AVAX'],
                defaultBlockchain: 'MATIC',
                depositAddressPrefix: '0x',
                mockBalances: {
                    new_user: '0.00',
                    basic_user: '100.00',
                    active_user: '1000.00',
                },
            };
        }
    }
    async createWallet(data) {
        const providerId = `circle_wallet_${(0, uuid_1.v4)().slice(0, 8)}`;
        const address = `0x${this.generateMockAddress()}`;
        this.logger.log(`[MOCK] Created Circle wallet: ${providerId} for user: ${data.userProviderId}`);
        return {
            providerId,
            address,
            blockchain: this.mockData.defaultBlockchain,
            balances: [
                { currency: 'USDC', available: '0', pending: '0', total: '0' },
            ],
            status: 'active',
            createdAt: new Date(),
        };
    }
    async getWallet(providerWalletId) {
        return {
            providerId: providerWalletId,
            address: `0x${this.generateMockAddress()}`,
            blockchain: this.mockData.defaultBlockchain,
            balances: [
                {
                    currency: 'USDC',
                    available: this.mockData.defaultWallet.balance,
                    pending: '0',
                    total: this.mockData.defaultWallet.balance,
                },
            ],
            status: 'active',
            createdAt: new Date(),
        };
    }
    async getBalance(_providerWalletId) {
        return [
            {
                currency: 'USDC',
                available: this.mockData.defaultWallet.balance,
                pending: '0',
                total: this.mockData.defaultWallet.balance,
            },
        ];
    }
    async getDepositAddress(providerWalletId, _blockchain) {
        const wallet = await this.getWallet(providerWalletId);
        if (!wallet) {
            throw new Error('Wallet not found');
        }
        return wallet.address;
    }
    async listWallets(userProviderId) {
        return [
            {
                providerId: `circle_wallet_${userProviderId.slice(-8)}`,
                address: `0x${this.generateMockAddress()}`,
                blockchain: this.mockData.defaultBlockchain,
                balances: [
                    {
                        currency: 'USDC',
                        available: this.mockData.defaultWallet.balance,
                        pending: '0',
                        total: this.mockData.defaultWallet.balance,
                    },
                ],
                status: 'active',
                createdAt: new Date(),
            },
        ];
    }
    generateMockAddress() {
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < 40; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }
};
exports.MockCircleWalletAdapter = MockCircleWalletAdapter;
exports.MockCircleWalletAdapter = MockCircleWalletAdapter = MockCircleWalletAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MockCircleWalletAdapter);
//# sourceMappingURL=mock-circle-wallet.adapter.js.map