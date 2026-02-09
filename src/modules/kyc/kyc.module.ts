import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';

// ORM Entities
import { KycVerificationOrmEntity } from './infrastructure/orm-entities/kyc-verification.orm-entity';

// Repositories
import { KycVerificationRepository } from './infrastructure/repositories/kyc-verification.repository';

// Providers
import { MockKycProvider } from './infrastructure/providers/mock-kyc.provider';
import { VerifyHqKycProvider } from './infrastructure/providers/verify-hq-kyc.provider';
import { KYC_VERIFICATION_PROVIDER } from './domain/interfaces/kyc-verification-provider.interface';

// Services
import { KycService } from './application/services/kyc.service';

// Listeners
import { KycApprovedListener } from './application/listeners/kyc-approved.listener';

// Controllers
import { KycController } from './application/controllers/kyc.controller';
import { AdminKycController } from './application/controllers/admin-kyc.controller';
import { KycUploadController } from './application/controllers/kyc-upload.controller';
import { KycVerifyController } from './application/controllers/kyc-verify.controller';

// External modules
import { UploadModule } from '../upload/upload.module';
import { WalletModule } from '../wallet/wallet.module';
import { UserModule } from '../user/user.module';

// VerifyHQ
import { VerifyHqModule } from '../shared/infrastructure/verify-hq';

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
    VerifyHqModule,
  ],
  controllers: [KycController, AdminKycController, KycUploadController, KycVerifyController],
  providers: [
    // Repository
    KycVerificationRepository,

    // KYC Verification Provider
    // Uses VerifyHQ when VERIFY_HQ_API_KEY is set, otherwise mock
    MockKycProvider,
    VerifyHqKycProvider,
    {
      provide: KYC_VERIFICATION_PROVIDER,
      useFactory: (
        configService: ConfigService,
        mockProvider: MockKycProvider,
        verifyHqProvider: VerifyHqKycProvider,
      ) => {
        const apiKey = configService.get<string>('VERIFY_HQ_API_KEY');
        if (apiKey && apiKey !== 'your-api-key-here') {
          return verifyHqProvider;
        }
        return mockProvider;
      },
      inject: [ConfigService, MockKycProvider, VerifyHqKycProvider],
    },

    // Service
    KycService,

    // Event Listeners
    KycApprovedListener,
  ],
  exports: [KycService, KycVerificationRepository],
})
export class KycModule {}
