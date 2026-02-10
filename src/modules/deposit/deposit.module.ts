import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../shared/shared.module';
import { UserModule } from '../user/user.module';

// ORM Entities
import { DepositEntity } from './domain/entities/deposit.entity';

// Repositories
import { DepositRepository } from './infrastructure/repositories/deposit.repository';

// Services
import { DepositService } from './application/services/deposit.service';
import { DepositTokenService } from './application/services/deposit-token.service';

// Controllers
import { DepositController } from './application/controllers/deposit.controller';

// Event Listeners
import { DepositCompletedListener } from './application/listeners/deposit-completed.listener';

// Providers
import { PaymentProviderFactory } from './infrastructure/providers/payment-provider.factory';
import { OrangeMockProvider } from './infrastructure/providers/mock/orange-mock.provider';
import { MtnMockProvider } from './infrastructure/providers/mock/mtn-mock.provider';
import { MoovMockProvider } from './infrastructure/providers/mock/moov-mock.provider';
import { WaveMockProvider } from './infrastructure/providers/mock/wave-mock.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositEntity]),
    SharedModule,
    forwardRef(() => UserModule),
  ],
  providers: [
    // Repositories
    DepositRepository,
    
    // Services
    DepositService,
    DepositTokenService,
    
    // Event Listeners
    DepositCompletedListener,
    
    // Payment Providers
    PaymentProviderFactory,
    OrangeMockProvider,
    MtnMockProvider,
    MoovMockProvider,
    WaveMockProvider,
  ],
  controllers: [DepositController],
  exports: [
    DepositService,
    DepositRepository,
  ],
})
export class DepositModule {}