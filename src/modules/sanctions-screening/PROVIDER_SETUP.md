# Sanctions Screening Provider Setup Guide

Complete setup instructions for integrating external sanctions screening providers.

## Table of Contents

- [ComplyAdvantage](#complyadvantage)
- [Refinitiv World-Check](#refinitiv-world-check)
- [Dow Jones Risk & Compliance](#dow-jones-risk--compliance)
- [LexisNexis Bridger](#lexisnexis-bridger)
- [Mock Provider (Development)](#mock-provider-development)

---

## ComplyAdvantage

### Overview

ComplyAdvantage provides real-time sanctions, PEP, and adverse media screening with AI-powered matching.

**Coverage:**
- 600+ sanctions lists (OFAC, UN, EU, UK, etc.)
- 3M+ PEP records
- Adverse media monitoring
- Real-time updates

**Pricing:**
- Pay-per-search model
- Volume discounts available
- Contact: sales@complyadvantage.com

### Setup Steps

#### 1. Create Account

1. Visit https://complyadvantage.com/
2. Request demo or contact sales
3. Complete onboarding and compliance checks
4. Receive API credentials

#### 2. Get API Key

1. Login to ComplyAdvantage portal
2. Navigate to **Settings** > **API Keys**
3. Generate new API key
4. Copy and securely store the key

#### 3. Configure Environment

Add to `.env`:

```env
# Provider selection
SANCTIONS_SCREENING_PROVIDER=complyadvantage

# ComplyAdvantage configuration
COMPLYADVANTAGE_API_KEY=your-api-key-here
COMPLYADVANTAGE_BASE_URL=https://api.complyadvantage.com
COMPLYADVANTAGE_FUZZINESS=0.8

# Screening thresholds
SANCTIONS_AUTO_BLOCK_THRESHOLD=95
SANCTIONS_REVIEW_THRESHOLD=70
SANCTIONS_HIGH_VALUE_THRESHOLD=10000
```

#### 4. Test Connection

```bash
curl -X GET https://api.complyadvantage.com/health \
  -H "Authorization: YOUR_API_KEY"
```

Or via the module:

```typescript
const healthy = await sanctionsScreeningService.healthCheck();
console.log('Provider healthy:', healthy);
```

#### 5. Run Test Screening

```typescript
const result = await sanctionsScreeningService.screenIndividual(
  'test-user-1',
  'Vladimir Putin', // Known PEP
  new Date('1952-10-07'),
  'RU',
);

console.log('Matches found:', result.matchCount);
console.log('Highest score:', result.highestScore);
```

### API Rate Limits

- **Free Tier**: 100 searches/month
- **Starter**: 500 searches/month
- **Professional**: 2,000 searches/month
- **Enterprise**: Custom limits

**Recommendation**: Implement request queuing for high-volume usage.

### Webhook Integration (Optional)

For ongoing monitoring, configure webhooks:

```env
COMPLYADVANTAGE_WEBHOOK_URL=https://api.joonapay.com/webhooks/complyadvantage
COMPLYADVANTAGE_WEBHOOK_SECRET=your-webhook-secret
```

ComplyAdvantage will notify you when:
- Watchlist entry is updated
- New matches found for monitored entities

### Best Practices

1. **Fuzziness Tuning**: Start with 0.8, adjust based on false positive rate
2. **Batch Processing**: Use batch API for periodic re-screening
3. **Caching**: Cache results for 24 hours to reduce costs
4. **Monitoring**: Track API usage in ComplyAdvantage dashboard

---

## Refinitiv World-Check

### Overview

Refinitiv (formerly Thomson Reuters) World-Check is the industry-standard screening solution.

**Coverage:**
- OFAC, UN, EU, UK sanctions
- 2.5M+ PEP profiles
- 400+ adverse media categories
- Historical data back to 1940s

### Setup Steps

#### 1. Create Account

1. Contact Refinitiv sales: https://www.refinitiv.com/en/financial-data/company-data/screening-data
2. Complete onboarding (typically 2-4 weeks)
3. Sign license agreement
4. Receive API credentials

#### 2. Implementation

Create `world-check-provider.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SanctionsScreeningProvider } from '../../domain/interfaces/sanctions-screening-provider.interface';

@Injectable()
export class WorldCheckProvider extends SanctionsScreeningProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.apiKey = this.configService.get('WORLDCHECK_API_KEY');
    this.baseUrl = this.configService.get('WORLDCHECK_BASE_URL', 'https://api-worldcheck.refinitiv.com/v2');
  }

  async screenIndividual(request: IndividualScreeningRequest): Promise<ScreeningResult> {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/cases/screeningRequest`,
        {
          groupId: this.configService.get('WORLDCHECK_GROUP_ID'),
          entityType: 'INDIVIDUAL',
          name: request.name,
          dateOfBirth: request.dateOfBirth?.toISOString().split('T')[0],
          countryOfResidence: request.nationality,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    return this.parseResponse(response.data);
  }

  // ... implement other methods
}
```

#### 3. Configure Environment

```env
SANCTIONS_SCREENING_PROVIDER=worldcheck
WORLDCHECK_API_KEY=your-api-key
WORLDCHECK_GROUP_ID=your-group-id
WORLDCHECK_BASE_URL=https://api-worldcheck.refinitiv.com/v2
```

#### 4. Add to Module

```typescript
// In sanctions-screening.module.ts
{
  provide: SanctionsScreeningProvider,
  useFactory: (configService: ConfigService, httpService: HttpService) => {
    const provider = configService.get('SANCTIONS_SCREENING_PROVIDER');
    switch (provider) {
      case 'worldcheck':
        return new WorldCheckProvider(httpService, configService);
      case 'complyadvantage':
        return new ComplyAdvantageProvider(httpService, configService);
      default:
        return new MockSanctionsProvider();
    }
  },
}
```

### Pricing

- Enterprise-only (no self-service)
- Annual license fee + per-search costs
- Typical range: $50,000 - $500,000/year
- Contact sales for quote

---

## Dow Jones Risk & Compliance

### Overview

Dow Jones provides comprehensive risk intelligence and screening.

**Coverage:**
- Sanctions lists
- PEPs
- State-owned entities
- Adverse media (Factiva integration)
- Third-party risk data

### Setup Steps

#### 1. Implementation

Create `dowjones-provider.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { SanctionsScreeningProvider } from '../../domain/interfaces/sanctions-screening-provider.interface';

@Injectable()
export class DowJonesProvider extends SanctionsScreeningProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.dowjones.com/risk-compliance';

  async screenIndividual(request: IndividualScreeningRequest): Promise<ScreeningResult> {
    const response = await fetch(`${this.baseUrl}/screening/v1/searches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'Person',
        name: {
          full: request.name,
        },
        dateOfBirth: request.dateOfBirth?.toISOString().split('T')[0],
        countries: request.nationality ? [request.nationality] : undefined,
      }),
    });

    return this.parseResponse(await response.json());
  }
}
```

#### 2. Configure

```env
SANCTIONS_SCREENING_PROVIDER=dowjones
DOWJONES_API_KEY=your-api-key
DOWJONES_CLIENT_ID=your-client-id
```

---

## LexisNexis Bridger

### Overview

LexisNexis Bridger specializes in PEP and sanctions screening with deep data coverage.

**Coverage:**
- 400+ sanctions lists
- 2M+ PEP records
- Adverse media
- 250+ countries

### Setup

#### 1. Implementation

```typescript
@Injectable()
export class BridgerProvider extends SanctionsScreeningProvider {
  private readonly baseUrl = 'https://bridger.lexisnexis.com/api';

  async screenIndividual(request: IndividualScreeningRequest): Promise<ScreeningResult> {
    const response = await fetch(`${this.baseUrl}/v1/screen`, {
      method: 'POST',
      headers: {
        'Authorization': `ApiKey ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: request.name,
        birthDate: request.dateOfBirth,
        nationality: request.nationality,
        screeningType: 'COMPREHENSIVE',
      }),
    });

    return this.parseResponse(await response.json());
  }
}
```

#### 2. Configure

```env
SANCTIONS_SCREENING_PROVIDER=bridger
BRIDGER_API_KEY=your-api-key
```

---

## Mock Provider (Development)

The mock provider is pre-configured and ready to use for development and testing.

### Configuration

```env
SANCTIONS_SCREENING_PROVIDER=mock
```

### Test Scenarios

| Test Name | Trigger | Expected Behavior |
|-----------|---------|-------------------|
| Exact Sanctions Match | Name: "John Sanction Test" | Auto-block (score: 98) |
| PEP Match | Name: "Alassane Ouattara" | Requires review (score: 85) |
| Phone Auto-Block | Phone contains "666" | Auto-block (score: 98) |
| Fuzzy Match | Name contains "FUZZY" | Requires review (score: 72) |
| Adverse Media | Name contains "FRAUD" | Low-risk match (score: 65) |
| Clean Record | Any other name | No matches (score: 0) |

### Example Tests

```typescript
describe('Mock Provider Tests', () => {
  it('should auto-block on sanctions trigger', async () => {
    const result = await service.screenIndividual(
      'test-1',
      'John Sanction Test',
    );
    expect(result.blocked).toBe(true);
    expect(result.highestScore).toBeGreaterThanOrEqual(95);
  });

  it('should flag PEP for review', async () => {
    const result = await service.screenIndividual(
      'test-2',
      'Political PEP Figure',
    );
    expect(result.requiresReview).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it('should pass clean names', async () => {
    const result = await service.screenIndividual(
      'test-3',
      'Regular User Name',
    );
    expect(result.matchCount).toBe(0);
    expect(result.approved).toBe(true);
  });
});
```

### Mock Watchlist

The mock provider includes these test entries:

```typescript
[
  {
    matchId: 'OFAC-SDN-001',
    name: 'John Sanction Test',
    listType: 'sanctions',
    source: 'OFAC SDN List',
    nationality: 'RU',
  },
  {
    matchId: 'PEP-001',
    name: 'Alassane Ouattara',
    listType: 'pep',
    source: 'World-Check PEP Database',
    nationality: 'CI',
  },
  {
    matchId: 'PEP-002',
    name: 'Macky Sall',
    listType: 'pep',
    source: 'World-Check PEP Database',
    nationality: 'SN',
  },
]
```

---

## Provider Comparison

| Provider | Coverage | API Quality | Pricing | Best For |
|----------|----------|-------------|---------|----------|
| **ComplyAdvantage** | 600+ lists, 3M PEPs | Excellent | Pay-per-search | Startups, SMBs |
| **World-Check** | Industry standard | Excellent | Enterprise | Large enterprises |
| **Dow Jones** | Comprehensive | Good | Enterprise | News/media integration |
| **Bridger** | 400+ lists, 2M PEPs | Good | Mid-market | Cost-conscious enterprises |
| **Mock** | Test data only | N/A | Free | Development/testing |

## Migration Between Providers

To switch providers:

1. Update environment variable:
   ```env
   SANCTIONS_SCREENING_PROVIDER=new-provider
   ```

2. Add new provider credentials

3. Test with health check:
   ```bash
   curl http://localhost:3000/sanctions-screening/health
   ```

4. Run test screening:
   ```typescript
   await service.screenIndividual('test', 'Vladimir Putin');
   ```

5. Deploy to staging first, then production

## Multi-Provider Strategy

For critical applications, use multiple providers:

```typescript
@Injectable()
export class MultiProviderScreeningService {
  constructor(
    private readonly primaryProvider: ComplyAdvantageProvider,
    private readonly fallbackProvider: WorldCheckProvider,
  ) {}

  async screenIndividual(request: IndividualScreeningRequest): Promise<ScreeningResult> {
    try {
      return await this.primaryProvider.screenIndividual(request);
    } catch (error) {
      logger.error('Primary provider failed, using fallback');
      return await this.fallbackProvider.screenIndividual(request);
    }
  }
}
```

## Troubleshooting

### Connection Errors

```typescript
const healthy = await service.healthCheck();
if (!healthy) {
  // Check API credentials
  // Verify network connectivity
  // Check provider status page
}
```

### High Costs

- Enable result caching (24 hours)
- Use batch API for periodic screening
- Adjust screening triggers (increase threshold)
- Negotiate volume discounts

### False Positives

- Increase fuzziness threshold (e.g., 0.8 → 0.9)
- Require more matching fields (DOB + nationality)
- Train compliance team on resolution workflow

## Support Contacts

- **ComplyAdvantage**: support@complyadvantage.com
- **World-Check**: worldcheck.support@refinitiv.com
- **Dow Jones**: risk-compliance-support@dowjones.com
- **Bridger**: support@bridger.lexisnexis.com

## Compliance Certifications

All recommended providers are certified for:
- SOC 2 Type II
- ISO 27001
- GDPR compliant
- FATF recommended
