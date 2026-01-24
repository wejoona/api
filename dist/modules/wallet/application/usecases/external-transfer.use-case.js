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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalTransferUseCase = void 0;
const common_1 = require("@nestjs/common");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const transaction_repository_1 = require("../../../transaction/infrastructure/repositories/transaction.repository");
const transaction_entity_1 = require("../../../transaction/domain/entities/transaction.entity");
const gateways_1 = require("../../../shared/domain/gateways");
let ExternalTransferUseCase = class ExternalTransferUseCase {
    constructor(walletRepository, transactionRepository, paymentGateway) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.paymentGateway = paymentGateway;
    }
    async execute(input) {
        const currency = input.currency || 'USD';
        const wallet = await this.walletRepository.findByUserId(input.userId);
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (!wallet.isActive) {
            throw new common_1.BadRequestException('Wallet is not active');
        }
        if (!this.isValidAddress(input.toAddress)) {
            throw new common_1.BadRequestException('Invalid wallet address format');
        }
        if (input.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        if (input.amount < 1) {
            throw new common_1.BadRequestException('Minimum transfer amount is $1');
        }
        const transferResponse = await this.paymentGateway.externalTransfer({
            subwalletId: wallet.yellowCardWalletId,
            toAddress: input.toAddress,
            amount: input.amount,
            currency,
            network: input.network || 'polygon',
        });
        const transaction = transaction_entity_1.TransactionEntity.createExternalTransfer({
            walletId: wallet.id,
            amount: input.amount,
            recipientAddress: input.toAddress,
            currency,
            yellowCardRef: transferResponse.externalId,
            metadata: {
                transferId: transferResponse.id,
                network: input.network || 'polygon',
                fee: transferResponse.fee,
            },
        });
        await this.transactionRepository.save(transaction);
        return {
            transactionId: transaction.id,
            walletId: wallet.id,
            toAddress: input.toAddress,
            amount: input.amount,
            currency,
            fee: transferResponse.fee,
            status: transferResponse.status,
            estimatedArrival: '5-30 minutes',
        };
    }
    isValidAddress(address) {
        if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return true;
        }
        return false;
    }
};
exports.ExternalTransferUseCase = ExternalTransferUseCase;
exports.ExternalTransferUseCase = ExternalTransferUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        transaction_repository_1.TransactionRepository, Object])
], ExternalTransferUseCase);
//# sourceMappingURL=external-transfer.use-case.js.map