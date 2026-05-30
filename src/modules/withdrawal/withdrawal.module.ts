import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../shared/shared.module';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';
import { UserModule } from '../user/user.module';

// Entity
import { WithdrawalEntity } from './domain/entities/withdrawal.entity';

// Repository
import { WithdrawalRepository } from './infrastructure/repositories/withdrawal.repository';

// Services
import { WithdrawalService } from './application/services/withdrawal.service';

// Controllers
import { WithdrawalController } from './application/controllers/withdrawal.controller';

// Listeners
import { WithdrawalCompletedListener } from './application/listeners/withdrawal-completed.listener';

// Payout Providers
import { PayoutProviderFactory } from './infrastructure/providers/payout-provider.factory';
import { OrangePayoutMockProvider } from './infrastructure/providers/mock/orange-payout-mock.provider';
import { MtnPayoutMockProvider } from './infrastructure/providers/mock/mtn-payout-mock.provider';
import { MoovPayoutMockProvider } from './infrastructure/providers/mock/moov-payout-mock.provider';
import { WavePayoutMockProvider } from './infrastructure/providers/mock/wave-payout-mock.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([WithdrawalEntity]),
    SharedModule,
    ExchangeRateModule,
    forwardRef(() => UserModule),
  ],
  providers: [
    WithdrawalRepository,
    WithdrawalService,
    WithdrawalCompletedListener,
    PayoutProviderFactory,
    OrangePayoutMockProvider,
    MtnPayoutMockProvider,
    MoovPayoutMockProvider,
    WavePayoutMockProvider,
  ],
  controllers: [WithdrawalController],
  exports: [WithdrawalService, WithdrawalRepository],
})
export class WithdrawalModule {}
