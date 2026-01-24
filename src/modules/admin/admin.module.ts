import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities';
import { AuditLogEntity } from './infrastructure/persistence/typeorm/entities/audit-log.entity';
import { SystemMetricEntity } from './infrastructure/persistence/typeorm/entities/system-metric.entity';
import { ScheduledJobEntity } from './infrastructure/persistence/typeorm/entities/scheduled-job.entity';
import { AdminController } from './application/controllers/admin.controller';
import { AdminService } from './application/services/admin.service';
import { AuditService } from './application/services/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserOrmEntity,
      AuditLogEntity,
      SystemMetricEntity,
      ScheduledJobEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AuditService],
  exports: [AdminService, AuditService],
})
export class AdminModule {}
