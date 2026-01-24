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
var BlnkLedgerAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlnkLedgerAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const blnk_typescript_1 = require("@blnkfinance/blnk-typescript");
const blnk_types_1 = require("../blnk.types");
const blnk_search_adapter_1 = require("./blnk-search.adapter");
let BlnkLedgerAdapter = BlnkLedgerAdapter_1 = class BlnkLedgerAdapter {
    constructor(configService, searchAdapter) {
        this.configService = configService;
        this.searchAdapter = searchAdapter;
        this.logger = new common_1.Logger(BlnkLedgerAdapter_1.name);
        this.generalLedgerId = null;
        this.customerWalletsLedgerId = null;
        this.USDC_PRECISION = 1000000;
        const blnkUrl = this.configService.get('blnk.url', 'http://localhost:5001');
        const blnkApiKey = this.configService.get('blnk.apiKey', '');
        this.client = (0, blnk_typescript_1.BlnkInit)(blnkApiKey, {
            baseUrl: blnkUrl,
        });
    }
    async onModuleInit() {
        await this.initialize();
    }
    async initialize() {
        this.logger.log('Initializing Blnk ledger...');
        try {
            this.generalLedgerId = await this.getOrCreateLedger(blnk_types_1.JOONAPAY_LEDGERS.GENERAL, { description: 'JoonaPay General Ledger - System accounts' });
            this.customerWalletsLedgerId = await this.getOrCreateLedger(blnk_types_1.JOONAPAY_LEDGERS.CUSTOMER_WALLETS, { description: 'JoonaPay Customer Wallets - User USDC balances' });
            this.logger.log('Blnk ledger initialized successfully');
            this.logger.log(`General Ledger ID: ${this.generalLedgerId}`);
            this.logger.log(`Customer Wallets Ledger ID: ${this.customerWalletsLedgerId}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to initialize Blnk ledger: ${errorMessage}`);
            throw error;
        }
    }
    async getOrCreateLedger(name, metaData) {
        try {
            const response = (await this.client.Ledgers.create({
                name,
                meta_data: metaData,
            }));
            if (response.data) {
                return response.data.ledger_id;
            }
            throw new Error('Failed to create ledger');
        }
        catch {
            this.logger.warn(`Ledger ${name} may already exist, using name as identifier`);
            return name;
        }
    }
    async createUserBalance(userId, currency) {
        if (!this.customerWalletsLedgerId) {
            throw new Error('Ledger not initialized');
        }
        this.logger.log(`Creating balance for user ${userId} in ${currency}`);
        const response = (await this.client.LedgerBalances.create({
            ledger_id: this.customerWalletsLedgerId,
            currency,
            meta_data: {
                user_id: userId,
                type: 'customer_wallet',
                created_by: 'joonapay',
            },
        }));
        if (!response.data) {
            throw new Error('Failed to create balance');
        }
        this.logger.log(`Created balance ${response.data.balance_id} for user ${userId}`);
        return response.data.balance_id;
    }
    async getUserBalance(userId, currency) {
        try {
            const balanceId = this.getUserBalanceId(userId, currency);
            const response = (await this.client.LedgerBalances.get(balanceId));
            if (!response.data) {
                return null;
            }
            const balance = response.data;
            return {
                balanceId: balance.balance_id,
                userId,
                currency: balance.currency,
                balance: this.toBigInt(balance.balance),
                creditBalance: this.toBigInt(balance.credit_balance),
                debitBalance: this.toBigInt(balance.debit_balance),
                inflightBalance: this.toBigInt(balance.inflight_balance),
                availableBalance: this.toBigInt(balance.balance - balance.inflight_debit_balance),
            };
        }
        catch {
            this.logger.warn(`Balance not found for user ${userId}`);
            return null;
        }
    }
    async getAvailableBalance(userId, currency) {
        const balance = await this.getUserBalance(userId, currency);
        return balance?.availableBalance ?? BigInt(0);
    }
    async recordDeposit(params) {
        const { userId, amount, currency, reference, description, provider, externalId, fee, metadata, } = params;
        this.logger.log(`Recording deposit: ${amount} ${currency} for user ${userId}`);
        const source = provider === 'yellowcard'
            ? blnk_types_1.JOONAPAY_INTERNAL_BALANCES.PAY_IN_YELLOWCARD
            : blnk_types_1.JOONAPAY_INTERNAL_BALANCES.PAY_IN_CIRCLE;
        const destination = this.getUserBalanceId(userId, currency);
        const response = (await this.client.Transactions.create({
            amount: this.toFloat(amount),
            reference,
            currency,
            precision: this.USDC_PRECISION,
            source,
            destination,
            description: description || `Deposit via ${provider}`,
            allow_overdraft: true,
            meta_data: {
                type: 'deposit',
                provider,
                external_id: externalId,
                user_id: userId,
                ...metadata,
            },
        }));
        if (fee && fee > BigInt(0)) {
            await this.recordFeeTransaction(destination, fee, currency, `${reference}-fee`, `Deposit fee for ${reference}`);
        }
        if (!response.data) {
            throw new Error('Failed to record deposit transaction');
        }
        return this.mapTransactionResult(response.data);
    }
    async recordWithdrawal(params) {
        const { userId, amount, currency, reference, description, provider, fee, inflight, metadata, } = params;
        this.logger.log(`Recording withdrawal: ${amount} ${currency} for user ${userId}`);
        const source = this.getUserBalanceId(userId, currency);
        const destination = provider === 'yellowcard'
            ? blnk_types_1.JOONAPAY_INTERNAL_BALANCES.PAY_OUT_YELLOWCARD
            : blnk_types_1.JOONAPAY_INTERNAL_BALANCES.PAY_OUT_CIRCLE;
        if (fee > BigInt(0)) {
            await this.recordFeeTransaction(source, fee, currency, `${reference}-fee`, `Withdrawal fee for ${reference}`);
        }
        const response = (await this.client.Transactions.create({
            amount: this.toFloat(amount),
            reference,
            currency,
            precision: this.USDC_PRECISION,
            source,
            destination,
            description: description || `Withdrawal via ${provider}`,
            inflight: inflight ?? true,
            allow_overdraft: true,
            meta_data: {
                type: 'withdrawal',
                provider,
                user_id: userId,
                fee: fee.toString(),
                ...metadata,
            },
        }));
        if (!response.data) {
            throw new Error('Failed to record withdrawal transaction');
        }
        return this.mapTransactionResult(response.data);
    }
    async recordP2PTransfer(params) {
        const { senderId, recipientId, amount, currency, reference, description, note, metadata, } = params;
        this.logger.log(`Recording P2P transfer: ${amount} ${currency} from ${senderId} to ${recipientId}`);
        const source = this.getUserBalanceId(senderId, currency);
        const destination = this.getUserBalanceId(recipientId, currency);
        const response = (await this.client.Transactions.create({
            amount: this.toFloat(amount),
            reference,
            currency,
            precision: this.USDC_PRECISION,
            source,
            destination,
            description: description || `P2P transfer${note ? `: ${note}` : ''}`,
            meta_data: {
                type: 'transfer_p2p',
                sender_id: senderId,
                recipient_id: recipientId,
                note,
                ...metadata,
            },
        }));
        if (!response.data) {
            throw new Error('Failed to record P2P transfer');
        }
        return this.mapTransactionResult(response.data);
    }
    async recordExternalTransfer(params) {
        const { userId, amount, currency, reference, destinationAddress, blockchain, fee, inflight, description, metadata, } = params;
        this.logger.log(`Recording external transfer: ${amount} ${currency} from ${userId} to ${destinationAddress}`);
        const source = this.getUserBalanceId(userId, currency);
        const destination = blnk_types_1.JOONAPAY_INTERNAL_BALANCES.PAY_OUT_CIRCLE;
        if (fee > BigInt(0)) {
            await this.recordFeeTransaction(source, fee, currency, `${reference}-fee`, `External transfer fee for ${reference}`);
        }
        const response = (await this.client.Transactions.create({
            amount: this.toFloat(amount),
            reference,
            currency,
            precision: this.USDC_PRECISION,
            source,
            destination,
            description: description ||
                `External transfer to ${destinationAddress.slice(0, 10)}...`,
            inflight: inflight ?? true,
            allow_overdraft: true,
            meta_data: {
                type: 'transfer_external',
                user_id: userId,
                destination_address: destinationAddress,
                blockchain,
                fee: fee.toString(),
                ...metadata,
            },
        }));
        if (!response.data) {
            throw new Error('Failed to record external transfer');
        }
        return this.mapTransactionResult(response.data);
    }
    async commitTransaction(transactionId) {
        this.logger.log(`Committing transaction ${transactionId}`);
        await this.client.Transactions.updateStatus(transactionId, {
            status: 'commit',
        });
    }
    async voidTransaction(transactionId) {
        this.logger.log(`Voiding transaction ${transactionId}`);
        await this.client.Transactions.updateStatus(transactionId, {
            status: 'void',
        });
    }
    async getTransactionByReference(reference) {
        this.logger.debug(`Looking up transaction by reference: ${reference}`);
        try {
            const result = await this.searchAdapter.searchTransactions({
                query: reference,
                filterBy: `reference:=${reference}`,
                perPage: 1,
            });
            if (result.found > 0 && result.hits.length > 0) {
                this.logger.debug(`Found transaction for reference: ${reference}`);
                return result.hits[0];
            }
            this.logger.debug(`No transaction found for reference: ${reference}`);
            return null;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to search for transaction by reference ${reference}: ${errorMessage}`);
            return null;
        }
    }
    async getUserTransactionHistory(userId, options) {
        this.logger.debug(`Fetching transaction history for user: ${userId}`);
        try {
            const balanceId = this.getUserBalanceId(userId, 'USD');
            let filterBy = `source:=${balanceId} || destination:=${balanceId}`;
            if (options?.type) {
                filterBy += ` && meta_data.type:=${options.type}`;
            }
            if (options?.startDate) {
                filterBy += ` && created_at:>=${options.startDate.getTime()}`;
            }
            if (options?.endDate) {
                filterBy += ` && created_at:<=${options.endDate.getTime()}`;
            }
            const limit = options?.limit || 50;
            const offset = options?.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const result = await this.searchAdapter.searchTransactions({
                query: '*',
                filterBy,
                sortBy: 'created_at:desc',
                page,
                perPage: limit,
            });
            return result.hits;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch transaction history for user ${userId}: ${errorMessage}`);
            return [];
        }
    }
    getUserBalanceId(userId, currency) {
        return `user-${userId}-${currency.toLowerCase()}`;
    }
    async recordFeeTransaction(source, amount, currency, reference, description) {
        await this.client.Transactions.create({
            amount: this.toFloat(amount),
            reference,
            currency,
            precision: this.USDC_PRECISION,
            source,
            destination: blnk_types_1.JOONAPAY_INTERNAL_BALANCES.FEES,
            description,
            meta_data: {
                type: 'fee',
            },
        });
    }
    toBigInt(value) {
        return BigInt(Math.round(value));
    }
    toFloat(value) {
        return Number(value) / this.USDC_PRECISION;
    }
    mapTransactionResult(response) {
        return {
            transactionId: response.transaction_id,
            reference: response.reference,
            status: this.mapStatus(response.status),
            source: response.source,
            destination: response.destination,
            amount: BigInt(response.precise_amount),
            currency: response.currency,
            description: response.description,
            createdAt: new Date(response.created_at),
            metadata: response.meta_data,
        };
    }
    mapStatus(status) {
        const statusMap = {
            QUEUED: 'queued',
            APPLIED: 'applied',
            REJECTED: 'rejected',
            INFLIGHT: 'inflight',
            VOID: 'void',
            COMMIT: 'committed',
        };
        return statusMap[status];
    }
};
exports.BlnkLedgerAdapter = BlnkLedgerAdapter;
exports.BlnkLedgerAdapter = BlnkLedgerAdapter = BlnkLedgerAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => blnk_search_adapter_1.BlnkSearchAdapter))),
    __metadata("design:paramtypes", [config_1.ConfigService,
        blnk_search_adapter_1.BlnkSearchAdapter])
], BlnkLedgerAdapter);
//# sourceMappingURL=blnk-ledger.adapter.js.map