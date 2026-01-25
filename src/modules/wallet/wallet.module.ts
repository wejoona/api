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
  VerifyPinUseCase,
  SetPinUseCase,
  ExportTransactionsUseCase,
} from './application/usecases';

// Controllers
import { WalletController } from './application/controllers/wallet.controller';
import { KycUploadController } from './application/controllers/kyc-upload.controller';
import { ExportController } from './application/controllers/export.controller';

// Other modules needed
import { TransactionModule } from '../transaction/transaction.module';
import { UserModule } from '../user/user.module';
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
  ],
  providers: [
    // Repositories
    WalletRepository,
    // Mappers
    WalletMapper,
    // Guards & Services
    PinVerificationGuard,
    PinTokenService,
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
  ],
  controllers: [WalletController, KycUploadController, ExportController],
  exports: [
    WalletRepository,
    CreateWalletUseCase,
    InternalTransferUseCase,
    ExternalTransferUseCase,
  ],
})
export class WalletModule {}
