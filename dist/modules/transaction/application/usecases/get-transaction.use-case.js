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
exports.GetTransactionUseCase = void 0;
const common_1 = require("@nestjs/common");
const transaction_repository_1 = require("../../infrastructure/repositories/transaction.repository");
const wallet_repository_1 = require("../../../wallet/infrastructure/repositories/wallet.repository");
let GetTransactionUseCase = class GetTransactionUseCase {
    constructor(transactionRepository, walletRepository) {
        this.transactionRepository = transactionRepository;
        this.walletRepository = walletRepository;
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
        return transaction;
    }
};
exports.GetTransactionUseCase = GetTransactionUseCase;
exports.GetTransactionUseCase = GetTransactionUseCase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [transaction_repository_1.TransactionRepository,
        wallet_repository_1.WalletRepository])
], GetTransactionUseCase);
//# sourceMappingURL=get-transaction.use-case.js.map