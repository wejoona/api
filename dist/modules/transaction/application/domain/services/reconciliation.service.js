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
var ReconciliationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const interfaces_1 = require("../../../../providers/interfaces");
let ReconciliationService = ReconciliationService_1 = class ReconciliationService {
    constructor(reconciliationProvider, ledgerProvider, walletProvider, walletRepository, eventEmitter) {
        this.reconciliationProvider = reconciliationProvider;
        this.ledgerProvider = ledgerProvider;
        this.walletProvider = walletProvider;
        this.walletRepository = walletRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(ReconciliationService_1.name);
        this.CRITICAL_THRESHOLD = 1000000n;
        this.HIGH_THRESHOLD = 100000n;
        this.MEDIUM_THRESHOLD = 10000n;
        this.USDC_PRECISION = 1_000_000;
    }
    async onModuleInit() {
        try {
            await this.setupMatchingRules();
        }
        catch (error) {
            this.logger.error(`Failed to setup matching rules: ${error}`);
        }
    }
    async reconcileUserBalance(userId) {
        this.logger.log(`Reconciling balance for user ${userId}`);
        const startTime = Date.now();
        const timestamp = new Date();
        try {
            const wallet = await this.walletRepository.findByUserId(userId);
            if (!wallet) {
                throw new Error(`Wallet not found for user ${userId}`);
            }
            const walletId = wallet.id;
            const currency = wallet.currency;
            const circleWalletId = wallet.circleWalletId;
            let blnkBalance = 0n;
            try {
                const blnkBalanceInfo = await this.ledgerProvider.getUserBalance(userId, currency);
                blnkBalance = blnkBalanceInfo?.balance ?? 0n;
            }
            catch (error) {
                this.logger.error(`Failed to get Blnk balance for user ${userId}: ${error}`);
            }
            const databaseBalance = BigInt(Math.round(wallet.balance * this.USDC_PRECISION));
            let circleBalance = 0n;
            if (circleWalletId) {
                try {
                    const circleBalances = await this.walletProvider.getBalance(circleWalletId);
                    const usdcBalance = circleBalances.find((b) => b.currency === 'USDC');
                    if (usdcBalance) {
                        circleBalance = BigInt(Math.round(parseFloat(usdcBalance.available) * this.USDC_PRECISION));
                    }
                }
                catch (error) {
                    this.logger.error(`Failed to get Circle balance for user ${userId}: ${error}`);
                }
            }
            const blnkDiff = blnkBalance - databaseBalance;
            const circleDiff = circleBalance - databaseBalance;
            const totalDiff = this.calculateMaxDifference(blnkBalance, databaseBalance, circleBalance);
            const isReconciled = totalDiff === 0n;
            const report = {
                userId,
                walletId,
                currency,
                blnkBalance: this.formatBalance(blnkBalance),
                databaseBalance: this.formatBalance(databaseBalance),
                circleBalance: this.formatBalance(circleBalance),
                isReconciled,
                timestamp,
            };
            if (!isReconciled) {
                const severity = this.calculateSeverity(totalDiff);
                const discrepancy = {
                    userId,
                    walletId,
                    currency,
                    blnkBalance: this.formatBalance(blnkBalance),
                    databaseBalance: this.formatBalance(databaseBalance),
                    circleBalance: this.formatBalance(circleBalance),
                    blnkDiff: this.formatBalance(blnkDiff),
                    circleDiff: this.formatBalance(circleDiff),
                    totalDiff: this.formatBalance(totalDiff),
                    timestamp,
                    severity,
                };
                report.discrepancy = discrepancy;
                this.eventEmitter.emit('reconciliation.balance.discrepancy', {
                    discrepancy,
                    userId,
                    walletId,
                });
                if (severity === 'critical' || severity === 'high') {
                    this.eventEmitter.emit('reconciliation.balance.critical', {
                        discrepancy,
                        userId,
                        walletId,
                    });
                }
            }
            const duration = Date.now() - startTime;
            this.logger.log(`Reconciliation for user ${userId} completed in ${duration}ms - ${isReconciled ? 'RECONCILED' : 'DISCREPANCY FOUND'}`);
            return report;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to reconcile user ${userId}: ${errorMessage}`);
            return {
                userId,
                walletId: 'unknown',
                currency: 'USDC',
                blnkBalance: '0.00',
                databaseBalance: '0.00',
                circleBalance: '0.00',
                isReconciled: false,
                timestamp,
                error: errorMessage,
            };
        }
    }
    async reconcileAllBalances() {
        this.logger.log('Starting full balance reconciliation...');
        const startTime = Date.now();
        const timestamp = new Date();
        try {
            const wallets = await this.walletRepository.findAll();
            const activeWallets = wallets.filter((w) => w.status === 'active');
            this.logger.log(`Reconciling ${activeWallets.length} active wallets...`);
            const discrepancies = [];
            const errors = [];
            let reconciledCount = 0;
            for (const wallet of activeWallets) {
                try {
                    const report = await this.reconcileUserBalance(wallet.userId);
                    if (report.isReconciled) {
                        reconciledCount++;
                    }
                    else if (report.discrepancy) {
                        discrepancies.push(report.discrepancy);
                    }
                    if (report.error) {
                        errors.push({
                            userId: wallet.userId,
                            walletId: wallet.id,
                            error: report.error,
                        });
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    this.logger.error(`Failed to reconcile wallet ${wallet.id}: ${errorMessage}`);
                    errors.push({
                        userId: wallet.userId,
                        walletId: wallet.id,
                        error: errorMessage,
                    });
                }
            }
            const duration = Date.now() - startTime;
            const report = {
                totalWallets: activeWallets.length,
                reconciledWallets: reconciledCount,
                discrepancies,
                errors,
                timestamp,
                duration,
            };
            this.eventEmitter.emit('reconciliation.balance.completed', report);
            this.logger.log(`Balance reconciliation completed in ${duration}ms: ${reconciledCount}/${activeWallets.length} reconciled, ${discrepancies.length} discrepancies, ${errors.length} errors`);
            const criticalDiscrepancies = discrepancies.filter((d) => d.severity === 'critical');
            if (criticalDiscrepancies.length > 0) {
                this.logger.warn(`CRITICAL: ${criticalDiscrepancies.length} wallets have discrepancies >= $1`);
                this.eventEmitter.emit('reconciliation.balance.critical.summary', {
                    count: criticalDiscrepancies.length,
                    discrepancies: criticalDiscrepancies,
                    timestamp,
                });
            }
            return report;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Full balance reconciliation failed: ${errorMessage}`);
            const duration = Date.now() - startTime;
            return {
                totalWallets: 0,
                reconciledWallets: 0,
                discrepancies: [],
                errors: [{ userId: 'system', walletId: 'system', error: errorMessage }],
                timestamp,
                duration,
            };
        }
    }
    async setupMatchingRules() {
        try {
            this.yellowCardRuleId =
                await this.reconciliationProvider.createMatchingRule({
                    name: 'YellowCard Transaction Match',
                    description: 'Match Yellow Card transactions by reference and amount',
                    criteria: [
                        { field: 'reference', operator: 'equals' },
                        { field: 'amount', operator: 'equals', allowableDrift: 0.01 },
                        { field: 'currency', operator: 'equals' },
                    ],
                });
            this.logger.log(`Created Yellow Card matching rule: ${this.yellowCardRuleId}`);
        }
        catch (error) {
            this.logger.warn(`Yellow Card matching rule may already exist: ${error}`);
        }
        try {
            this.circleRuleId = await this.reconciliationProvider.createMatchingRule({
                name: 'Circle Transaction Match',
                description: 'Match Circle USDC transactions by reference and exact amount',
                criteria: [
                    { field: 'reference', operator: 'equals' },
                    { field: 'amount', operator: 'equals', allowableDrift: 0 },
                    { field: 'currency', operator: 'equals' },
                ],
            });
            this.logger.log(`Created Circle matching rule: ${this.circleRuleId}`);
        }
        catch (error) {
            this.logger.warn(`Circle matching rule may already exist: ${error}`);
        }
    }
    reconcileYellowCard() {
        this.logger.log('Starting Yellow Card reconciliation...');
        if (!this.yellowCardRuleId) {
            this.logger.error('Yellow Card matching rule not initialized');
            return Promise.resolve(null);
        }
        try {
            this.eventEmitter.emit('reconciliation.yellowcard.pending', {
                source: 'yellowcard',
                timestamp: new Date().toISOString(),
                message: 'Yellow Card reconciliation pending - upload settlement report',
            });
            return Promise.resolve(null);
        }
        catch (error) {
            this.logger.error(`Yellow Card reconciliation failed: ${error}`);
            this.eventEmitter.emit('reconciliation.failed', {
                source: 'yellowcard',
                error: String(error),
                timestamp: new Date().toISOString(),
            });
            return Promise.resolve(null);
        }
    }
    reconcileCircle() {
        this.logger.log('Starting Circle reconciliation...');
        if (!this.circleRuleId) {
            this.logger.error('Circle matching rule not initialized');
            return Promise.resolve(null);
        }
        try {
            this.eventEmitter.emit('reconciliation.circle.pending', {
                source: 'circle',
                timestamp: new Date().toISOString(),
                message: 'Circle reconciliation pending - fetch transaction history',
            });
            return Promise.resolve(null);
        }
        catch (error) {
            this.logger.error(`Circle reconciliation failed: ${error}`);
            this.eventEmitter.emit('reconciliation.failed', {
                source: 'circle',
                error: String(error),
                timestamp: new Date().toISOString(),
            });
            return Promise.resolve(null);
        }
    }
    async runReconciliation(source, filePath) {
        this.logger.log(`Running ${source} reconciliation with file: ${filePath}`);
        const ruleId = source === 'yellowcard' ? this.yellowCardRuleId : this.circleRuleId;
        if (!ruleId) {
            throw new Error(`Matching rule not initialized for ${source}`);
        }
        const uploadId = await this.reconciliationProvider.uploadExternalData(filePath, source);
        this.logger.log(`Uploaded reconciliation data: ${uploadId}`);
        const result = await this.reconciliationProvider.runReconciliation({
            uploadId,
            strategy: 'one_to_one',
            dryRun: false,
            matchingRuleIds: [ruleId],
        });
        const report = {
            source,
            reconciliationId: result.reconciliationId,
            status: result.status,
            matchedCount: result.matchedCount,
            unmatchedCount: result.unmatchedCount,
            timestamp: result.createdAt,
        };
        if (result.unmatchedCount > 0) {
            this.eventEmitter.emit('reconciliation.discrepancy', {
                ...report,
                message: `${result.unmatchedCount} unmatched transactions found`,
            });
        }
        this.eventEmitter.emit('reconciliation.completed', report);
        this.logger.log(`Reconciliation completed: ${result.matchedCount} matched, ${result.unmatchedCount} unmatched`);
        return report;
    }
    getStatus() {
        return {
            yellowCardRuleId: this.yellowCardRuleId,
            circleRuleId: this.circleRuleId,
            initialized: !!(this.yellowCardRuleId && this.circleRuleId),
        };
    }
    calculateMaxDifference(blnk, db, circle) {
        const blnkDiff = blnk > db ? blnk - db : db - blnk;
        const circleDiff = circle > db ? circle - db : db - circle;
        const blnkCircleDiff = blnk > circle ? blnk - circle : circle - blnk;
        return blnkDiff > circleDiff
            ? blnkDiff > blnkCircleDiff
                ? blnkDiff
                : blnkCircleDiff
            : circleDiff > blnkCircleDiff
                ? circleDiff
                : blnkCircleDiff;
    }
    calculateSeverity(difference) {
        const absDiff = difference < 0n ? -difference : difference;
        if (absDiff >= this.CRITICAL_THRESHOLD) {
            return 'critical';
        }
        else if (absDiff >= this.HIGH_THRESHOLD) {
            return 'high';
        }
        else if (absDiff >= this.MEDIUM_THRESHOLD) {
            return 'medium';
        }
        return 'low';
    }
    formatBalance(balance) {
        const value = Number(balance) / this.USDC_PRECISION;
        return value.toFixed(6);
    }
};
exports.ReconciliationService = ReconciliationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_1AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconciliationService.prototype, "reconcileAllBalances", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconciliationService.prototype, "reconcileYellowCard", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReconciliationService.prototype, "reconcileCircle", null);
exports.ReconciliationService = ReconciliationService = ReconciliationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(interfaces_1.RECONCILIATION_PROVIDER)),
    __param(1, (0, common_1.Inject)(interfaces_1.LEDGER_PROVIDER)),
    __param(2, (0, common_1.Inject)(interfaces_1.WALLET_PROVIDER)),
    __param(3, (0, common_1.Inject)('WALLET_REPOSITORY')),
    __metadata("design:paramtypes", [Object, Object, Object, Object, event_emitter_1.EventEmitter2])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map