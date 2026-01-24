import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

// ORM Entities
import { WalletOrmEntity } from './infrastructure/orm-entities/wallet.orm-entity';

// Repositories
import { WalletRepository } from './infrastructure/repositories/wallet.repository';

// Mappers
import { WalletMapper } from './infrastructure/mappers/wallet.mapper';

// Use Cases
import {
  CreateWalletUseCase,
  UpdateWalletUseCase,
  DeleteWalletUseCase,
  GetBalanceUseCase,
  GetDepositChannelsUseCase,
  InitiateDepositUseCase,
  InternalTransferUseCase,
  ExternalTransferUseCase,
  GetRateUseCase,
  SubmitKycUseCase,
  GetKycStatusUseCase,
} from './application/usecases';

// Controllers
import { WalletController } from './application/controllers/wallet.controller';

// Other modules needed
import { TransactionModule } from '../transaction/transaction.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletOrmEntity]),
    CqrsModule,
    forwardRef(() => TransactionModule),
    forwardRef(() => UserModule),
  ],
  providers: [
    // Repositories
    WalletRepository,
    // Mappers
    WalletMapper,
    // Use Cases
    CreateWalletUseCase,
    UpdateWalletUseCase,
    DeleteWalletUseCase,
    GetBalanceUseCase,
    GetDepositChannelsUseCase,
    InitiateDepositUseCase,
    InternalTransferUseCase,
    ExternalTransferUseCase,
    GetRateUseCase,
    SubmitKycUseCase,
    GetKycStatusUseCase,
  ],
  controllers: [WalletController],
  exports: [
    WalletRepository,
    CreateWalletUseCase,
    InternalTransferUseCase,
    ExternalTransferUseCase,
  ],
})
export class WalletModule {}
