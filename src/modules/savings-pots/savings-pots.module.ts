import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import { SavingsPotOrmEntity } from './infrastructure/orm-entities/savings-pot.orm-entity';

// Repositories
import { SavingsPotRepository } from './infrastructure/repositories/savings-pot.repository';
import { SAVINGS_POT_REPOSITORY } from './domain/repositories/savings-pot.repository';

// Mappers
import { SavingsPotMapper } from './infrastructure/mappers/savings-pot.mapper';

// Use Cases
import {
  CreateSavingsPotUseCase,
  GetSavingsPotsUseCase,
  UpdateSavingsPotUseCase,
  DepositToSavingsPotUseCase,
  WithdrawFromSavingsPotUseCase,
  CancelSavingsPotUseCase,
} from './application/usecases';

// Controllers
import { SavingsPotController } from './application/controllers/savings-pot.controller';

// Wallet module for repository access
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SavingsPotOrmEntity]),
    forwardRef(() => WalletModule),
  ],
  controllers: [SavingsPotController],
  providers: [
    // Repositories
    SavingsPotRepository,
    {
      provide: SAVINGS_POT_REPOSITORY,
      useExisting: SavingsPotRepository,
    },
    // Mappers
    SavingsPotMapper,
    // Use Cases
    CreateSavingsPotUseCase,
    GetSavingsPotsUseCase,
    UpdateSavingsPotUseCase,
    DepositToSavingsPotUseCase,
    WithdrawFromSavingsPotUseCase,
    CancelSavingsPotUseCase,
  ],
  exports: [SavingsPotRepository, SAVINGS_POT_REPOSITORY],
})
export class SavingsPotsModule {}
