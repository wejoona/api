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
var BlnkSearchAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlnkSearchAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const blnk_typescript_1 = require("@blnkfinance/blnk-typescript");
let BlnkSearchAdapter = BlnkSearchAdapter_1 = class BlnkSearchAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(BlnkSearchAdapter_1.name);
        const blnkUrl = this.configService.get('blnk.url', 'http://localhost:5001');
        const blnkApiKey = this.configService.get('blnk.apiKey', '');
        this.client = (0, blnk_typescript_1.BlnkInit)(blnkApiKey, { baseUrl: blnkUrl });
    }
    async searchTransactions(params) {
        this.logger.debug(`Searching transactions: ${params.query}`);
        const response = (await this.client.Search.search({
            q: params.query,
            filter_by: params.filterBy,
            sort_by: params.sortBy,
            page: params.page ?? 1,
            per_page: params.perPage ?? 20,
        }, 'transactions'));
        if (!response.data) {
            return {
                found: 0,
                hits: [],
                page: params.page ?? 1,
                totalPages: 0,
            };
        }
        const transactions = response.data.hits.map((hit) => this.mapToTransactionResult(hit.document));
        const perPage = params.perPage ?? 20;
        return {
            found: response.data.found,
            hits: transactions,
            page: response.data.page,
            totalPages: Math.ceil(response.data.found / perPage),
        };
    }
    async searchBalances(params) {
        this.logger.debug(`Searching balances: ${params.query}`);
        const response = (await this.client.Search.search({
            q: params.query,
            filter_by: params.filterBy,
            sort_by: params.sortBy,
            page: params.page ?? 1,
            per_page: params.perPage ?? 20,
        }, 'balances'));
        if (!response.data) {
            return {
                found: 0,
                hits: [],
                page: params.page ?? 1,
                totalPages: 0,
            };
        }
        const balances = response.data.hits.map((hit) => this.mapToBalanceInfo(hit.document));
        const perPage = params.perPage ?? 20;
        return {
            found: response.data.found,
            hits: balances,
            page: response.data.page,
            totalPages: Math.ceil(response.data.found / perPage),
        };
    }
    mapToTransactionResult(tx) {
        return {
            transactionId: tx.transaction_id,
            reference: tx.reference,
            status: tx.status.toLowerCase(),
            source: tx.source,
            destination: tx.destination,
            amount: BigInt(tx.precise_amount),
            currency: tx.currency,
            description: tx.description,
            createdAt: new Date(tx.created_at),
            metadata: tx.meta_data,
        };
    }
    mapToBalanceInfo(balance) {
        const userId = balance.meta_data?.userId ?? balance.identity_id ?? 'unknown';
        return {
            balanceId: balance.balance_id,
            userId,
            currency: balance.currency,
            balance: BigInt(balance.balance),
            creditBalance: BigInt(balance.credit_balance),
            debitBalance: BigInt(balance.debit_balance),
            inflightBalance: BigInt(balance.inflight_balance),
            availableBalance: BigInt(balance.balance - balance.inflight_debit_balance),
        };
    }
};
exports.BlnkSearchAdapter = BlnkSearchAdapter;
exports.BlnkSearchAdapter = BlnkSearchAdapter = BlnkSearchAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BlnkSearchAdapter);
//# sourceMappingURL=blnk-search.adapter.js.map