import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { FeatureFlagOrmEntity } from './infrastructure/orm-entities/feature-flag.orm-entity';
import { FeatureFlagRepository } from './domain/repositories/feature-flag.repository';
import { TypeOrmFeatureFlagRepository } from './infrastructure/repositories/feature-flag.repository';
import { FeatureFlagMapper } from './infrastructure/mappers/feature-flag.mapper';
import { FeatureFlagService } from './application/services/feature-flag.service';
import {
  FeatureFlagController,
  AdminFeatureFlagController,
} from './application/controllers/feature-flag.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureFlagOrmEntity]),
    CacheModule.register({
      ttl: 300, // 5 minutes
    }),
  ],
  controllers: [FeatureFlagController, AdminFeatureFlagController],
  providers: [
    FeatureFlagMapper,
    FeatureFlagService,
    {
      provide: FeatureFlagRepository,
      useClass: TypeOrmFeatureFlagRepository,
    },
  ],
  exports: [FeatureFlagService, FeatureFlagRepository],
})
export class FeatureFlagModule {}
