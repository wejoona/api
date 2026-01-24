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
    constructor(reconciliationProvider, eventEmitter) {
        this.reconciliationProvider = reconciliationProvider;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(ReconciliationService_1.name);
    }
    async onModuleInit() {
        try {
            await this.setupMatchingRules();
        }
        catch (error) {
            this.logger.error(`Failed to setup matching rules: ${error}`);
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
};
exports.ReconciliationService = ReconciliationService;
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
    __metadata("design:paramtypes", [Object, event_emitter_1.EventEmitter2])
], ReconciliationService);
//# sourceMappingURL=reconciliation.service.js.map