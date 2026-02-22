import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VerificationOrmEntity } from './infrastructure/orm-entities/verification.orm-entity';
import { VerificationRepository } from './domain/repositories/verification.repository';
import { TypeOrmVerificationRepository } from './infrastructure/repositories/verification.repository';
import { VerificationMapper } from './infrastructure/mappers/verification.mapper';
import { VerificationService } from './application/services/verification.service';
import { VerificationFacadeService } from './application/services/verification-facade.service';
import { VERIFICATION_STRATEGY } from './domain/strategies/verification-strategy.interface';
import { LocalVerificationStrategy } from './infrastructure/strategies/local-verification.strategy';
import { VerifyHqVerificationStrategy } from './infrastructure/strategies/verifyhq-verification.strategy';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationOrmEntity]),
    ConfigModule,
    SharedModule, // Provides SMS_GATEWAY for LocalVerificationStrategy
  ],
  providers: [
    VerificationMapper,
    VerificationService,
    {
      provide: VerificationRepository,
      useClass: TypeOrmVerificationRepository,
    },
    // Strategy implementations (both registered, factory picks one)
    LocalVerificationStrategy,
    VerifyHqVerificationStrategy,
    // Strategy factory — picks based on config
    {
      provide: VERIFICATION_STRATEGY,
      useFactory: (
        configService: ConfigService,
        localStrategy: LocalVerificationStrategy,
        verifyhqStrategy: VerifyHqVerificationStrategy,
      ) => {
        const strategy =
          configService.get<string>('verification.strategy') || 'local';

        if (strategy === 'verifyhq') {
          return verifyhqStrategy;
        }
        return localStrategy;
      },
      inject: [ConfigService, LocalVerificationStrategy, VerifyHqVerificationStrategy],
    },
    VerificationFacadeService,
  ],
  exports: [
    VerificationService,
    VerificationRepository,
    VerificationFacadeService,
    LocalVerificationStrategy, // Exported for DevController debug methods
  ],
})
export class VerificationModule {}
