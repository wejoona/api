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
exports.TransactionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const guards_1 = require("../../../../common/guards");
const usecases_1 = require("../usecases");
const requests_1 = require("../dto/requests");
let TransactionController = class TransactionController {
    constructor(getTransactionsUseCase, getTransactionUseCase, getDepositStatusUseCase) {
        this.getTransactionsUseCase = getTransactionsUseCase;
        this.getTransactionUseCase = getTransactionUseCase;
        this.getDepositStatusUseCase = getDepositStatusUseCase;
    }
    async getTransactions(req, query) {
        return this.getTransactionsUseCase.execute({
            userId: req.user.id,
            type: query.type,
            status: query.status,
            startDate: query.startDate,
            endDate: query.endDate,
            minAmount: query.minAmount,
            maxAmount: query.maxAmount,
            search: query.search,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder,
            limit: query.limit,
            offset: query.offset,
        });
    }
    async getTransaction(req, id) {
        return this.getTransactionUseCase.execute({
            userId: req.user.id,
            transactionId: id,
        });
    }
    async getDepositStatus(req, id) {
        return this.getDepositStatusUseCase.execute({
            userId: req.user.id,
            transactionId: id,
        });
    }
};
exports.TransactionController = TransactionController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get transaction history with advanced filtering',
        description: 'Returns paginated transaction history with support for type, status, date range, amount range, and text search filters.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns filtered and paginated transaction history',
        schema: {
            example: {
                transactions: [
                    {
                        id: '123e4567-e89b-12d3-a456-426614174000',
                        walletId: 'wallet-1',
                        type: 'deposit',
                        amount: 16.45,
                        currency: 'USD',
                        status: 'completed',
                        createdAt: '2026-01-18T12:00:00.000Z',
                        completedAt: '2026-01-18T12:05:00.000Z',
                    },
                ],
                total: 50,
                limit: 20,
                offset: 0,
                hasMore: true,
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.GetTransactionsQueryDto]),
    __metadata("design:returntype", Promise)
], TransactionController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction details' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns transaction details',
        schema: {
            example: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                walletId: 'wallet-1',
                type: 'deposit',
                amount: 16.45,
                currency: 'USD',
                status: 'completed',
                yellowCardRef: 'yc_dep_1234567890',
                metadata: {
                    sourceCurrency: 'XOF',
                    sourceAmount: 10000,
                    rate: 0.00166,
                    fee: 150,
                },
                createdAt: '2026-01-18T12:00:00.000Z',
                completedAt: '2026-01-18T12:05:00.000Z',
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TransactionController.prototype, "getTransaction", null);
__decorate([
    (0, common_1.Get)('deposit/:id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get deposit status (live from payment provider)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns deposit status with payment details',
        schema: {
            example: {
                transactionId: '123e4567-e89b-12d3-a456-426614174000',
                depositId: 'dep_1234567890',
                status: 'pending',
                amount: 16.45,
                sourceCurrency: 'XOF',
                targetCurrency: 'USD',
                rate: 0.00166,
                fee: 150,
                createdAt: '2026-01-18T12:00:00.000Z',
                completedAt: null,
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TransactionController.prototype, "getDepositStatus", null);
exports.TransactionController = TransactionController = __decorate([
    (0, swagger_1.ApiTags)('Transactions'),
    (0, common_1.Controller)('wallet/transactions'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [usecases_1.GetTransactionsUseCase,
        usecases_1.GetTransactionUseCase,
        usecases_1.GetDepositStatusUseCase])
], TransactionController);
//# sourceMappingURL=transaction.controller.js.map