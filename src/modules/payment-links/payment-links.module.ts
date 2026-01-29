import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentLinkOrmEntity } from './infrastructure/orm-entities/payment-link.orm-entity';
import { PaymentLinkRepository } from './domain/repositories/payment-link.repository';
import { TypeOrmPaymentLinkRepository } from './infrastructure/repositories/payment-link.repository';
import { PaymentLinkMapper } from './infrastructure/mappers/payment-link.mapper';
import { PaymentLinkService } from './application/services/payment-link.service';
import { PaymentLinkController } from './application/controllers/payment-link.controller';
import { WalletModule } from '../wallet/wallet.module';
import { TransferModule } from '../transfer/transfer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentLinkOrmEntity]),
    WalletModule,
    TransferModule,
  ],
  controllers: [PaymentLinkController],
  providers: [
    PaymentLinkMapper,
    PaymentLinkService,
    {
      provide: PaymentLinkRepository,
      useClass: TypeOrmPaymentLinkRepository,
    },
  ],
  exports: [PaymentLinkService, PaymentLinkRepository],
})
export class PaymentLinksModule {}
