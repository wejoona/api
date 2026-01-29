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
const user_repository_1 = require("../../../user/infrastructure/repositories/user.repository");
const gateways_1 = require("../../../shared/domain/gateways");
const services_1 = require("../../../shared/infrastructure/services");
const transaction_risk_service_1 = require("../../../risk/application/services/transaction-risk.service");
const DAILY_TRANSFER_LIMITS = {
    none: 100,
    pending: 100,
    verified: 10000,
    rejected: 0,
};
let ExternalTransferUseCase = ExternalTransferUseCase_1 = class ExternalTransferUseCase {
    constructor(walletRepository, transactionRepository, userRepository, dataSource, paymentGateway, cacheInvalidationService, riskService) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.dataSource = dataSource;
        this.paymentGateway = paymentGateway;
        this.cacheInvalidationService = cacheInvalidationService;
        this.riskService = riskService;
        this.logger = new common_1.Logger(ExternalTransferUseCase_1.name);
        this.FEE_PERCENTAGE = 0.005;
        this.MAX_TRANSFER_AMOUNT = 10000;
        this.MAX_RETRIES = 3;
    }
    async execute(input) {
        const currency = input.currency || 'USD';
        if (!this.isValidAddress(input.toAddress)) {
            throw new common_1.BadRequestException('Invalid wallet address format');
        }
        await this.screenDestinationAddress(input.toAddress, input.network);
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
        await this.checkTransferLimits(input.userId, input.amount);
        const { walletId, transactionId, yellowCardWalletId } = await this.reserveFunds(input.userId, totalAmount, input.toAddress, currency, fee, input.network);
        try {
            const transferResponse = await this.paymentGateway.externalTransfer({
                subwalletId: yellowCardWalletId,
                toAddress: input.toAddress,
                amount: input.amount,
                currency,
                network: input.network || 'polygon',
            });
            await this.finalizeTransaction(transactionId, transferResponse, 'completed');
            this.logger.log(`External transfer completed: ${transactionId}, amount: ${input.amount}, fee: ${fee}`);
            await this.cacheInvalidationService.invalidateBalance(input.userId);
            return {
                transactionId,
                walletId,
                toAddress: input.toAddress,
                amount: input.amount,
                currency,
                fee,
                status: transferResponse.status,
                estimatedArrival: '5-30 minutes',
            };
        }
        catch (error) {
            this.logger.error(`External transfer failed, refunding: ${error.message}`, error.stack);
            await this.refundTransaction(transactionId, input.userId, totalAmount);
            throw new common_1.BadRequestException('Transfer failed. Your funds have been refunded. Please try again later.');
        }
    }
    async reserveFunds(userId, totalAmount, toAddress, currency, fee, network, attempt = 1) {
        try {
            return await this.dataSource.transaction(async (manager) => {
                const walletOrm = await manager.findOne(wallet_orm_entity_1.WalletOrmEntity, {
                    where: { userId },
                });
                if (!walletOrm) {
                    throw new common_1.NotFoundException('Wallet not found');
                }
                if (walletOrm.status !== 'active') {
                    throw new common_1.BadRequestException('Wallet is not active');
                }
                if (Number(walletOrm.balance) < totalAmount) {
                    throw new common_1.BadRequestException(`Insufficient balance. Required: $${totalAmount.toFixed(2)} (including $${fee.toFixed(2)} fee)`);
                }
                this.logger.log(`Reserving funds: ${userId} -> ${toAddress}, amount: ${totalAmount - fee}, fee: ${fee} (attempt ${attempt})`);
                walletOrm.balance = Number(walletOrm.balance) - totalAmount;
                await manager.save(walletOrm);
                const transaction = transaction_entity_1.TransactionEntity.createExternalTransfer({
                    walletId: walletOrm.id,
                    amount: -totalAmount,
                    recipientAddress: toAddress,
                    currency,
                    yellowCardRef: null,
                    metadata: {
                        network: network || 'polygon',
                        fee,
                        grossAmount: totalAmount - fee,
                        status: 'pending',
                    },
                });
                transaction.status = 'pending';
                await this.transactionRepository.save(transaction);
                return {
                    walletId: walletOrm.id,
                    transactionId: transaction.id,
                    yellowCardWalletId: walletOrm.yellowCardWalletId,
                };
            });
        }
        catch (error) {
            if (error instanceof typeorm_1.OptimisticLockVersionMismatchError ||
                error.message?.includes('version')) {
                if (attempt < this.MAX_RETRIES) {
                    this.logger.warn(`Optimistic lock conflict on fund reservation, retrying (attempt ${attempt + 1}/${this.MAX_RETRIES})`);
                    await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
                    return this.reserveFunds(userId, totalAmount, toAddress, currency, fee, network, attempt + 1);
                }
                throw new common_1.ConflictException('Transfer failed due to concurrent modification. Please try again.');
            }
            throw error;
        }
    }
    async finalizeTransaction(transactionId, transferResponse, status) {
        await this.transactionRepository.update(transactionId, {
            status,
            yellowCardRef: transferResponse.externalId,
            metadata: {
                transferId: transferResponse.id,
                externalStatus: transferResponse.status,
                completedAt: new Date().toISOString(),
            },
        });
    }
    async refundTransaction(transactionId, userId, amount, attempt = 1) {
        try {
            await this.dataSource.transaction(async (manager) => {
                const walletOrm = await manager.findOne(wallet_orm_entity_1.WalletOrmEntity, {
                    where: { userId },
                });
                if (walletOrm) {
                    walletOrm.balance = Number(walletOrm.balance) + amount;
                    await manager.save(walletOrm);
                }
                await this.transactionRepository.update(transactionId, {
                    status: 'failed',
                    metadata: {
                        failedAt: new Date().toISOString(),
                        refunded: true,
                    },
                });
            });
            this.logger.log(`Refunded ${amount} for failed transaction ${transactionId}`);
        }
        catch (error) {
            if (error instanceof typeorm_1.OptimisticLockVersionMismatchError ||
                error.message?.includes('version')) {
                if (attempt < this.MAX_RETRIES) {
                    this.logger.warn(`Optimistic lock conflict on refund, retrying (attempt ${attempt + 1}/${this.MAX_RETRIES})`);
                    await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
                    return this.refundTransaction(transactionId, userId, amount, attempt + 1);
                }
            }
            this.logger.error(`CRITICAL: Failed to refund transaction ${transactionId}: ${error.message}`, error.stack);
        }
    }
    async checkTransferLimits(userId, amount) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const kycStatus = user.kycStatus || 'none';
        const dailyLimit = DAILY_TRANSFER_LIMITS[kycStatus] ??
            DAILY_TRANSFER_LIMITS.none;
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
    isValidAddress(address) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return false;
        }
        if (address === address.toLowerCase() ||
            address.substring(2) === address.substring(2).toUpperCase()) {
            return true;
        }
        return this.validateEip55Checksum(address);
    }
    validateEip55Checksum(address) {
        try {
            const addressWithoutPrefix = address.substring(2).toLowerCase();
            const crypto = require('crypto');
            const hash = crypto
                .createHash('sha3-256')
                .update(addressWithoutPrefix)
                .digest('hex');
            for (let i = 0; i < 40; i++) {
                const hashChar = parseInt(hash[i], 16);
                const addressChar = address[i + 2];
                if (hashChar >= 8) {
                    if (addressChar !== addressChar.toUpperCase()) {
                        return false;
                    }
                }
                else {
                    if (addressChar !== addressChar.toLowerCase()) {
                        return false;
                    }
                }
            }
            return true;
        }
        catch (error) {
            this.logger.warn(`EIP-55 checksum validation failed for ${address}: ${error.message}`);
            return true;
        }
    }
    async screenDestinationAddress(address, network) {
        const blockchain = this.mapNetworkToBlockchain(network);
        this.logger.log(`[COMPLIANCE] Screening address: ${address} on ${blockchain}`);
        const result = await this.riskService.isAddressSafe(address, blockchain);
        if (!result.safe) {
            this.logger.warn(`[COMPLIANCE] Address blocked: ${address}`, {
                reason: result.reason,
                riskSignals: result.riskSignals,
            });
            throw new common_1.ForbiddenException(`Transfer blocked: This destination address has been flagged by our compliance system. ` +
                `Reason: ${result.reason || 'Compliance check failed'}`);
        }
        this.logger.log(`[COMPLIANCE] Address approved: ${address}`);
    }
    mapNetworkToBlockchain(network) {
        const networkMap = {
            ethereum: 'ETH',
            eth: 'ETH',
            polygon: 'MATIC',
            matic: 'MATIC',
            arbitrum: 'ARB',
            arb: 'ARB',
            avalanche: 'AVAX',
            avax: 'AVAX',
            base: 'BASE',
            optimism: 'OP',
            op: 'OP',
            solana: 'SOL',
            sol: 'SOL',
        };
        return networkMap[network?.toLowerCase() || 'polygon'] || 'MATIC';
    }
};
exports.ExternalTransferUseCase = ExternalTransferUseCase;
exports.ExternalTransferUseCase = ExternalTransferUseCase = ExternalTransferUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [wallet_repository_1.WalletRepository,
        transaction_repository_1.TransactionRepository,
        user_repository_1.UserRepository,
        typeorm_1.DataSource, Object, services_1.CacheInvalidationService,
        transaction_risk_service_1.TransactionRiskService])
], ExternalTransferUseCase);
//# sourceMappingURL=external-transfer.use-case.js.map