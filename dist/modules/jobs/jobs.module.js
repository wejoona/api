"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const orm_entities_1 = require("../transaction/infrastructure/orm-entities");
const scheduled_job_entity_1 = require("../admin/infrastructure/persistence/typeorm/entities/scheduled-job.entity");
const audit_log_entity_1 = require("../admin/infrastructure/persistence/typeorm/entities/audit-log.entity");
const scheduled_jobs_service_1 = require("./services/scheduled-jobs.service");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                orm_entities_1.TransactionOrmEntity,
                scheduled_job_entity_1.ScheduledJobEntity,
                audit_log_entity_1.AuditLogEntity,
            ]),
        ],
        providers: [scheduled_jobs_service_1.ScheduledJobsService],
        exports: [scheduled_jobs_service_1.ScheduledJobsService],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map