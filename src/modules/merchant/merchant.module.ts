import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

// ORM Entities
import {
  MerchantOrmEntity,
  PaymentRequestOrmEntity,
  MerchantPaymentOrmEntity,
} from './infrastructure/orm-entities';

// Repositories
import {
  MerchantRepository,
  PaymentRequestRepository,
  MerchantPaymentRepository,
} from './infrastructure/repositories';

// Mappers
import {
  MerchantMapper,
  PaymentRequestMapper,
  MerchantPaymentMapper,
} from './infrastructure/mappers';

// Use Cases
import {
  QrCodeService,
  RegisterMerchantUseCase,
  CreatePaymentRequestUseCase,
  ProcessMerchantPaymentUseCase,
  GetMerchantUseCase,
  GetMerchantByQrUseCase,
  GetMerchantAnalyticsUseCase,
  GetMerchantTransactionsUseCase,
  VerifyMerchantUseCase,
  SuspendMerchantUseCase,
  ActivateMerchantUseCase,
} from './application/usecases';

// Controllers
import { MerchantController } from './application/controllers';

// Other modules
import { WalletModule } from '../wallet/wallet.module';
import { BlnkModule } from '../providers/blnk/blnk.module';

// Guards
import {
  PinVerificationGuard,
  PinTokenService,
} from '../../common/guards/pin-verification.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MerchantOrmEntity,
      PaymentRequestOrmEntity,
      MerchantPaymentOrmEntity,
    ]),
    CqrsModule,
    forwardRef(() => WalletModule),
    BlnkModule,
  ],
  providers: [
    // Mappers
    MerchantMapper,
    PaymentRequestMapper,
    MerchantPaymentMapper,

    // Repositories
    MerchantRepository,
    PaymentRequestRepository,
    MerchantPaymentRepository,

    // Services
    QrCodeService,

    // Use Cases
    RegisterMerchantUseCase,
    CreatePaymentRequestUseCase,
    ProcessMerchantPaymentUseCase,
    GetMerchantUseCase,
    GetMerchantByQrUseCase,
    GetMerchantAnalyticsUseCase,
    GetMerchantTransactionsUseCase,
    VerifyMerchantUseCase,
    SuspendMerchantUseCase,
    ActivateMerchantUseCase,

    // Guards & Services
    PinVerificationGuard,
    PinTokenService,
  ],
  controllers: [MerchantController],
  exports: [
    MerchantRepository,
    PaymentRequestRepository,
    MerchantPaymentRepository,
    QrCodeService,
    GetMerchantUseCase,
    ProcessMerchantPaymentUseCase,
  ],
})
export class MerchantModule {}
