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
exports.InitiateDepositUseCase = void 0;
const common_1 = require("@nestjs/common");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const transaction_repository_1 = require("../../../transaction/infrastructure/repositories/transaction.repository");
const transaction_entity_1 = require("../../../transaction/domain/entities/transaction.entity");
const gateways_1 = require("../../../shared/domain/gateways");
let InitiateDepositUseCase = class InitiateDepositUseCase {
    constructor(walletRepository, transactionRepository, paymentGateway) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.paymentGateway = paymentGateway;
    }
    async execute(input) {
        const wallet = await this.walletRepository.findByUserId(input.userId);
        if (!wallet) {
            throw new common_1.NotFoundException('Wallet not found');
        }
        if (!wallet.isActive) {
            throw new common_1.BadRequestException('Wallet is not active');
        }
        if (!wallet.yellowCardWalletId) {
            throw new common_1.BadRequestException('Wallet not linked to payment provider');
        }
        if (input.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        const depositResponse = await this.paymentGateway.initiateDeposit({
            subwalletId: wallet.yellowCardWalletId,
            amount: input.amount,
            sourceCurrency: input.sourceCurrency,
            targetCurrency: 'USD',
            channelId: input.channelId,
        });
        const transaction = transaction_entity_1.TransactionEntity.createDeposit({
            walletId: wallet.id,
            amount: depositResponse.amount * depositResponse.rate - depositResponse.fee,
            currency: 'USD',
            yellowCardRef: depositResponse.externalId,
            metadata: {
                sourceCurrency: input.sourceCurrency,
                sourceAmount: input.amount,
                rate: depositResponse.rate,
                fee: depositResponse.fee,
                channelId: input.channelId,
                depositId: depositResponse.id,
            },
        });
        await this.transactionRepository.save(transaction);
        return {
            transactionId: transaction.id,
            depositId: depositResponse.id,
            amount: input.amount,
            sourceCurrency: input.sourceCurrency,
            targetCurrency: 'USD',
            rate: depositResponse.rate,
            fee: depositResponse.fee,
            estimatedAmount: input.amount * depositResponse.rate - depositResponse.fee,
            paymentInstructions: depositResponse.paymentInstructions,
            expiresAt: depositResponse.expiresAt,
        };
    }
};
exports.InitiateDepositUseCase = InitiateDepositUseCase;
exports.InitiateDepositUseCase = InitiateDepositUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        transaction_repository_1.TransactionRepository, Object])
], InitiateDepositUseCase);
//# sourceMappingURL=initiate-deposit.use-case.js.map