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
var BlnkReconciliationAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlnkReconciliationAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const blnk_typescript_1 = require("@blnkfinance/blnk-typescript");
const fs_1 = require("fs");
let BlnkReconciliationAdapter = BlnkReconciliationAdapter_1 = class BlnkReconciliationAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(BlnkReconciliationAdapter_1.name);
        const blnkUrl = this.configService.get('blnk.url', 'http://localhost:5001');
        const blnkApiKey = this.configService.get('blnk.apiKey', '');
        this.client = (0, blnk_typescript_1.BlnkInit)(blnkApiKey, { baseUrl: blnkUrl });
    }
    async uploadExternalData(filePath, source) {
        this.logger.log(`Uploading external data for reconciliation: ${source}`);
        const fileStream = (0, fs_1.createReadStream)(filePath);
        const response = (await this.client.Reconciliation.upload(fileStream, source));
        if (!response.data) {
            throw new Error(`Failed to upload reconciliation data: ${response.message}`);
        }
        this.logger.log(`Uploaded reconciliation data, upload_id: ${response.data.upload_id}`);
        return response.data.upload_id;
    }
    async createMatchingRule(params) {
        this.logger.log(`Creating matching rule: ${params.name}`);
        const matcherRequest = {
            name: params.name,
            description: params.description,
            criteria: params.criteria.map((c) => ({
                field: c.field,
                operator: c.operator,
                allowable_drift: c.allowableDrift ?? 0,
            })),
        };
        const response = (await this.client.Reconciliation.createMatchingRule(matcherRequest));
        if (!response.data) {
            throw new Error(`Failed to create matching rule: ${response.message}`);
        }
        const ruleId = response.data.rule_id;
        this.logger.log(`Created matching rule: ${ruleId}`);
        return ruleId;
    }
    async runReconciliation(params) {
        this.logger.log(`Running reconciliation for upload: ${params.uploadId}`);
        const runRequest = {
            upload_id: params.uploadId,
            strategy: params.strategy,
            dry_run: params.dryRun ?? false,
            grouping_criteria: params.groupingCriteria,
            matching_rule_ids: params.matchingRuleIds,
        };
        const response = (await this.client.Reconciliation.run(runRequest));
        if (!response.data) {
            throw new Error(`Failed to run reconciliation: ${response.message}`);
        }
        const result = response.data;
        return {
            reconciliationId: result.reconciliation_id,
            status: result.status,
            matchedCount: result.matched_count ?? 0,
            unmatchedCount: result.unmatched_count ?? 0,
            createdAt: new Date(result.created_at),
        };
    }
};
exports.BlnkReconciliationAdapter = BlnkReconciliationAdapter;
exports.BlnkReconciliationAdapter = BlnkReconciliationAdapter = BlnkReconciliationAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BlnkReconciliationAdapter);
//# sourceMappingURL=blnk-reconciliation.adapter.js.map