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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTransactionsUseCase = void 0;
const common_1 = require("@nestjs/common");
const transaction_repository_1 = require("../../infrastructure/repositories/transaction.repository");
const wallet_repository_1 = require("../../../wallet/infrastructure/repositories/wallet.repository");
let GetTransactionsUseCase = class GetTransactionsUseCase {
    constructor(transactionRepository, walletRepository) {
        this.transactionRepository = transactionRepository;
        this.walletRepository = walletRepository;
    }
    async execute(input) {
        const wallet = await this.walletRepository.findByUserId(input.userId);
        if (!wallet) {
            const limit = input.limit || 20;
            const offset = input.offset || 0;
            return {
                transactions: [],
                total: 0,
                limit,
                offset,
                hasMore: false,
            };
        }
        const limit = input.limit || 20;
        const offset = input.offset || 0;
        const filters = {
            type: input.type,
            status: input.status,
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
            minAmount: input.minAmount,
            maxAmount: input.maxAmount,
            search: input.search,
            sortBy: input.sortBy || 'createdAt',
            sortOrder: input.sortOrder || 'DESC',
            limit,
            offset,
        };
        const result = await this.transactionRepository.findByWalletIdFiltered(wallet.id, filters);
        return {
            transactions: result.transactions,
            total: result.total,
            limit,
            offset,
            hasMore: offset + result.transactions.length < result.total,
        };
    }
};
exports.GetTransactionsUseCase = GetTransactionsUseCase;
exports.GetTransactionsUseCase = GetTransactionsUseCase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transaction_repository_1.TransactionRepository,
        wallet_repository_1.WalletRepository])
], GetTransactionsUseCase);
//# sourceMappingURL=get-transactions.use-case.js.map