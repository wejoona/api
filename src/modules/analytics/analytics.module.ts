import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './application/controllers/analytics.controller';
import { AnalyticsService } from './application/services/analytics.service';
import { AnalyticsRepository } from './domain/repositories/analytics.repository';
import { TypeOrmAnalyticsRepository } from './infrastructure/repositories/typeorm-analytics.repository';
import { TransactionOrmEntity } from '../transaction/infrastructure/orm-entities/transaction.orm-entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionOrmEntity]), WalletModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    {
      provide: AnalyticsRepository,
      useClass: TypeOrmAnalyticsRepository,
    },
  ],
  exports: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
