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
exports.SystemMetricEntity = void 0;
const typeorm_1 = require("typeorm");
let SystemMetricEntity = class SystemMetricEntity {
};
exports.SystemMetricEntity = SystemMetricEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SystemMetricEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metric_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], SystemMetricEntity.prototype, "metricName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'metric_value', type: 'decimal', precision: 18, scale: 6 }),
    __metadata("design:type", Number)
], SystemMetricEntity.prototype, "metricValue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'metric_type',
        type: 'varchar',
        length: 20,
        default: 'counter',
    }),
    __metadata("design:type", String)
], SystemMetricEntity.prototype, "metricType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SystemMetricEntity.prototype, "dimensions", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'recorded_at' }),
    __metadata("design:type", Date)
], SystemMetricEntity.prototype, "recordedAt", void 0);
exports.SystemMetricEntity = SystemMetricEntity = __decorate([
    (0, typeorm_1.Entity)('system_metrics'),
    (0, typeorm_1.Index)(['metricName']),
    (0, typeorm_1.Index)(['recordedAt'])
], SystemMetricEntity);
//# sourceMappingURL=system-metric.entity.js.map