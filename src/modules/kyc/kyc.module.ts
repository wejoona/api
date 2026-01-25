import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';

// ORM Entities
import { KycVerificationOrmEntity } from './infrastructure/orm-entities/kyc-verification.orm-entity';

// Repositories
import { KycVerificationRepository } from './infrastructure/repositories/kyc-verification.repository';

// Providers
import { MockKycProvider } from './infrastructure/providers/mock-kyc.provider';
import { KYC_VERIFICATION_PROVIDER } from './domain/interfaces/kyc-verification-provider.interface';

// Services
import { KycService } from './application/services/kyc.service';

// Listeners
import { KycApprovedListener } from './application/listeners/kyc-approved.listener';

// Controllers
import { KycController } from './application/controllers/kyc.controller';
import { AdminKycController } from './application/controllers/admin-kyc.controller';

// External modules
import { UploadModule } from '../upload/upload.module';
import { WalletModule } from '../wallet/wallet.module';
import { UserModule } from '../user/user.module';

/**
 * KYC Module
 *
 * Handles Know Your Customer (KYC) verification flow:
 * 1. User uploads identity documents
 * 2. Auto-verification via third-party provider (score-based)
 * 3. Manual review by admin if auto-verification score too low
 * 4. On approval, wallet is created for user
 *
 * Score thresholds (configurable):
 * - >= 80: Auto-approve
 * - 40-79: Manual review required
 * - < 40: Auto-reject
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([KycVerificationOrmEntity]),
    EventEmitterModule.forRoot(),
    ConfigModule,
    UploadModule,
    forwardRef(() => WalletModule),
    forwardRef(() => UserModule),
  ],
  controllers: [KycController, AdminKycController],
  providers: [
    // Repository
    KycVerificationRepository,

    // KYC Verification Provider (mock for now, can be swapped for real provider)
    {
      provide: KYC_VERIFICATION_PROVIDER,
      useClass: MockKycProvider,
    },

    // Service
    KycService,

    // Event Listeners
    KycApprovedListener,
  ],
  exports: [KycService, KycVerificationRepository],
})
export class KycModule {}
