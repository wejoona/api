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
var ExternalTransferUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalTransferUseCase = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const wallet_repository_1 = require("../../infrastructure/repositories/wallet.repository");
const transaction_repository_1 = require("../../../transaction/infrastructure/repositories/transaction.repository");
const transaction_entity_1 = require("../../../transaction/domain/entities/transaction.entity");
const wallet_orm_entity_1 = require("../../infrastructure/orm-entities/wallet.orm-entity");
const gateways_1 = require("../../../shared/domain/gateways");
let ExternalTransferUseCase = ExternalTransferUseCase_1 = class ExternalTransferUseCase {
    constructor(walletRepository, transactionRepository, dataSource, paymentGateway) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.dataSource = dataSource;
        this.paymentGateway = paymentGateway;
        this.logger = new common_1.Logger(ExternalTransferUseCase_1.name);
        this.FEE_PERCENTAGE = 0.005;
        this.MAX_TRANSFER_AMOUNT = 10000;
    }
    async execute(input) {
        const currency = input.currency || 'USD';
        if (!this.isValidAddress(input.toAddress)) {
            throw new common_1.BadRequestException('Invalid wallet address format');
        }
        if (input.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        if (input.amount < 1) {
            throw new common_1.BadRequestException('Minimum transfer amount is $1');
        }
        if (input.amount > this.MAX_TRANSFER_AMOUNT) {
            throw new common_1.BadRequestException(`Maximum transfer amount is $${this.MAX_TRANSFER_AMOUNT}`);
        }
        if (!Number.isFinite(input.amount) ||
            Math.round(input.amount * 100) / 100 !== input.amount) {
            throw new common_1.BadRequestException('Invalid amount precision');
        }
        const fee = Math.ceil(input.amount * this.FEE_PERCENTAGE * 100) / 100;
        const totalAmount = input.amount + fee;
        return this.dataSource.transaction(async (manager) => {
            const walletOrm = await manager.findOne(wallet_orm_entity_1.WalletOrmEntity, {
                where: { userId: input.userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!walletOrm) {
                throw new common_1.NotFoundException('Wallet not found');
            }
            if (walletOrm.status !== 'active') {
                throw new common_1.BadRequestException('Wallet is not active');
            }
            if (walletOrm.balance < totalAmount) {
                throw new common_1.BadRequestException(`Insufficient balance. Required: $${totalAmount.toFixed(2)} (including $${fee.toFixed(2)} fee)`);
            }
            this.logger.log(`Processing external transfer: ${input.userId} -> ${input.toAddress}, amount: ${input.amount}, fee: ${fee}`);
            walletOrm.balance = Number(walletOrm.balance) - totalAmount;
            await manager.save(walletOrm);
            try {
                const transferResponse = await this.paymentGateway.externalTransfer({
                    subwalletId: walletOrm.yellowCardWalletId,
                    toAddress: input.toAddress,
                    amount: input.amount,
                    currency,
                    network: input.network || 'polygon',
                });
                const transaction = transaction_entity_1.TransactionEntity.createExternalTransfer({
                    walletId: walletOrm.id,
                    amount: -totalAmount,
                    recipientAddress: input.toAddress,
                    currency,
                    yellowCardRef: transferResponse.externalId,
                    metadata: {
                        transferId: transferResponse.id,
                        network: input.network || 'polygon',
                        fee: fee,
                        grossAmount: input.amount,
                    },
                });
                await this.transactionRepository.save(transaction);
                this.logger.log(`External transfer initiated: ${transaction.id}, amount: ${input.amount}, fee: ${fee}`);
                return {
                    transactionId: transaction.id,
                    walletId: walletOrm.id,
                    toAddress: input.toAddress,
                    amount: input.amount,
                    currency,
                    fee: fee,
                    status: transferResponse.status,
                    estimatedArrival: '5-30 minutes',
                };
            }
            catch (error) {
                this.logger.error(`External transfer failed: ${error.message}`, error.stack);
                throw new common_1.BadRequestException('Transfer failed. Please try again later.');
            }
        });
    }
    isValidAddress(address) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return false;
        }
        if (address === address.toLowerCase() ||
            address.substring(2) === address.substring(2).toUpperCase()) {
            return true;
        }
        return true;
    }
};
exports.ExternalTransferUseCase = ExternalTransferUseCase;
exports.ExternalTransferUseCase = ExternalTransferUseCase = ExternalTransferUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        transaction_repository_1.TransactionRepository,
        typeorm_1.DataSource, Object])
], ExternalTransferUseCase);
//# sourceMappingURL=external-transfer.use-case.js.map