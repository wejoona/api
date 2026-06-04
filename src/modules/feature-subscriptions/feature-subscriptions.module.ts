import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureSubscriptionController } from './application/controllers';
import { FeatureSubscriptionService } from './application/services';
import { FeatureSubscriptionRepository } from './domain/repositories';
import { FeatureSubscriptionOrmEntity } from './infrastructure/orm-entities';
import { TypeOrmFeatureSubscriptionRepository } from './infrastructure/repositories';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureSubscriptionOrmEntity])],
  controllers: [FeatureSubscriptionController],
  providers: [
    FeatureSubscriptionService,
    {
      provide: FeatureSubscriptionRepository,
      useClass: TypeOrmFeatureSubscriptionRepository,
    },
  ],
  exports: [FeatureSubscriptionService, FeatureSubscriptionRepository],
})
export class FeatureSubscriptionsModule {}
