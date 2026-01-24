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
var InternalTransferUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalTransferUseCase = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const transaction_repository_1 = require("../../../transaction/infrastructure/repositories/transaction.repository");
const transaction_entity_1 = require("../../../transaction/domain/entities/transaction.entity");
const user_repository_1 = require("../../../user/infrastructure/repositories/user.repository");
const wallet_orm_entity_1 = require("../../infrastructure/orm-entities/wallet.orm-entity");
const gateways_1 = require("../../../shared/domain/gateways");
let InternalTransferUseCase = InternalTransferUseCase_1 = class InternalTransferUseCase {
    constructor(walletRepository, transactionRepository, userRepository, dataSource, paymentGateway) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.dataSource = dataSource;
        this.paymentGateway = paymentGateway;
        this.logger = new common_1.Logger(InternalTransferUseCase_1.name);
    }
    async execute(input) {
        const currency = input.currency || 'USD';
        if (input.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        if (input.amount < 0.01) {
            throw new common_1.BadRequestException('Minimum transfer amount is 0.01');
        }
        if (!Number.isFinite(input.amount) || Math.round(input.amount * 100) / 100 !== input.amount) {
            throw new common_1.BadRequestException('Invalid amount precision');
        }
        const recipient = await this.userRepository.findByPhone(input.toPhone);
        if (!recipient) {
            throw new common_1.NotFoundException('Recipient not found. They must register first.');
        }
        return this.dataSource.transaction(async (manager) => {
            const fromWalletOrm = await manager.findOne(wallet_orm_entity_1.WalletOrmEntity, {
                where: { userId: input.fromUserId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!fromWalletOrm) {
                throw new common_1.NotFoundException('Sender wallet not found');
            }
            if (fromWalletOrm.status !== 'active') {
                throw new common_1.BadRequestException('Sender wallet is not active');
            }
            if (fromWalletOrm.balance < input.amount) {
                throw new common_1.BadRequestException('Insufficient balance');
            }
            const toWalletOrm = await manager.findOne(wallet_orm_entity_1.WalletOrmEntity, {
                where: { userId: recipient.id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!toWalletOrm) {
                throw new common_1.NotFoundException('Recipient wallet not found');
            }
            if (toWalletOrm.status !== 'active') {
                throw new common_1.BadRequestException('Recipient wallet is not active');
            }
            if (fromWalletOrm.id === toWalletOrm.id) {
                throw new common_1.BadRequestException('Cannot transfer to yourself');
            }
            this.logger.log(`Processing internal transfer: ${input.fromUserId} -> ${recipient.id}, amount: ${input.amount}`);
            const transferResponse = await this.paymentGateway.internalTransfer({
                fromSubwalletId: fromWalletOrm.yellowCardWalletId,
                toSubwalletId: toWalletOrm.yellowCardWalletId,
                amount: input.amount,
                currency,
            });
            fromWalletOrm.balance = Number(fromWalletOrm.balance) - input.amount;
            toWalletOrm.balance = Number(toWalletOrm.balance) + input.amount;
            await manager.save(fromWalletOrm);
            await manager.save(toWalletOrm);
            const senderTransaction = transaction_entity_1.TransactionEntity.createInternalTransfer({
                walletId: fromWalletOrm.id,
                amount: -input.amount,
                recipientWalletId: toWalletOrm.id,
                recipientPhone: input.toPhone,
                currency,
                metadata: {
                    transferId: transferResponse.id,
                    direction: 'outbound',
                    recipientName: recipient.fullName,
                },
            });
            const recipientTransaction = transaction_entity_1.TransactionEntity.createInternalTransfer({
                walletId: toWalletOrm.id,
                amount: input.amount,
                recipientWalletId: fromWalletOrm.id,
                recipientPhone: input.toPhone,
                currency,
                metadata: {
                    transferId: transferResponse.id,
                    direction: 'inbound',
                    senderWalletId: fromWalletOrm.id,
                },
            });
            senderTransaction.complete();
            recipientTransaction.complete();
            await Promise.all([
                this.transactionRepository.save(senderTransaction),
                this.transactionRepository.save(recipientTransaction),
            ]);
            this.logger.log(`Internal transfer completed: ${senderTransaction.id}, amount: ${input.amount}`);
            return {
                transactionId: senderTransaction.id,
                fromWalletId: fromWalletOrm.id,
                toWalletId: toWalletOrm.id,
                toPhone: input.toPhone,
                amount: input.amount,
                currency,
                fee: transferResponse.fee,
                status: 'completed',
            };
        });
    }
};
exports.InternalTransferUseCase = InternalTransferUseCase;
exports.InternalTransferUseCase = InternalTransferUseCase = InternalTransferUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        transaction_repository_1.TransactionRepository,
        user_repository_1.UserRepository,
        typeorm_1.DataSource, Object])
], InternalTransferUseCase);
//# sourceMappingURL=internal-transfer.use-case.js.map