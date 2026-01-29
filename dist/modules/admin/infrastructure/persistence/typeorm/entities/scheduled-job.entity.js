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
exports.ScheduledJobEntity = void 0;
const typeorm_1 = require("typeorm");
let ScheduledJobEntity = class ScheduledJobEntity {
};
exports.ScheduledJobEntity = ScheduledJobEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ScheduledJobEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'job_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], ScheduledJobEntity.prototype, "jobName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], ScheduledJobEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJobEntity.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJobEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'records_processed', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], ScheduledJobEntity.prototype, "recordsProcessed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], ScheduledJobEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ScheduledJobEntity.prototype, "createdAt", void 0);
exports.ScheduledJobEntity = ScheduledJobEntity = __decorate([
    (0, typeorm_1.Entity)('scheduled_jobs'),
    (0, typeorm_1.Index)(['jobName']),
    (0, typeorm_1.Index)(['status'])
], ScheduledJobEntity);
//# sourceMappingURL=scheduled-job.entity.js.map