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
const services_1 = require("../../../shared/infrastructure/services");
const DAILY_TRANSFER_LIMITS = {
    none: 100,
    pending: 100,
    verified: 10000,
    rejected: 0,
};
let InternalTransferUseCase = InternalTransferUseCase_1 = class InternalTransferUseCase {
    constructor(walletRepository, transactionRepository, userRepository, dataSource, paymentGateway, cacheInvalidationService) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.dataSource = dataSource;
        this.paymentGateway = paymentGateway;
        this.cacheInvalidationService = cacheInvalidationService;
        this.logger = new common_1.Logger(InternalTransferUseCase_1.name);
        this.MAX_RETRIES = 3;
    }
    async execute(input) {
        const currency = input.currency || 'USD';
        this.validateTransferRequest(input);
        const recipient = await this.validateRecipient(input.toPhone);
        await this.checkDailyLimits(input.fromUserId, input.amount);
        return this.executeWithRetry(input, recipient, currency);
    }
    validateTransferRequest(input) {
        if (input.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        if (input.amount < 0.01) {
            throw new common_1.BadRequestException('Minimum transfer amount is 0.01');
        }
        if (!Number.isFinite(input.amount) || Math.round(input.amount * 100) / 100 !== input.amount) {
            throw new common_1.BadRequestException('Invalid amount precision');
        }
    }
    async validateRecipient(phone) {
        const recipient = await this.userRepository.findByPhone(phone);
        if (!recipient) {
            throw new common_1.NotFoundException('Recipient not found. They must register first.');
        }
        return recipient;
    }
    async checkDailyLimits(userId, amount) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const kycStatus = user.kycStatus || 'none';
        const dailyLimit = DAILY_TRANSFER_LIMITS[kycStatus] ?? DAILY_TRANSFER_LIMITS.none;
        if (dailyLimit === 0) {
            throw new common_1.BadRequestException('Transfers are disabled. Please contact support regarding your KYC status.');
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const dailyVolume = await this.transactionRepository.getDailyTransferVolume(userId, todayStart);
        if (dailyVolume + amount > dailyLimit) {
            const remaining = Math.max(0, dailyLimit - dailyVolume);
            throw new common_1.BadRequestException(`Daily transfer limit exceeded. Your limit is $${dailyLimit}/day (KYC: ${kycStatus}). ` +
                `You have $${remaining.toFixed(2)} remaining today.`);
        }
        this.logger.debug(`Transfer limit check passed: user=${userId}, kycStatus=${kycStatus}, ` +
            `dailyLimit=$${dailyLimit}, dailyVolume=$${dailyVolume.toFixed(2)}, amount=$${amount}`);
    }
    async executeTransferTransaction(input, recipient, currency, attempt) {
        return await this.dataSource.transaction(async (manager) => {
            const fromWalletOrm = await manager.findOne(wallet_orm_entity_1.WalletOrmEntity, {
                where: { userId: input.fromUserId },
            });
            if (!fromWalletOrm) {
                throw new common_1.NotFoundException('Sender wallet not found');
            }
            if (fromWalletOrm.status !== 'active') {
                throw new common_1.BadRequestException('Sender wallet is not active');
            }
            if (Number(fromWalletOrm.balance) < input.amount) {
                throw new common_1.BadRequestException('Insufficient balance');
            }
            const toWalletOrm = await manager.findOne(wallet_orm_entity_1.WalletOrmEntity, {
                where: { userId: recipient.id },
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
            this.logger.log(`Processing internal transfer: ${input.fromUserId} -> ${recipient.id}, amount: ${input.amount} (attempt ${attempt})`);
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
            await this.cacheInvalidationService.invalidateMultipleBalances([
                input.fromUserId,
                recipient.id,
            ]);
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
    async executeWithRetry(input, recipient, currency, attempt = 1) {
        try {
            return await this.executeTransferTransaction(input, recipient, currency, attempt);
        }
        catch (error) {
            if (error instanceof typeorm_1.OptimisticLockVersionMismatchError ||
                error.message?.includes('version')) {
                if (attempt < this.MAX_RETRIES) {
                    this.logger.warn(`Optimistic lock conflict on internal transfer, retrying (attempt ${attempt + 1}/${this.MAX_RETRIES})`);
                    await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
                    return this.executeWithRetry(input, recipient, currency, attempt + 1);
                }
                throw new common_1.ConflictException('Transfer failed due to concurrent modification. Please try again.');
            }
            throw error;
        }
    }
};
exports.InternalTransferUseCase = InternalTransferUseCase;
exports.InternalTransferUseCase = InternalTransferUseCase = InternalTransferUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        transaction_repository_1.TransactionRepository,
        user_repository_1.UserRepository,
        typeorm_1.DataSource, Object, services_1.CacheInvalidationService])
], InternalTransferUseCase);
//# sourceMappingURL=internal-transfer.use-case.js.map