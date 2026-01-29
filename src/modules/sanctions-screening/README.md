# Sanctions Screening Module

Enterprise-grade sanctions, PEP, and adverse media screening for JoonaPay USDC Wallet.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Migration

```bash
npm run migration:run
```

This creates the following tables in the `compliance` schema:
- `screening_records` - Stores all screening requests
- `screening_matches` - Stores potential matches requiring review

### 3. Configure Environment

For **development**:

```env
SANCTIONS_SCREENING_PROVIDER=mock
SANCTIONS_AUTO_BLOCK_THRESHOLD=95
SANCTIONS_REVIEW_THRESHOLD=70
SANCTIONS_HIGH_VALUE_THRESHOLD=10000
```

For **production**:

```env
SANCTIONS_SCREENING_PROVIDER=complyadvantage
COMPLYADVANTAGE_API_KEY=your-api-key
COMPLYADVANTAGE_BASE_URL=https://api.complyadvantage.com
COMPLYADVANTAGE_FUZZINESS=0.8
SANCTIONS_AUTO_BLOCK_THRESHOLD=95
SANCTIONS_REVIEW_THRESHOLD=70
SANCTIONS_HIGH_VALUE_THRESHOLD=10000
```

### 4. Import Module

```typescript
// app.module.ts
import { SanctionsScreeningModule } from './modules/sanctions-screening';

@Module({
  imports: [
    // ... other modules
    SanctionsScreeningModule,
  ],
})
export class AppModule {}
```

### 5. Test Connection

```bash
curl http://localhost:3000/sanctions-screening/health
```

Expected response:
```json
{
  "healthy": true,
  "timestamp": "2024-01-20T10:30:00Z"
}
```

## Basic Usage

### Screen a User (KYC Onboarding)

```typescript
import { SanctionsScreeningService } from '@/modules/sanctions-screening';

@Injectable()
export class KycService {
  constructor(
    private readonly sanctionsScreeningService: SanctionsScreeningService,
  ) {}

  async submitKyc(userId: string, kycData: any) {
    // Screen user before approving KYC
    const screeningResult = await this.sanctionsScreeningService.screenIndividual(
      userId,
      `${kycData.firstName} ${kycData.lastName}`,
      kycData.dateOfBirth,
      kycData.nationality,
      kycData.identificationNumber,
      kycData.phoneNumber,
    );

    if (screeningResult.blocked) {
      throw new ForbiddenException('User blocked due to sanctions match');
    }

    if (screeningResult.requiresReview) {
      // Flag for manual compliance review
      await this.flagForComplianceReview(userId, screeningResult.recordId);
    }

    // Proceed with KYC approval
    // ...
  }
}
```

### Screen Before Transfer

```typescript
@Injectable()
export class TransferService {
  async createTransfer(senderId: string, recipientId: string, amount: number) {
    // Screen high-value transfers
    if (amount >= 10000) {
      const result = await this.sanctionsScreeningService.screenTransfer(
        senderId,
        senderName,
        recipientId,
        recipientName,
        amount,
      );

      if (!result.approved) {
        throw new ForbiddenException(result.blockedReason);
      }
    }

    // Process transfer
    // ...
  }
}
```

### Check if User is Blocked

```typescript
async processWithdrawal(userId: string, amount: number) {
  const isBlocked = await this.sanctionsScreeningService.isUserBlocked(userId);

  if (isBlocked) {
    throw new ForbiddenException('Account blocked due to confirmed sanctions match');
  }

  // Process withdrawal
  // ...
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sanctions-screening/individual` | Screen an individual |
| POST | `/sanctions-screening/entity` | Screen an entity |
| POST | `/sanctions-screening/batch` | Batch screen multiple entities |
| POST | `/sanctions-screening/transfer` | Screen before transfer |
| POST | `/sanctions-screening/matches/:id/review` | Review a match |
| GET | `/sanctions-screening/matches/pending` | Get pending matches |
| GET | `/sanctions-screening/matches/:id/details` | Get match details |
| GET | `/sanctions-screening/users/:userId/history` | Get screening history |
| GET | `/sanctions-screening/users/:userId/blocked` | Check if blocked |
| GET | `/sanctions-screening/statistics` | Get statistics |
| GET | `/sanctions-screening/health` | Health check |

See [SANCTIONS_SCREENING.md](./SANCTIONS_SCREENING.md) for detailed API documentation.

## Testing with Mock Provider

The mock provider includes test triggers for automated testing:

```typescript
describe('Sanctions Screening', () => {
  it('should auto-block on sanctions match', async () => {
    const result = await service.screenIndividual(
      'test-user-1',
      'John Sanction Test', // Triggers sanctions match
    );

    expect(result.blocked).toBe(true);
    expect(result.highestScore).toBeGreaterThanOrEqual(95);
  });

  it('should flag PEP for review', async () => {
    const result = await service.screenIndividual(
      'test-user-2',
      'Political PEP Figure', // Triggers PEP match
    );

    expect(result.requiresReview).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it('should pass clean names', async () => {
    const result = await service.screenIndividual(
      'test-user-3',
      'John Doe', // No match
    );

    expect(result.matchCount).toBe(0);
    expect(result.approved).toBe(true);
  });
});
```

### Mock Test Triggers

| Trigger | Expected Result |
|---------|-----------------|
| Name contains "SANCTION" | Auto-block (score: 98) |
| Name contains "PEP" | Requires review (score: 85) |
| Phone contains "666" | Auto-block |
| Name contains "FUZZY" | Requires review (score: 72) |
| Name contains "FRAUD" | Low-risk match (score: 65) |

## Event Listeners

Subscribe to screening events:

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ComplianceEventHandler {
  @OnEvent('sanctions.match.auto-blocked')
  async handleAutoBlock(payload: any) {
    // Block user account
    await this.userService.blockUser(payload.userId, 'Sanctions match');

    // Generate SAR
    await this.sarService.generateReport({
      userId: payload.userId,
      reason: 'sanctions_match',
      matches: payload.matches,
    });

    // Alert compliance team
    await this.notificationService.alertCompliance({
      type: 'auto_block',
      userId: payload.userId,
      severity: 'critical',
    });
  }

  @OnEvent('sanctions.match.requires-review')
  async handleReviewRequired(payload: any) {
    // Add to compliance queue
    await this.complianceCaseService.createCase({
      userId: payload.userId,
      type: 'sanctions_review',
      priority: 'high',
      metadata: payload,
    });
  }
}
```

## Scheduled Jobs

### Periodic Re-Screening

```typescript
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ScreeningScheduler {
  constructor(
    private readonly sanctionsScreeningService: SanctionsScreeningService,
    private readonly userRepository: UserRepository,
  ) {}

  @Cron('0 2 * * 0') // Weekly at 2 AM Sunday
  async batchScreenAllUsers() {
    const activeUsers = await this.userRepository.find({
      where: { isActive: true },
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

    console.log(`
      Re-screening complete:
      - Users screened: ${result.totalScreened}
      - Blocked: ${result.totalBlocked}
      - Requires review: ${result.totalReview}
    `);
  }
}
```

## Performance Optimization

### Caching Results

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CachedScreeningService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private sanctionsScreeningService: SanctionsScreeningService,
  ) {}

  async screenIndividual(userId: string, name: string, ...args) {
    const cacheKey = `screening:${userId}:${this.hash(name)}`;

    // Check cache (24 hour TTL)
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Screen via provider
    const result = await this.sanctionsScreeningService.screenIndividual(
      userId,
      name,
      ...args,
    );

    // Cache result
    await this.cacheManager.set(cacheKey, result, 86400); // 24 hours

    return result;
  }
}
```

### Async Processing

```typescript
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class AsyncScreeningService {
  constructor(
    @InjectQueue('screening') private screeningQueue: Queue,
  ) {}

  async queueScreening(userId: string, name: string) {
    await this.screeningQueue.add('screen-user', {
      userId,
      name,
      priority: 'low',
    });
  }
}
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Migration applied to production database
- [ ] Provider API key validated (ComplyAdvantage, etc.)
- [ ] Health check endpoint tested
- [ ] Test screening performed
- [ ] Event listeners implemented
- [ ] Compliance team trained on review workflow
- [ ] Monitoring and alerting configured
- [ ] Audit logging enabled
- [ ] Scheduled re-screening job configured
- [ ] Backup provider configured (optional)

## Architecture

```
User Registration → Screen Individual → Match Found? → Yes → Auto-block? → Yes → Block Account
                                        ↓                                   ↓
                                        No                                  No
                                        ↓                                   ↓
                                    Approve                         Flag for Review
                                                                           ↓
                                                                   Compliance Officer
                                                                           ↓
                                                                    Confirm / Dismiss
```

## Documentation

- [SANCTIONS_SCREENING.md](./SANCTIONS_SCREENING.md) - Complete module documentation
- [PROVIDER_SETUP.md](./PROVIDER_SETUP.md) - Provider integration guide
- [MATCH_RESOLUTION_WORKFLOW.md](./MATCH_RESOLUTION_WORKFLOW.md) - Compliance officer workflow

## Support

- **Issues**: GitHub Issues
- **Email**: compliance@joonapay.com
- **Slack**: #compliance-engineering
- **Documentation**: https://docs.joonapay.com

## License

Proprietary - JoonaPay Internal Use Only
