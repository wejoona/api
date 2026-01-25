import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// ORM Entities
import { BillProviderOrmEntity, BillPaymentOrmEntity } from './infrastructure/orm-entities';

// Repositories
import { BillProviderRepository, BillPaymentRepository } from './infrastructure/repositories';

// Adapters
import {
  CieAdapter,
  SodeciAdapter,
  OrangeMoneyAdapter,
  MtnAdapter,
  MoovAdapter,
} from './infrastructure/adapters';

// Services
import { BillAdapterService } from './application/services/bill-adapter.service';

// Use Cases
import {
  GetProvidersUseCase,
  ValidateAccountUseCase,
  PayBillUseCase,
  GetPaymentHistoryUseCase,
  GetReceiptUseCase,
} from './application/usecases';

// Controllers
import { BillPaymentController } from './application/controllers/bill-payment.controller';

// Other Modules
import { WalletModule } from '../wallet/wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BillProviderOrmEntity, BillPaymentOrmEntity]),
    ConfigModule,
    forwardRef(() => WalletModule),
    forwardRef(() => TransactionModule),
    SharedModule,
  ],
  providers: [
    // Repositories
    BillProviderRepository,
    BillPaymentRepository,

    // Adapters
    CieAdapter,
    SodeciAdapter,
    OrangeMoneyAdapter,
    MtnAdapter,
    MoovAdapter,

    // Services
    BillAdapterService,

    // Use Cases
    GetProvidersUseCase,
    ValidateAccountUseCase,
    PayBillUseCase,
    GetPaymentHistoryUseCase,
    GetReceiptUseCase,
  ],
  controllers: [BillPaymentController],
  exports: [
    BillProviderRepository,
    BillPaymentRepository,
    BillAdapterService,
  ],
})
export class BillPaymentsModule {}
