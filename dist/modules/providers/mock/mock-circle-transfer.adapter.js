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
var MockCircleTransferAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCircleTransferAdapter = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const uuid_1 = require("uuid");
let MockCircleTransferAdapter = MockCircleTransferAdapter_1 = class MockCircleTransferAdapter {
    constructor() {
        this.logger = new common_1.Logger(MockCircleTransferAdapter_1.name);
        this.providerName = 'circle_mock';
        this.mockData = this.loadMockData();
        this.logger.warn('Circle Transfer running in MOCK mode');
    }
    loadMockData() {
        try {
            const mockDataPath = path.join(__dirname, '../mock-data/circle/transfers.json');
            const data = fs.readFileSync(mockDataPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {
                defaultTransfer: {
                    providerId: 'transfer_mock_001',
                    status: 'complete',
                    transactionHash: '0xabcdef1234567890',
                },
                statuses: ['pending', 'processing', 'complete', 'failed'],
                internalTransferFee: 0,
                externalTransferFee: 0.5,
                estimatedTimes: {
                    internal: 'instant',
                    external_MATIC: '2-5 minutes',
                },
                mockTransactionHashes: {
                    MATIC: '0xabcdef1234567890',
                },
            };
        }
    }
    async internalTransfer(data) {
        const providerId = `circle_tx_${(0, uuid_1.v4)().slice(0, 8)}`;
        this.logger.log(`[MOCK] Internal transfer: ${data.amount} ${data.currency} from ${data.fromWalletId} to ${data.toWalletId}`);
        return {
            providerId,
            status: 'completed',
            amount: data.amount,
            currency: data.currency,
            fee: this.mockData.internalTransferFee.toString(),
            fromWalletId: data.fromWalletId,
            toWalletId: data.toWalletId,
            createdAt: new Date(),
            completedAt: new Date(),
        };
    }
    async externalTransfer(data) {
        const providerId = `circle_tx_${(0, uuid_1.v4)().slice(0, 8)}`;
        this.logger.log(`[MOCK] External transfer: ${data.amount} ${data.currency} from ${data.fromWalletId} to ${data.toAddress}`);
        return {
            providerId,
            status: 'pending',
            amount: data.amount,
            currency: data.currency,
            fee: this.mockData.externalTransferFee.toString(),
            fromWalletId: data.fromWalletId,
            toAddress: data.toAddress,
            createdAt: new Date(),
        };
    }
    async getTransferStatus(providerTransferId) {
        return {
            providerId: providerTransferId,
            status: 'completed',
            amount: '100.00',
            currency: 'USDC',
            fee: '0',
            fromWalletId: 'mock_wallet',
            txHash: this.mockData.mockTransactionHashes['MATIC'] ||
                this.generateMockTxHash(),
            createdAt: new Date(),
            completedAt: new Date(),
        };
    }
    async estimateFee(_data) {
        return {
            fee: this.mockData.externalTransferFee.toString(),
            currency: 'USDC',
        };
    }
    generateMockTxHash() {
        const chars = '0123456789abcdef';
        let result = '0x';
        for (let i = 0; i < 64; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }
};
exports.MockCircleTransferAdapter = MockCircleTransferAdapter;
exports.MockCircleTransferAdapter = MockCircleTransferAdapter = MockCircleTransferAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MockCircleTransferAdapter);
//# sourceMappingURL=mock-circle-transfer.adapter.js.map