import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { StellarModule } from '../providers/stellar/stellar.module';

// ORM Entities
import { WalletOrmEntity } from './infrastructure/orm-entities/wallet.orm-entity';

// Repositories
import { WalletRepository } from './infrastructure/repositories/wallet.repository';
import { WALLET_REPOSITORY } from './domain/repositories/wallet.repository';

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
  VerifyPinUseCase,
  SetPinUseCase,
  ExportTransactionsUseCase,
  GetWalletLimitsUseCase,
} from './application/usecases';

// Controllers
import { WalletController } from './application/controllers/wallet.controller';
import { ExportController } from './application/controllers/export.controller';

// Services
import { OmnibusService } from './application/services/omnibus.service';

// Other modules needed
import { TransactionModule } from '../transaction/transaction.module';
import { UserModule } from '../user/user.module';
import { SavingsPotsModule } from '../savings-pots/savings-pots.module';
import { UploadModule } from '../upload';
import { CircleModule } from '../providers/circle/circle.module';
import { BlnkModule } from '../providers/blnk/blnk.module';
import { RiskModule } from '../risk/risk.module';

// Guards
import {
  PinVerificationGuard,
  PinTokenService,
} from '../../common/guards/pin-verification.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletOrmEntity]),
    CqrsModule,
    forwardRef(() => TransactionModule),
    forwardRef(() => UserModule),
    UploadModule,
    CircleModule,
    BlnkModule,
    RiskModule, // Circle Compliance Engine for address screening
    StellarModule,
    forwardRef(() => SavingsPotsModule),
  ],
  providers: [
    // Repositories
    WalletRepository,
    // Alias for dependency injection by token (Symbol)
    {
      provide: WALLET_REPOSITORY,
      useExisting: WalletRepository,
    },
    // Mappers
    WalletMapper,
    // Guards & Services
    PinVerificationGuard,
    PinTokenService,
    // Services
    OmnibusService,
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
    VerifyPinUseCase,
    SetPinUseCase,
    ExportTransactionsUseCase,
    GetWalletLimitsUseCase,
  ],
  controllers: [WalletController, ExportController],
  exports: [
    WalletRepository,
    WALLET_REPOSITORY, // Symbol token for IWalletRepository
    CreateWalletUseCase,
    InternalTransferUseCase,
    ExternalTransferUseCase,
    OmnibusService,
  ],
})
export class WalletModule {}
