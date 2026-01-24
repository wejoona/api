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
exports.GetDepositStatusUseCase = void 0;
const common_1 = require("@nestjs/common");
const transaction_repository_1 = require("../../infrastructure/repositories/transaction.repository");
const wallet_repository_1 = require("../../../wallet/infrastructure/repositories/wallet.repository");
const gateways_1 = require("../../../shared/domain/gateways");
let GetDepositStatusUseCase = class GetDepositStatusUseCase {
    constructor(transactionRepository, walletRepository, paymentGateway) {
        this.transactionRepository = transactionRepository;
        this.walletRepository = walletRepository;
        this.paymentGateway = paymentGateway;
    }
    async execute(input) {
        const transaction = await this.transactionRepository.findById(input.transactionId);
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        const wallet = await this.walletRepository.findByUserId(input.userId);
        if (!wallet || wallet.id !== transaction.walletId) {
            throw new common_1.ForbiddenException('Not authorized to view this transaction');
        }
        if (transaction.type !== 'deposit') {
            throw new common_1.NotFoundException('Not a deposit transaction');
        }
        let status = transaction.status;
        if (transaction.isPending && transaction.yellowCardRef) {
            try {
                const depositStatus = await this.paymentGateway.getDepositStatus(transaction.yellowCardRef);
                status = depositStatus.status;
                const mappedStatus = this.mapProviderStatus(depositStatus.status);
                if (mappedStatus !== transaction.status) {
                    if (mappedStatus === 'completed') {
                        transaction.complete();
                    }
                    else if (mappedStatus === 'failed') {
                        transaction.fail('Payment failed');
                    }
                    else {
                        transaction.updateStatus(mappedStatus);
                    }
                    await this.transactionRepository.save(transaction);
                }
            }
            catch {
            }
        }
        const metadata = transaction.metadata || {};
        return {
            transactionId: transaction.id,
            depositId: metadata.depositId || transaction.yellowCardRef || '',
            status,
            amount: transaction.amount,
            sourceCurrency: metadata.sourceCurrency || 'XOF',
            targetCurrency: transaction.currency,
            rate: metadata.rate || 0,
            fee: metadata.fee || 0,
            createdAt: transaction.createdAt,
            completedAt: transaction.completedAt,
        };
    }
    mapProviderStatus(providerStatus) {
        const statusMap = {
            pending: 'pending',
            processing: 'processing',
            completed: 'completed',
            failed: 'failed',
            expired: 'failed',
            cancelled: 'cancelled',
        };
        return statusMap[providerStatus] || 'pending';
    }
};
exports.GetDepositStatusUseCase = GetDepositStatusUseCase;
exports.GetDepositStatusUseCase = GetDepositStatusUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(gateways_1.PAYMENT_GATEWAY)),
    __metadata("design:paramtypes", [transaction_repository_1.TransactionRepository,
        wallet_repository_1.WalletRepository, Object])
], GetDepositStatusUseCase);
//# sourceMappingURL=get-deposit-status.use-case.js.map