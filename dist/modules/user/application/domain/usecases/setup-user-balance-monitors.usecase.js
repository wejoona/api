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
var SetupUserBalanceMonitorsUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupUserBalanceMonitorsUseCase = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const interfaces_1 = require("../../../../providers/interfaces");
const blnk_1 = require("../../../../providers/blnk");
let SetupUserBalanceMonitorsUseCase = SetupUserBalanceMonitorsUseCase_1 = class SetupUserBalanceMonitorsUseCase {
    constructor(monitorProvider, configService, eventEmitter) {
        this.monitorProvider = monitorProvider;
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SetupUserBalanceMonitorsUseCase_1.name);
        this.webhookBaseUrl = this.configService.get('app.webhookUrl', 'http://localhost:3000');
    }
    async execute(input) {
        this.logger.log(`Setting up balance monitors for user: ${input.userId}`);
        const monitors = [];
        try {
            const lowBalanceMonitor = await this.monitorProvider.createMonitor({
                balanceId: input.balanceId,
                field: blnk_1.JOONAPAY_MONITORS.LOW_BALANCE_WARNING.field,
                operator: blnk_1.JOONAPAY_MONITORS.LOW_BALANCE_WARNING.operator,
                value: BigInt(blnk_1.JOONAPAY_MONITORS.LOW_BALANCE_WARNING.value),
                description: `${blnk_1.JOONAPAY_MONITORS.LOW_BALANCE_WARNING.description} - User: ${input.userId}`,
            });
            monitors.push({
                type: 'LOW_BALANCE_WARNING',
                monitorId: lowBalanceMonitor.monitorId,
            });
            this.logger.debug(`Created low balance monitor: ${lowBalanceMonitor.monitorId}`);
        }
        catch (error) {
            this.logger.error(`Failed to create low balance monitor: ${error}`);
        }
        try {
            const highDebitMonitor = await this.monitorProvider.createMonitor({
                balanceId: input.balanceId,
                field: blnk_1.JOONAPAY_MONITORS.HIGH_DEBIT_ALERT.field,
                operator: blnk_1.JOONAPAY_MONITORS.HIGH_DEBIT_ALERT.operator,
                value: BigInt(blnk_1.JOONAPAY_MONITORS.HIGH_DEBIT_ALERT.value),
                description: `${blnk_1.JOONAPAY_MONITORS.HIGH_DEBIT_ALERT.description} - User: ${input.userId}`,
            });
            monitors.push({
                type: 'HIGH_DEBIT_ALERT',
                monitorId: highDebitMonitor.monitorId,
            });
            this.logger.debug(`Created high debit monitor: ${highDebitMonitor.monitorId}`);
        }
        catch (error) {
            this.logger.error(`Failed to create high debit monitor: ${error}`);
        }
        try {
            const amlMonitor = await this.monitorProvider.createMonitor({
                balanceId: input.balanceId,
                field: blnk_1.JOONAPAY_MONITORS.AML_DAILY_LIMIT.field,
                operator: blnk_1.JOONAPAY_MONITORS.AML_DAILY_LIMIT.operator,
                value: BigInt(blnk_1.JOONAPAY_MONITORS.AML_DAILY_LIMIT.value),
                description: `${blnk_1.JOONAPAY_MONITORS.AML_DAILY_LIMIT.description} - User: ${input.userId}`,
            });
            monitors.push({
                type: 'AML_DAILY_LIMIT',
                monitorId: amlMonitor.monitorId,
            });
            this.logger.debug(`Created AML limit monitor: ${amlMonitor.monitorId}`);
        }
        catch (error) {
            this.logger.error(`Failed to create AML limit monitor: ${error}`);
        }
        this.eventEmitter.emit('user.balance-monitors.setup', {
            userId: input.userId,
            balanceId: input.balanceId,
            monitors,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Setup ${monitors.length} balance monitors for user: ${input.userId}`);
        return { monitors };
    }
};
exports.SetupUserBalanceMonitorsUseCase = SetupUserBalanceMonitorsUseCase;
exports.SetupUserBalanceMonitorsUseCase = SetupUserBalanceMonitorsUseCase = SetupUserBalanceMonitorsUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(interfaces_1.BALANCE_MONITOR_PROVIDER)),
    __metadata("design:paramtypes", [Object, config_1.ConfigService,
        event_emitter_1.EventEmitter2])
], SetupUserBalanceMonitorsUseCase);
//# sourceMappingURL=setup-user-balance-monitors.usecase.js.map