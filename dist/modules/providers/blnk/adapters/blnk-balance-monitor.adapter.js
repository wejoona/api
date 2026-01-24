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
var BlnkBalanceMonitorAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlnkBalanceMonitorAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const blnk_typescript_1 = require("@blnkfinance/blnk-typescript");
let BlnkBalanceMonitorAdapter = BlnkBalanceMonitorAdapter_1 = class BlnkBalanceMonitorAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(BlnkBalanceMonitorAdapter_1.name);
        this.USDC_PRECISION = 1000000;
        const blnkUrl = this.configService.get('blnk.url', 'http://localhost:5001');
        const blnkApiKey = this.configService.get('blnk.apiKey', '');
        this.client = (0, blnk_typescript_1.BlnkInit)(blnkApiKey, { baseUrl: blnkUrl });
    }
    async createMonitor(params) {
        this.logger.log(`Creating balance monitor for balance: ${params.balanceId}`);
        const response = (await this.client.BalanceMonitor.create({
            balance_id: params.balanceId,
            condition: {
                field: params.field,
                operator: params.operator,
                value: Number(params.value),
                precision: this.USDC_PRECISION,
            },
            description: params.description,
        }));
        if (!response.data) {
            throw new Error(`Failed to create balance monitor: ${response.message}`);
        }
        return this.mapToMonitorInfo(response.data);
    }
    async getMonitor(monitorId) {
        this.logger.debug(`Getting balance monitor: ${monitorId}`);
        const response = (await this.client.BalanceMonitor.get(monitorId));
        if (!response.data) {
            return null;
        }
        return this.mapToMonitorInfo(response.data);
    }
    async listMonitors() {
        this.logger.debug('Listing all balance monitors');
        const response = (await this.client.BalanceMonitor.list());
        if (!response.data) {
            return [];
        }
        return response.data.map((m) => this.mapToMonitorInfo(m));
    }
    async updateMonitor(monitorId, params) {
        this.logger.log(`Updating balance monitor: ${monitorId}`);
        const existing = await this.getMonitor(monitorId);
        if (!existing) {
            throw new Error(`Balance monitor not found: ${monitorId}`);
        }
        const response = (await this.client.BalanceMonitor.update(monitorId, {
            balance_id: params.balanceId ?? existing.balanceId,
            condition: {
                field: (params.field ?? existing.field),
                operator: (params.operator ?? existing.operator),
                value: params.value ? Number(params.value) : Number(existing.value),
                precision: this.USDC_PRECISION,
            },
            description: params.description ?? existing.description,
        }));
        if (!response.data) {
            throw new Error(`Failed to update balance monitor: ${response.message}`);
        }
        return this.mapToMonitorInfo(response.data);
    }
    deleteMonitor(_monitorId) {
        this.logger.warn(`Delete monitor not supported by Blnk SDK: ${_monitorId}`);
        return Promise.reject(new Error('Delete monitor not yet supported by Blnk SDK'));
    }
    mapToMonitorInfo(monitor) {
        return {
            monitorId: monitor.monitor_id,
            balanceId: monitor.balance_id,
            field: monitor.condition.field,
            operator: monitor.condition.operator,
            value: BigInt(monitor.condition.value),
            description: monitor.description,
            createdAt: new Date(monitor.created_at),
        };
    }
};
exports.BlnkBalanceMonitorAdapter = BlnkBalanceMonitorAdapter;
exports.BlnkBalanceMonitorAdapter = BlnkBalanceMonitorAdapter = BlnkBalanceMonitorAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BlnkBalanceMonitorAdapter);
//# sourceMappingURL=blnk-balance-monitor.adapter.js.map