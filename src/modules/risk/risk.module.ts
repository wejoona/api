/**
 * Risk Module
 * Integrates with external Risk Manager service and Circle Compliance Engine
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Infrastructure
import { RiskClientFactory } from './infrastructure/risk-client.factory';
import { RiskManagerClient } from './infrastructure/clients/risk-manager.client';
import { MockRiskClient } from './infrastructure/clients/mock-risk.client';

// Services
import { TransactionRiskService } from './application/services/transaction-risk.service';
import { StepUpService } from './application/services/step-up.service';
import { RiskEvaluationService } from './risk-evaluation.service';
import { TransactionRiskListener } from './application/listeners/transaction-risk.listener';

// Guards
import { RiskAssessmentGuard } from './application/guards/risk-assessment.guard';

// Controllers
import { RiskController } from './application/controllers/risk.controller';
import { StepUpController } from './application/controllers/step-up.controller';

// Interface token
import { RISK_CLIENT } from './domain/interfaces/risk-client.interface';

// Circle Compliance Engine
import { CircleComplianceAdapter } from '../providers/circle/adapters/circle-compliance.adapter';

// User module (for RiskAssessmentGuard → UserRepository)
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    EventEmitterModule.forRoot(),
    forwardRef(() => UserModule),
  ],
  controllers: [RiskController, StepUpController],
  providers: [
    // Factory
    RiskClientFactory,

    // Clients
    RiskManagerClient,
    MockRiskClient,

    // Dynamic provider for risk client
    {
      provide: RISK_CLIENT,
      useFactory: (factory: RiskClientFactory) => factory.getClient(),
      inject: [RiskClientFactory],
    },

    // Circle Compliance Engine (address screening)
    CircleComplianceAdapter,

    // Services
    TransactionRiskService,
    StepUpService,
    RiskEvaluationService,
    TransactionRiskListener,

    // Guards
    RiskAssessmentGuard,
  ],
  exports: [
    TransactionRiskService,
    RiskEvaluationService,
    StepUpService,
    RiskAssessmentGuard,
    RiskClientFactory,
    CircleComplianceAdapter,
    RISK_CLIENT,
  ],
})
export class RiskModule {}
