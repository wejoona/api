import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { SanctionsScreeningController } from './application/controllers/sanctions-screening.controller';

// Services
import { SanctionsScreeningService } from './application/services/sanctions-screening.service';

// Repositories
import { ScreeningRecordRepository } from './domain/repositories/screening-record.repository';
import { TypeOrmScreeningRecordRepository } from './infrastructure/repositories/typeorm-screening-record.repository';

// ORM Entities
import { ScreeningRecordOrmEntity } from './infrastructure/orm-entities/screening-record.orm-entity';
import { ScreeningMatchOrmEntity } from './infrastructure/orm-entities/screening-match.orm-entity';

// Providers
import { SanctionsScreeningProvider } from './domain/interfaces/sanctions-screening-provider.interface';
import { MockSanctionsProvider } from './infrastructure/providers/mock-sanctions-provider';
import { ComplyAdvantageProvider } from './infrastructure/providers/complyadvantage-provider';

/**
 * Sanctions Screening Module
 *
 * Provides sanctions, PEP, and adverse media screening capabilities
 * with configurable provider abstraction.
 *
 * Supported Providers:
 * - Mock (development/testing)
 * - ComplyAdvantage (production)
 * - Extensible for other providers (World-Check, Dow Jones, etc.)
 *
 * Configuration:
 * Set SANCTIONS_SCREENING_PROVIDER environment variable to:
 * - 'mock' (default for development)
 * - 'complyadvantage' (for production)
 *
 * Features:
 * - Individual and entity screening
 * - Batch screening
 * - Match resolution workflow
 * - Screening history and audit trail
 * - Compliance reporting
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScreeningRecordOrmEntity,
      ScreeningMatchOrmEntity,
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [SanctionsScreeningController],
  providers: [
    SanctionsScreeningService,
    {
      provide: ScreeningRecordRepository,
      useClass: TypeOrmScreeningRecordRepository,
    },
    // Provider factory - selects provider based on configuration
    {
      provide: SanctionsScreeningProvider,
      useFactory: (
        configService: ConfigService,
        httpService: any,
      ): SanctionsScreeningProvider => {
        const provider = configService.get<string>(
          'SANCTIONS_SCREENING_PROVIDER',
          'mock',
        );

        switch (provider.toLowerCase()) {
          case 'complyadvantage':
            return new ComplyAdvantageProvider(httpService, configService);
          case 'mock':
          default:
            return new MockSanctionsProvider();
        }
      },
      inject: [ConfigService, HttpModule],
    },
    MockSanctionsProvider,
    ComplyAdvantageProvider,
  ],
  exports: [
    SanctionsScreeningService,
    ScreeningRecordRepository,
    SanctionsScreeningProvider,
  ],
})
export class SanctionsScreeningModule {}
