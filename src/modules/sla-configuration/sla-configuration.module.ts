import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlaConfigurationOrmEntity } from './infrastructure/orm-entities/sla-configuration.orm-entity';
import { SlaConfigurationRepository } from './domain/repositories/sla-configuration.repository';
import { TypeOrmSlaConfigurationRepository } from './infrastructure/repositories/sla-configuration.repository';
import { SlaConfigurationMapper } from './infrastructure/mappers/sla-configuration.mapper';
import { SlaConfigurationService } from './application/services/sla-configuration.service';
import { SlaTrackingService } from './application/services/sla-tracking.service';
import { SlaConfigurationController } from './application/controllers/sla-configuration.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SlaConfigurationOrmEntity])],
  controllers: [SlaConfigurationController],
  providers: [
    SlaConfigurationMapper,
    SlaConfigurationService,
    SlaTrackingService,
    {
      provide: SlaConfigurationRepository,
      useClass: TypeOrmSlaConfigurationRepository,
    },
  ],
  exports: [SlaConfigurationService, SlaTrackingService, SlaConfigurationRepository],
})
export class SlaConfigurationModule {}
