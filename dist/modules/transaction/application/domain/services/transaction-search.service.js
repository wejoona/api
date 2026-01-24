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
var TransactionSearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionSearchService = void 0;
const common_1 = require("@nestjs/common");
const interfaces_1 = require("../../../../providers/interfaces");
let TransactionSearchService = TransactionSearchService_1 = class TransactionSearchService {
    constructor(searchProvider) {
        this.searchProvider = searchProvider;
        this.logger = new common_1.Logger(TransactionSearchService_1.name);
    }
    async searchTransactions(input) {
        this.logger.debug(`Searching transactions: ${JSON.stringify(input)}`);
        const query = input.query || '*';
        const filters = [];
        if (input.userId) {
            filters.push(`meta_data.userId:=${input.userId}`);
        }
        if (input.type) {
            filters.push(`meta_data.type:=${input.type}`);
        }
        if (input.status) {
            filters.push(`status:=${input.status.toUpperCase()}`);
        }
        if (input.startDate) {
            filters.push(`created_at:>=${input.startDate.toISOString()}`);
        }
        if (input.endDate) {
            filters.push(`created_at:<=${input.endDate.toISOString()}`);
        }
        if (input.minAmount) {
            filters.push(`precise_amount:>=${input.minAmount.toString()}`);
        }
        if (input.maxAmount) {
            filters.push(`precise_amount:<=${input.maxAmount.toString()}`);
        }
        const filterBy = filters.length > 0 ? filters.join(' && ') : undefined;
        const result = await this.searchProvider.searchTransactions({
            query,
            filterBy,
            sortBy: 'created_at:desc',
            page: input.page ?? 1,
            perPage: input.perPage ?? 20,
        });
        this.logger.debug(`Found ${result.found} transactions`);
        return result;
    }
    async getUserTransactionHistory(userId, options) {
        return this.searchTransactions({
            userId,
            type: options?.type,
            page: options?.page,
            perPage: options?.perPage,
        });
    }
    async findByReference(reference) {
        const result = await this.searchProvider.searchTransactions({
            query: reference,
            filterBy: `reference:=${reference}`,
            perPage: 1,
        });
        return result.hits[0] || null;
    }
    async getRecentTransactions(userId, limit = 10) {
        const result = await this.searchTransactions({
            userId,
            perPage: limit,
        });
        return result.hits;
    }
    async findPotentialDuplicates(amount, source, destination, timeWindowMinutes = 5) {
        const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
        const result = await this.searchProvider.searchTransactions({
            query: '*',
            filterBy: [
                `precise_amount:=${amount.toString()}`,
                `source:=${source}`,
                `destination:=${destination}`,
                `created_at:>=${startTime.toISOString()}`,
            ].join(' && '),
            perPage: 10,
        });
        return result.hits;
    }
    async getUserStats(userId, startDate, endDate) {
        const baseInput = {
            userId,
            startDate,
            endDate,
            perPage: 1,
        };
        const [total, deposits, withdrawals, transfers] = await Promise.all([
            this.searchTransactions(baseInput),
            this.searchTransactions({ ...baseInput, type: 'deposit' }),
            this.searchTransactions({ ...baseInput, type: 'withdrawal' }),
            this.searchTransactions({ ...baseInput, type: 'transfer_p2p' }),
        ]);
        return {
            totalTransactions: total.found,
            deposits: deposits.found,
            withdrawals: withdrawals.found,
            transfers: transfers.found,
        };
    }
};
exports.TransactionSearchService = TransactionSearchService;
exports.TransactionSearchService = TransactionSearchService = TransactionSearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(interfaces_1.SEARCH_PROVIDER)),
    __metadata("design:paramtypes", [Object])
], TransactionSearchService);
//# sourceMappingURL=transaction-search.service.js.map