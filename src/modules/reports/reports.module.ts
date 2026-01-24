import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities';
import { WalletOrmEntity } from '@modules/wallet/infrastructure/orm-entities';
import { ReportsController } from './application/controllers/reports.controller';
import { ReportsService } from './application/services/reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionOrmEntity,
      UserOrmEntity,
      WalletOrmEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
