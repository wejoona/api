# Integration Guide

Step-by-step guide for integrating the sanctions screening module with existing JoonaPay modules.

## Prerequisites

1. Sanctions screening module is installed
2. Database migration has been run
3. Environment variables configured
4. Module imported in `app.module.ts`

## 1. Import in App Module

```typescript
// src/app.module.ts
import { SanctionsScreeningModule } from './modules/sanctions-screening';

@Module({
  imports: [
    // ... existing modules
    TypeOrmModule.forRoot({...}),
    ConfigModule.forRoot({...}),

    // Add sanctions screening module
    SanctionsScreeningModule,

    // ... other modules
  ],
})
export class AppModule {}
```

## 2. KYC Module Integration

### Update KYC Service

```typescript
// src/modules/kyc/application/services/kyc.service.ts
import { SanctionsScreeningService } from '@/modules/sanctions-screening';

@Injectable()
export class KycService {
  constructor(
    private readonly sanctionsScreeningService: SanctionsScreeningService,
    // ... other dependencies
  ) {}

  async submitKyc(userId: string, kycData: SubmitKycDto) {
    // 1. Validate KYC data
    // ... existing validation

    // 2. Screen user for sanctions
    const screeningResult = await this.sanctionsScreeningService.screenIndividual(
      userId,
      `${kycData.firstName} ${kycData.lastName}`,
      kycData.dateOfBirth,
      kycData.nationality,
      kycData.identificationNumber,
      kycData.phoneNumber,
    );

    // 3. Handle screening results
    if (screeningResult.blocked) {
      // Auto-blocked due to exact match
      throw new ForbiddenException(
        'KYC submission blocked due to sanctions match. Please contact compliance.'
      );
    }

    if (screeningResult.requiresReview) {
      // Flag for manual compliance review
      await this.flagForComplianceReview(userId, {
        reason: 'sanctions_screening',
        recordId: screeningResult.recordId,
        matchCount: screeningResult.matchCount,
        highestScore: screeningResult.highestScore,
      });

      // Set KYC status to pending review
      return {
        status: 'pending_review',
        message: 'Your KYC is under review by our compliance team.',
      };
    }

    // 4. Continue with normal KYC flow
    // ... existing logic
  }

  async updateKyc(userId: string, updateData: UpdateKycDto) {
    // Re-screen if personal information changed
    if (this.hasPersonalInfoChanged(updateData)) {
      await this.sanctionsScreeningService.screenIndividual(
        userId,
        updateData.fullName,
        updateData.dateOfBirth,
        updateData.nationality,
      );
    }

    // ... existing update logic
  }

  private hasPersonalInfoChanged(updateData: UpdateKycDto): boolean {
    return !!(
      updateData.firstName ||
      updateData.lastName ||
      updateData.dateOfBirth ||
      updateData.nationality
    );
  }
}
```

### Add Compliance Review Flag

```typescript
// src/modules/kyc/application/services/kyc.service.ts
private async flagForComplianceReview(
  userId: string,
  metadata: any,
): Promise<void> {
  // Option 1: Update KYC status
  await this.kycRepository.updateStatus(userId, {
    status: 'pending_compliance_review',
    reviewMetadata: metadata,
  });

  // Option 2: Create compliance case (if you have a compliance case module)
  await this.complianceCaseService.createCase({
    userId,
    type: 'kyc_sanctions_review',
    priority: metadata.highestScore >= 85 ? 'high' : 'medium',
    metadata,
  });

  // Option 3: Send notification to compliance team
  await this.notificationService.notifyCompliance({
    type: 'sanctions_match_review_required',
    userId,
    metadata,
  });
}
```

## 3. Transfer Module Integration

### Update Transfer Service

```typescript
// src/modules/transfer/application/services/transfer.service.ts
import { SanctionsScreeningService } from '@/modules/sanctions-screening';

@Injectable()
export class TransferService {
  constructor(
    private readonly sanctionsScreeningService: SanctionsScreeningService,
    private readonly configService: ConfigService,
    // ... other dependencies
  ) {}

  async createTransfer(
    senderId: string,
    createTransferDto: CreateTransferDto,
  ) {
    const { recipientId, amount, note } = createTransferDto;

    // 1. Get sender and recipient info
    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    const recipient = await this.userRepository.findOne({ where: { id: recipientId } });

    // 2. Screen high-value transfers
    const highValueThreshold = this.configService.get<number>(
      'SANCTIONS_HIGH_VALUE_THRESHOLD',
      10000,
    );

    if (amount >= highValueThreshold) {
      const screeningResult = await this.sanctionsScreeningService.screenTransfer(
        senderId,
        `${sender.firstName} ${sender.lastName}`,
        recipientId,
        recipient ? `${recipient.firstName} ${recipient.lastName}` : undefined,
        amount,
      );

      if (!screeningResult.approved) {
        throw new ForbiddenException(screeningResult.blockedReason);
      }
    }

    // 3. Check if sender is blocked
    const isSenderBlocked = await this.sanctionsScreeningService.isUserBlocked(senderId);
    if (isSenderBlocked) {
      throw new ForbiddenException(
        'Transfer blocked: Sender has confirmed sanctions match'
      );
    }

    // 4. Check if recipient is blocked (if internal user)
    if (recipientId) {
      const isRecipientBlocked = await this.sanctionsScreeningService.isUserBlocked(recipientId);
      if (isRecipientBlocked) {
        throw new ForbiddenException(
          'Transfer blocked: Recipient has confirmed sanctions match'
        );
      }
    }

    // 5. Continue with normal transfer flow
    // ... existing logic
  }
}
```

### Add Pre-Transfer Guard (Optional)

```typescript
// src/modules/transfer/application/guards/sanctions-check.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SanctionsScreeningService } from '@/modules/sanctions-screening';

@Injectable()
export class SanctionsCheckGuard implements CanActivate {
  constructor(
    private readonly sanctionsScreeningService: SanctionsScreeningService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      return true; // Let auth guard handle this
    }

    const isBlocked = await this.sanctionsScreeningService.isUserBlocked(userId);

    if (isBlocked) {
      throw new ForbiddenException(
        'Account blocked due to confirmed sanctions match'
      );
    }

    return true;
  }
}

// Usage in transfer controller
@Controller('transfers')
@UseGuards(JwtAuthGuard, SanctionsCheckGuard)
export class TransferController {
  @Post()
  async createTransfer(@CurrentUser() user, @Body() dto: CreateTransferDto) {
    // User is already screened by guard
    return this.transferService.createTransfer(user.id, dto);
  }
}
```

## 4. User Module Integration

### Add User Blocking Logic

```typescript
// src/modules/user/application/services/user.service.ts
@Injectable()
export class UserService {
  async blockUserDueToSanctions(userId: string, reason: string): Promise<void> {
    await this.userRepository.update(userId, {
      status: 'blocked',
      blockReason: 'sanctions_match',
      blockDetails: reason,
      blockedAt: new Date(),
    });

    // Cancel all pending transactions
    await this.transactionService.cancelPendingTransactions(userId);

    // Freeze wallet balance
    await this.walletService.freezeWallet(userId);

    // Send notification to user
    await this.notificationService.notifyUser(userId, {
      type: 'account_blocked',
      message: 'Your account has been blocked. Please contact support.',
    });
  }
}
```

## 5. Event Listeners Integration

### Create Event Handler Service

```typescript
// src/modules/compliance/application/services/sanctions-event-handler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class SanctionsEventHandlerService {
  private readonly logger = new Logger(SanctionsEventHandlerService.name);

  constructor(
    private readonly userService: UserService,
    private readonly sarService: SARGeneratorService,
    private readonly notificationService: NotificationService,
    private readonly complianceCaseService: ComplianceCaseService,
  ) {}

  @OnEvent('sanctions.match.auto-blocked')
  async handleAutoBlock(payload: {
    userId: string;
    recordId: string;
    name: string;
    highestScore: number;
    matches: any[];
  }) {
    this.logger.warn(`Auto-blocking user ${payload.userId} due to sanctions match`);

    // 1. Block user account
    await this.userService.blockUserDueToSanctions(
      payload.userId,
      `Exact sanctions match (score: ${payload.highestScore})`,
    );

    // 2. Generate Suspicious Activity Report (SAR)
    await this.sarService.generateReport({
      userId: payload.userId,
      type: 'sanctions_match',
      severity: 'critical',
      description: `User ${payload.name} matched sanctions list`,
      matches: payload.matches,
    });

    // 3. Alert compliance team immediately
    await this.notificationService.alertCompliance({
      type: 'critical_sanctions_match',
      userId: payload.userId,
      name: payload.name,
      score: payload.highestScore,
      matches: payload.matches,
      urgency: 'immediate',
    });

    // 4. Create compliance case
    await this.complianceCaseService.createCase({
      userId: payload.userId,
      type: 'auto_blocked_sanctions',
      priority: 'critical',
      status: 'requires_legal_review',
      metadata: payload,
    });

    this.logger.log(`User ${payload.userId} auto-blocked and SAR generated`);
  }

  @OnEvent('sanctions.match.requires-review')
  async handleReviewRequired(payload: {
    userId: string;
    recordId: string;
    name: string;
    highestScore: number;
    matchCount: number;
  }) {
    this.logger.log(`Sanctions review required for user ${payload.userId}`);

    // 1. Create compliance case
    await this.complianceCaseService.createCase({
      userId: payload.userId,
      type: 'sanctions_review',
      priority: payload.highestScore >= 85 ? 'high' : 'medium',
      status: 'pending_review',
      metadata: payload,
    });

    // 2. Notify compliance team
    await this.notificationService.notifyCompliance({
      type: 'sanctions_review_required',
      userId: payload.userId,
      name: payload.name,
      score: payload.highestScore,
      matchCount: payload.matchCount,
    });

    // 3. Pause high-risk activities (optional)
    if (payload.highestScore >= 85) {
      await this.userService.setTransferLimit(payload.userId, 1000); // Reduce limit
    }
  }

  @OnEvent('sanctions.match.confirmed')
  async handleMatchConfirmed(payload: {
    matchId: string;
    userId: string;
    reviewerId: string;
    matchedName: string;
    listType: string;
  }) {
    this.logger.warn(`Sanctions match confirmed for user ${payload.userId}`);

    // 1. Block user if not already blocked
    const user = await this.userService.findById(payload.userId);
    if (user.status !== 'blocked') {
      await this.userService.blockUserDueToSanctions(
        payload.userId,
        `Confirmed ${payload.listType} match: ${payload.matchedName}`,
      );
    }

    // 2. Generate SAR if not already generated
    await this.sarService.generateReport({
      userId: payload.userId,
      type: 'confirmed_sanctions_match',
      severity: 'critical',
      description: `Confirmed match to ${payload.listType}: ${payload.matchedName}`,
      reviewerId: payload.reviewerId,
    });

    // 3. Report to regulatory authorities (if required)
    if (payload.listType === 'sanctions') {
      await this.reportToAuthorities(payload);
    }
  }

  @OnEvent('sanctions.match.dismissed')
  async handleMatchDismissed(payload: {
    matchId: string;
    userId: string;
    reviewerId: string;
  }) {
    this.logger.log(`Sanctions match dismissed for user ${payload.userId}`);

    // 1. Remove any temporary restrictions
    await this.userService.removeTransferLimit(payload.userId);

    // 2. Log in audit trail
    await this.auditService.log({
      action: 'sanctions_match_dismissed',
      userId: payload.userId,
      performedBy: payload.reviewerId,
      metadata: payload,
    });
  }

  private async reportToAuthorities(payload: any): Promise<void> {
    // Implement reporting to BCEAO or other authorities
    this.logger.log('Reporting confirmed sanctions match to authorities');
  }
}
```

### Register Event Handler

```typescript
// src/modules/compliance/compliance.module.ts
import { SanctionsEventHandlerService } from './application/services/sanctions-event-handler.service';

@Module({
  providers: [
    // ... existing providers
    SanctionsEventHandlerService,
  ],
})
export class ComplianceModule {}
```

## 6. Scheduled Jobs Integration

### Weekly Re-Screening Job

```typescript
// src/modules/jobs/application/services/screening-jobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SanctionsScreeningService } from '@/modules/sanctions-screening';

@Injectable()
export class ScreeningJobsService {
  private readonly logger = new Logger(ScreeningJobsService.name);

  constructor(
    private readonly sanctionsScreeningService: SanctionsScreeningService,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 2 * * 0') // Every Sunday at 2 AM
  async weeklyUserReScreening() {
    this.logger.log('Starting weekly user re-screening');

    const activeUsers = await this.userRepository.find({
      where: {
        status: 'active',
        kycStatus: 'approved',
      },
    });

    const entities = activeUsers.map(user => ({
      type: 'individual' as const,
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        dateOfBirth: user.dateOfBirth,
        nationality: user.countryCode,
        phone: user.phoneNumber,
      },
    }));

    const result = await this.sanctionsScreeningService.batchScreen(entities);

    this.logger.log(`Re-screening complete: ${result.totalScreened} users, ${result.totalBlocked} blocked, ${result.totalReview} flagged for review`);

    // Notify compliance team
    if (result.totalBlocked > 0 || result.totalReview > 0) {
      await this.notificationService.notifyCompliance({
        type: 'weekly_screening_summary',
        totalScreened: result.totalScreened,
        totalBlocked: result.totalBlocked,
        totalReview: result.totalReview,
      });
    }
  }

  @Cron('0 0 1 * *') // First day of every month at midnight
  async monthlyScreeningReport() {
    this.logger.log('Generating monthly screening report');

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const stats = await this.sanctionsScreeningService.getStatistics(
      startDate,
      endDate,
    );

    // Generate report
    const report = {
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      totalScreenings: stats.totalScreenings,
      totalMatches: stats.totalMatches,
      matchRate: ((stats.totalMatches / stats.totalScreenings) * 100).toFixed(2),
      autoBlocked: stats.autoBlocked,
      requiresReview: stats.requiresReview,
      avgMatchScore: stats.avgMatchScore,
      pendingReviews: stats.matchCounts.pending,
      confirmedMatches: stats.matchCounts.confirmed,
      falsePositives: stats.matchCounts.false_positive,
    };

    // Email to compliance team
    await this.notificationService.emailCompliance({
      subject: 'Monthly Sanctions Screening Report',
      template: 'monthly-screening-report',
      data: report,
    });

    this.logger.log('Monthly screening report sent');
  }
}
```

## 7. Admin Dashboard Integration

### Add Screening Endpoints to Admin API

```typescript
// src/modules/admin/application/controllers/admin-sanctions.controller.ts
import { Controller, Get, Query, Param, Post, Body, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '@/shared/guards/admin-auth.guard';
import { SanctionsScreeningService } from '@/modules/sanctions-screening';

@Controller('admin/sanctions')
@UseGuards(AdminAuthGuard)
export class AdminSanctionsController {
  constructor(
    private readonly sanctionsScreeningService: SanctionsScreeningService,
  ) {}

  @Get('pending-matches')
  async getPendingMatches(
    @Query('minScore') minScore?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sanctionsScreeningService.getPendingMatches(
      minScore ? Number(minScore) : undefined,
      limit ? Number(limit) : 50,
    );
  }

  @Get('users/:userId/history')
  async getUserScreeningHistory(@Param('userId') userId: string) {
    return this.sanctionsScreeningService.getUserScreeningHistory(userId);
  }

  @Get('statistics')
  async getStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.sanctionsScreeningService.getStatistics(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('matches/:matchId/review')
  async reviewMatch(
    @Param('matchId') matchId: string,
    @Body() dto: { decision: 'confirm' | 'dismiss'; notes?: string },
    @CurrentUser() admin: any,
  ) {
    return this.sanctionsScreeningService.reviewMatch(
      matchId,
      admin.id,
      dto.decision,
      dto.notes,
    );
  }
}
```

## 8. Testing Integration

### Update Test Setup

```typescript
// test/setup.ts
import { SanctionsScreeningModule } from '@/modules/sanctions-screening';

export const createTestingModule = () => {
  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot(testDbConfig),
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({
          SANCTIONS_SCREENING_PROVIDER: 'mock',
        })],
      }),
      SanctionsScreeningModule,
      // ... other modules
    ],
  });
};
```

### E2E Test Example

```typescript
// test/sanctions-screening.e2e-spec.ts
describe('Sanctions Screening (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const module = await createTestingModule().compile();
    app = module.createNestApplication();
    await app.init();

    // Get auth token
    authToken = await getTestAuthToken(app);
  });

  it('should screen individual successfully', () => {
    return request(app.getHttpServer())
      .post('/sanctions-screening/individual')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: 'test-user-1',
        name: 'John Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'CI',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.approved).toBe(true);
        expect(res.body.matchCount).toBe(0);
      });
  });

  it('should auto-block on sanctions trigger', () => {
    return request(app.getHttpServer())
      .post('/sanctions-screening/individual')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: 'test-user-2',
        name: 'John Sanction Test',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.blocked).toBe(true);
        expect(res.body.highestScore).toBeGreaterThanOrEqual(95);
      });
  });
});
```

## 9. Environment Configuration

### Add to Environment Files

```env
# .env.development
SANCTIONS_SCREENING_PROVIDER=mock
SANCTIONS_AUTO_BLOCK_THRESHOLD=95
SANCTIONS_REVIEW_THRESHOLD=70
SANCTIONS_HIGH_VALUE_THRESHOLD=10000

# .env.staging
SANCTIONS_SCREENING_PROVIDER=complyadvantage
COMPLYADVANTAGE_API_KEY=test-api-key
COMPLYADVANTAGE_BASE_URL=https://api.complyadvantage.com
SANCTIONS_AUTO_BLOCK_THRESHOLD=95
SANCTIONS_REVIEW_THRESHOLD=70
SANCTIONS_HIGH_VALUE_THRESHOLD=5000

# .env.production
SANCTIONS_SCREENING_PROVIDER=complyadvantage
COMPLYADVANTAGE_API_KEY=prod-api-key
COMPLYADVANTAGE_BASE_URL=https://api.complyadvantage.com
SANCTIONS_AUTO_BLOCK_THRESHOLD=95
SANCTIONS_REVIEW_THRESHOLD=70
SANCTIONS_HIGH_VALUE_THRESHOLD=10000
```

## 10. Monitoring & Alerts

### Add Monitoring Metrics

```typescript
// src/modules/monitoring/application/services/sanctions-monitoring.service.ts
@Injectable()
export class SanctionsMonitoringService {
  @Cron('*/5 * * * *') // Every 5 minutes
  async checkProviderHealth() {
    const healthy = await this.sanctionsScreeningService.healthCheck();

    if (!healthy) {
      await this.alertService.alert({
        severity: 'critical',
        title: 'Sanctions Screening Provider Down',
        message: 'Unable to connect to sanctions screening provider',
        notifyChannels: ['pagerduty', 'slack'],
      });
    }
  }

  @Cron('0 * * * *') // Every hour
  async checkPendingReviews() {
    const pending = await this.sanctionsScreeningService.getPendingMatches(70);

    if (pending.length > 50) {
      await this.alertService.alert({
        severity: 'warning',
        title: 'High Pending Review Count',
        message: `${pending.length} sanctions matches pending review`,
        notifyChannels: ['slack'],
      });
    }
  }
}
```

## Summary Checklist

- [ ] Import `SanctionsScreeningModule` in `app.module.ts`
- [ ] Update KYC service to screen new users
- [ ] Update transfer service for high-value transfers
- [ ] Add event handlers for sanctions matches
- [ ] Configure scheduled re-screening jobs
- [ ] Add admin endpoints for compliance review
- [ ] Update user service for blocking logic
- [ ] Add monitoring and alerting
- [ ] Configure environment variables
- [ ] Test integration with mock provider
- [ ] Train compliance team
- [ ] Deploy to staging
- [ ] Test with real provider
- [ ] Deploy to production

## Next Steps

1. Start with KYC integration (highest priority)
2. Add event handlers for automated workflows
3. Integrate with transfer module
4. Set up scheduled jobs
5. Configure monitoring
6. Train compliance team
7. Test thoroughly before production
