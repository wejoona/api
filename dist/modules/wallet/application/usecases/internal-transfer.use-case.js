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
exports.InternalTransferUseCase = void 0;
const common_1 = require("@nestjs/common");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const transaction_repository_1 = require("../../../transaction/infrastructure/repositories/transaction.repository");
const transaction_entity_1 = require("../../../transaction/domain/entities/transaction.entity");
const user_repository_1 = require("../../../user/infrastructure/repositories/user.repository");
const gateways_1 = require("../../../shared/domain/gateways");
let InternalTransferUseCase = class InternalTransferUseCase {
    constructor(walletRepository, transactionRepository, userRepository, paymentGateway) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.paymentGateway = paymentGateway;
    }
    async execute(input) {
        const currency = input.currency || 'USD';
        const fromWallet = await this.walletRepository.findByUserId(input.fromUserId);
        if (!fromWallet) {
            throw new common_1.NotFoundException('Sender wallet not found');
        }
        if (!fromWallet.isActive) {
            throw new common_1.BadRequestException('Sender wallet is not active');
        }
        const recipient = await this.userRepository.findByPhone(input.toPhone);
        if (!recipient) {
            throw new common_1.NotFoundException('Recipient not found. They must register first.');
        }
        const toWallet = await this.walletRepository.findByUserId(recipient.id);
        if (!toWallet) {
            throw new common_1.NotFoundException('Recipient wallet not found');
        }
        if (!toWallet.isActive) {
            throw new common_1.BadRequestException('Recipient wallet is not active');
        }
        if (fromWallet.id === toWallet.id) {
            throw new common_1.BadRequestException('Cannot transfer to yourself');
        }
        if (input.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        const transferResponse = await this.paymentGateway.internalTransfer({
            fromSubwalletId: fromWallet.yellowCardWalletId,
            toSubwalletId: toWallet.yellowCardWalletId,
            amount: input.amount,
            currency,
        });
        const senderTransaction = transaction_entity_1.TransactionEntity.createInternalTransfer({
            walletId: fromWallet.id,
            amount: -input.amount,
            recipientWalletId: toWallet.id,
            recipientPhone: input.toPhone,
            currency,
            metadata: {
                transferId: transferResponse.id,
                direction: 'outbound',
                recipientName: recipient.fullName,
            },
        });
        const recipientTransaction = transaction_entity_1.TransactionEntity.createInternalTransfer({
            walletId: toWallet.id,
            amount: input.amount,
            recipientWalletId: fromWallet.id,
            recipientPhone: input.toPhone,
            currency,
            metadata: {
                transferId: transferResponse.id,
                direction: 'inbound',
                senderWalletId: fromWallet.id,
            },
        });
        senderTransaction.complete();
        recipientTransaction.complete();
        await Promise.all([
            this.transactionRepository.save(senderTransaction),
            this.transactionRepository.save(recipientTransaction),
        ]);
        return {
            transactionId: senderTransaction.id,
            fromWalletId: fromWallet.id,
            toWalletId: toWallet.id,
            toPhone: input.toPhone,
            amount: input.amount,
            currency,
            fee: transferResponse.fee,
            status: 'completed',
        };
    }
};
exports.InternalTransferUseCase = InternalTransferUseCase;
exports.InternalTransferUseCase = InternalTransferUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        transaction_repository_1.TransactionRepository,
        user_repository_1.UserRepository, Object])
], InternalTransferUseCase);
//# sourceMappingURL=internal-transfer.use-case.js.map