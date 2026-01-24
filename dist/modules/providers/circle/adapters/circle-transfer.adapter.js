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
var CircleTransferAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleTransferAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const circle_types_1 = require("../circle.types");
let CircleTransferAdapter = CircleTransferAdapter_1 = class CircleTransferAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(CircleTransferAdapter_1.name);
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
        const tokenMap = circle_types_1.CIRCLE_USDC_TOKENS;
        this.usdcTokenId =
            tokenMap[this.defaultBlockchain] || circle_types_1.CIRCLE_USDC_TOKENS['ETH-SEPOLIA'];
        if (!this.config.apiKey) {
            this.logger.warn('Circle API key not configured');
        }
        else {
            this.logger.log('Circle Transfer adapter initialized');
        }
    }
    async internalTransfer(data) {
        try {
            const destWalletResponse = await fetch(`${this.config.baseUrl}/wallets/${data.toWalletId}`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (!destWalletResponse.ok) {
                throw new Error('Destination wallet not found');
            }
            const destWalletResult = (await destWalletResponse.json());
            const destAddress = destWalletResult.data.wallet.address;
            const response = await fetch(`${this.config.baseUrl}/transactions/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                    'X-Entity-Secret': this.config.entitySecret,
                },
                body: JSON.stringify({
                    idempotencyKey: data.idempotencyKey,
                    walletId: data.fromWalletId,
                    destinationAddress: destAddress,
                    amounts: [
                        {
                            amount: data.amount,
                            tokenId: this.usdcTokenId,
                        },
                    ],
                    feeLevel: 'MEDIUM',
                }),
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            return this.mapCircleTransfer(result.data.transfer);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to execute internal transfer: ${errorMessage}`);
            throw error;
        }
    }
    async externalTransfer(data) {
        try {
            const response = await fetch(`${this.config.baseUrl}/transactions/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                    'X-Entity-Secret': this.config.entitySecret,
                },
                body: JSON.stringify({
                    idempotencyKey: data.idempotencyKey,
                    walletId: data.fromWalletId,
                    destinationAddress: data.toAddress,
                    amounts: [
                        {
                            amount: data.amount,
                            tokenId: this.usdcTokenId,
                        },
                    ],
                    feeLevel: 'MEDIUM',
                }),
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            return this.mapCircleTransfer(result.data.transfer);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to execute external transfer: ${errorMessage}`);
            throw error;
        }
    }
    async getTransferStatus(providerTransferId) {
        try {
            const response = await fetch(`${this.config.baseUrl}/transactions/${providerTransferId}`, {
                headers: {
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            return this.mapCircleTransfer(result.data.transaction);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to get transfer status: ${errorMessage}`);
            throw error;
        }
    }
    async estimateFee(data) {
        try {
            const response = await fetch(`${this.config.baseUrl}/transactions/transfer/estimateFee`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.apiKey}`,
                },
                body: JSON.stringify({
                    walletId: data.fromWalletId,
                    destinationAddress: data.toAddress,
                    amounts: [
                        {
                            amount: data.amount || '1',
                            tokenId: this.usdcTokenId,
                        },
                    ],
                }),
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`Circle API error: ${error.message}`);
            }
            const result = (await response.json());
            const estimate = result.data.estimate;
            return {
                fee: estimate.baseFee || '0',
                currency: 'USDC',
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to estimate fee: ${errorMessage}`);
            return { fee: '1.00', currency: 'USDC' };
        }
    }
    mapCircleTransfer(transfer) {
        const statusMap = {
            INITIATED: 'pending',
            PENDING_RISK_SCREENING: 'pending',
            QUEUED: 'pending',
            SENT: 'processing',
            CONFIRMED: 'processing',
            COMPLETE: 'completed',
            FAILED: 'failed',
            DENIED: 'failed',
            CANCELLED: 'cancelled',
        };
        return {
            providerId: transfer.id,
            status: statusMap[transfer.state] || 'pending',
            amount: transfer.amounts[0]?.amount || '0',
            currency: 'USDC',
            fee: transfer.fees?.[0]?.amount || '0',
            fromWalletId: transfer.walletId,
            toAddress: transfer.destinationAddress,
            txHash: transfer.txHash,
            createdAt: new Date(transfer.createDate),
            completedAt: transfer.state === 'COMPLETE'
                ? new Date(transfer.updateDate)
                : undefined,
        };
    }
};
exports.CircleTransferAdapter = CircleTransferAdapter;
exports.CircleTransferAdapter = CircleTransferAdapter = CircleTransferAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CircleTransferAdapter);
//# sourceMappingURL=circle-transfer.adapter.js.map