# Sanctions Screening Module

Comprehensive sanctions, PEP (Politically Exposed Persons), and adverse media screening integration for JoonaPay USDC Wallet.

## Overview

This module provides enterprise-grade sanctions screening with a provider-agnostic architecture that supports multiple screening vendors.

### Key Features

- **Multi-Provider Support**: Abstract interface for ComplyAdvantage, World-Check, Dow Jones, etc.
- **Real-Time Screening**: Screen users during KYC onboarding and high-value transfers
- **Batch Processing**: Efficient bulk screening for compliance reviews
- **Match Resolution**: Workflow for reviewing and resolving potential matches
- **Audit Trail**: Complete history of all screening activities
- **Configurable Thresholds**: Auto-block and manual review score thresholds

## Architecture

```
sanctions-screening/
├── application/
│   ├── controllers/
│   │   └── sanctions-screening.controller.ts    # REST API endpoints
│   ├── services/
│   │   └── sanctions-screening.service.ts       # Business logic orchestration
│   └── dto/
│       └── screening.dto.ts                     # Request/Response DTOs
├── domain/
│   ├── entities/
│   │   ├── screening-record.entity.ts           # Screening request record
│   │   └── screening-match.entity.ts            # Match entity with workflow
│   ├── repositories/
│   │   └── screening-record.repository.ts       # Repository interface
│   └── interfaces/
│       └── sanctions-screening-provider.interface.ts  # Provider abstraction
├── infrastructure/
│   ├── orm-entities/
│   │   ├── screening-record.orm-entity.ts
│   │   └── screening-match.orm-entity.ts
│   ├── repositories/
│   │   └── typeorm-screening-record.repository.ts
│   ├── providers/
│   │   ├── mock-sanctions-provider.ts           # Development/testing
│   │   └── complyadvantage-provider.ts          # Production provider
│   └── migrations/
│       └── create-sanctions-screening-tables.migration.ts
└── sanctions-screening.module.ts
```

## Providers

### Mock Provider (Development)

The mock provider simulates external API behavior with configurable test scenarios.

**Test Triggers:**

| Trigger | Behavior |
|---------|----------|
| Name contains "SANCTION" | High-risk sanctions match (score: 98) |
| Name contains "PEP" | PEP match (score: 85) |
| Phone contains "666" | Exact match - auto-block |
| Name contains "FUZZY" | Fuzzy match requiring review (score: 72) |
| Name contains "FRAUD" | Adverse media match (score: 65) |

**Example Usage:**

```typescript
// This will trigger a sanctions match
await screeningService.screenIndividual(
  'user-123',
  'John Sanction Test',
);

// This will trigger PEP match
await screeningService.screenIndividual(
  'user-456',
  'Alassane Ouattara',
);
```

### ComplyAdvantage Provider (Production)

Real-time integration with ComplyAdvantage API.

**Configuration:**

```env
SANCTIONS_SCREENING_PROVIDER=complyadvantage
COMPLYADVANTAGE_API_KEY=your-api-key
COMPLYADVANTAGE_BASE_URL=https://api.complyadvantage.com
COMPLYADVANTAGE_FUZZINESS=0.8
```

**Coverage:**
- 600+ sanctions lists (OFAC, UN, EU, etc.)
- 3M+ PEP records
- Adverse media monitoring
- Real-time updates

### Adding New Providers

To add a new provider (e.g., World-Check, Dow Jones):

1. Create provider class extending `SanctionsScreeningProvider`
2. Implement all interface methods
3. Add to module provider factory

```typescript
// Example: World-Check provider
export class WorldCheckProvider extends SanctionsScreeningProvider {
  async screenIndividual(request: IndividualScreeningRequest): Promise<ScreeningResult> {
    // Implementation
  }
  // ... other methods
}

// Add to module
{
  provide: SanctionsScreeningProvider,
  useFactory: (configService: ConfigService) => {
    const provider = configService.get('SANCTIONS_SCREENING_PROVIDER');
    switch (provider) {
      case 'worldcheck':
        return new WorldCheckProvider();
      case 'complyadvantage':
        return new ComplyAdvantageProvider();
      default:
        return new MockSanctionsProvider();
    }
  },
}
```

## Screening Triggers

### 1. New User Registration

Screen every user during KYC onboarding:

```typescript
// In KYC module
const screeningResult = await sanctionsScreeningService.screenIndividual(
  userId,
  `${firstName} ${lastName}`,
  dateOfBirth,
  nationality,
  identificationNumber,
  phone,
);

if (screeningResult.blocked) {
  throw new ForbiddenException('User blocked due to sanctions match');
}

if (screeningResult.requiresReview) {
  // Flag KYC for manual compliance review
  await kycService.flagForComplianceReview(userId, screeningResult.recordId);
}
```

### 2. KYC Updates

Re-screen when user updates personal information:

```typescript
// When user updates name, DOB, or nationality
await sanctionsScreeningService.screenIndividual(
  userId,
  updatedName,
  updatedDob,
  updatedNationality,
);
```

### 3. High-Value Transfers

Screen before processing large transfers:

```typescript
// In transfer module
const result = await sanctionsScreeningService.screenTransfer(
  senderId,
  senderName,
  recipientId,
  recipientName,
  amount,
);

if (!result.approved) {
  throw new ForbiddenException(result.blockedReason);
}
```

**Configuration:**

```env
# Only screen transfers above this amount (in base currency)
SANCTIONS_HIGH_VALUE_THRESHOLD=10000
```

### 4. Periodic Re-Screening

Scheduled job to re-screen all active users:

```typescript
// In scheduled job
@Cron('0 2 * * 0') // Weekly at 2 AM Sunday
async batchScreenAllUsers() {
  const activeUsers = await userRepository.find({ where: { isActive: true } });

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

  const result = await sanctionsScreeningService.batchScreen(entities);

  // Alert compliance team about new matches
  if (result.totalBlocked > 0 || result.totalReview > 0) {
    await alertService.notifyCompliance({
      type: 'periodic-screening',
      blocked: result.totalBlocked,
      review: result.totalReview,
    });
  }
}
```

## Match Handling Workflow

### Score Thresholds

```env
# Auto-block threshold (exact match)
SANCTIONS_AUTO_BLOCK_THRESHOLD=95

# Manual review threshold (fuzzy match)
SANCTIONS_REVIEW_THRESHOLD=70
```

### Match Resolution Process

1. **Match Detected** (score >= 70)
   - System creates `ScreeningMatch` with status: `pending`
   - Event emitted: `sanctions.match.requires-review` or `sanctions.match.auto-blocked`

2. **Compliance Review** (manual)
   - Officer reviews match details from provider
   - Compares against user KYC documents
   - Makes decision: confirm or dismiss

3. **Match Confirmed**
   - Status updated to `confirmed`
   - User account blocked
   - Event emitted: `sanctions.match.confirmed`
   - SAR (Suspicious Activity Report) may be generated

4. **False Positive**
   - Status updated to `false_positive`
   - User can proceed normally
   - Event emitted: `sanctions.match.dismissed`

### API Example

```typescript
// Get pending matches for review
const pendingMatches = await GET('/sanctions-screening/matches/pending?minScore=80&limit=50');

// Review a match
await POST('/sanctions-screening/matches/MATCH_ID/review', {
  decision: 'dismiss', // or 'confirm'
  notes: 'Different date of birth, verified with passport copy',
});
```

## REST API Endpoints

### Screen Individual

```http
POST /sanctions-screening/individual
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "uuid",
  "name": "John Doe",
  "dateOfBirth": "1980-01-15",
  "nationality": "CI",
  "identificationNumber": "CI123456789",
  "phone": "+2250708090901"
}

Response:
{
  "approved": true,
  "blocked": false,
  "requiresReview": false,
  "matchCount": 0,
  "highestScore": 0,
  "recordId": "uuid"
}
```

### Screen Entity

```http
POST /sanctions-screening/entity

{
  "entityId": "uuid",
  "name": "Acme Corp",
  "country": "SN",
  "registrationNumber": "SN987654321"
}
```

### Batch Screen

```http
POST /sanctions-screening/batch

{
  "entities": [
    {
      "type": "individual",
      "id": "user-1",
      "name": "Jane Smith",
      "metadata": {
        "dateOfBirth": "1990-05-20",
        "nationality": "ML"
      }
    },
    {
      "type": "entity",
      "id": "merchant-1",
      "name": "Trading Company LLC",
      "metadata": {
        "country": "BF"
      }
    }
  ]
}

Response:
{
  "totalScreened": 2,
  "totalBlocked": 0,
  "totalReview": 1,
  "results": [...]
}
```

### Screen Transfer

```http
POST /sanctions-screening/transfer

{
  "senderId": "uuid",
  "senderName": "John Doe",
  "recipientId": "uuid",
  "recipientName": "Jane Smith",
  "amount": 15000
}

Response:
{
  "approved": true,
  "blockedReason": null
}
```

### Review Match

```http
POST /sanctions-screening/matches/{matchId}/review

{
  "decision": "dismiss",
  "notes": "Verified false positive - different person with same name"
}
```

### Get Pending Matches

```http
GET /sanctions-screening/matches/pending?minScore=80&limit=50

Response:
[
  {
    "id": "uuid",
    "userId": "uuid",
    "matchedName": "Similar Name",
    "listType": "sanctions",
    "source": "OFAC SDN",
    "matchScore": 85,
    "matchType": "fuzzy",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00Z"
  }
]
```

### Get Match Details

```http
GET /sanctions-screening/matches/{matchId}/details

Response:
{
  "matchId": "OFAC-SDN-001",
  "matchedName": "John Sanction Test",
  "listType": "sanctions",
  "source": "OFAC SDN List",
  "score": 98,
  "matchType": "exact",
  "aliases": ["J. Sanction", "Johnny Sanction"],
  "nationality": "RU",
  "identifiers": {
    "passport": ["RU123456"]
  },
  "additionalInfo": {
    "program": "UKRAINE-EO13662",
    "remarks": "Blocked for sanctions violations"
  }
}
```

### Get User Screening History

```http
GET /sanctions-screening/users/{userId}/history

Response:
{
  "records": [...],
  "matches": [...],
  "hasConfirmedMatch": false,
  "totalScreenings": 5,
  "totalMatches": 2
}
```

### Check if User is Blocked

```http
GET /sanctions-screening/users/{userId}/blocked

Response:
{
  "userId": "uuid",
  "blocked": false
}
```

### Get Statistics

```http
GET /sanctions-screening/statistics?startDate=2024-01-01&endDate=2024-01-31

Response:
{
  "totalScreenings": 1250,
  "totalMatches": 45,
  "autoBlocked": 2,
  "requiresReview": 15,
  "avgMatchScore": 72.5,
  "matchCounts": {
    "pending": 10,
    "confirmed": 2,
    "false_positive": 33
  }
}
```

### Health Check

```http
GET /sanctions-screening/health

Response:
{
  "healthy": true,
  "timestamp": "2024-01-20T10:30:00Z"
}
```

## Database Schema

### screening_records

Stores each screening request and its results.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User being screened (nullable) |
| entity_id | uuid | Entity being screened (nullable) |
| screening_type | enum | 'individual' or 'entity' |
| provider | varchar | Provider name (e.g., 'ComplyAdvantage') |
| request_id | varchar | Provider's request ID |
| screened_name | varchar | Name that was screened |
| match_count | int | Number of matches found |
| highest_score | decimal | Highest match score (0-100) |
| risk_level | enum | 'high', 'medium', 'low', 'none' |
| requires_review | boolean | Needs manual review |
| auto_blocked | boolean | Auto-blocked due to high score |
| metadata | jsonb | Additional context (DOB, nationality, etc.) |
| created_at | timestamp | When screening was performed |

### screening_matches

Stores individual matches requiring review.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| screening_record_id | uuid | FK to screening_records |
| user_id | uuid | User associated with match |
| match_id | varchar | Provider's match ID |
| matched_name | varchar | Name from watchlist |
| list_type | enum | 'sanctions', 'pep', 'adverse_media', 'enforcement' |
| source | varchar | List source (e.g., 'OFAC SDN') |
| match_score | decimal | Match confidence (0-100) |
| match_type | enum | 'exact', 'fuzzy', 'alias', 'partial' |
| status | enum | 'pending', 'confirmed', 'false_positive' |
| reviewed_by | uuid | Compliance officer who reviewed |
| reviewed_at | timestamp | When reviewed |
| resolution_notes | text | Review notes |
| metadata | jsonb | Additional match details |
| created_at | timestamp | When match was created |
| updated_at | timestamp | Last update |

## Events

The module emits events for integration with other systems:

### sanctions.match.auto-blocked

```typescript
{
  userId: string;
  recordId: string;
  name: string;
  highestScore: number;
  matches: ScreeningMatchDetail[];
}
```

### sanctions.match.requires-review

```typescript
{
  userId: string;
  recordId: string;
  name: string;
  highestScore: number;
  matchCount: number;
}
```

### sanctions.match.confirmed

```typescript
{
  matchId: string;
  userId: string;
  reviewerId: string;
  matchedName: string;
  listType: 'sanctions' | 'pep' | 'adverse_media' | 'enforcement';
}
```

### sanctions.match.dismissed

```typescript
{
  matchId: string;
  userId: string;
  reviewerId: string;
}
```

### sanctions.entity.flagged

```typescript
{
  entityId: string;
  recordId: string;
  name: string;
  highestScore: number;
  autoBlocked: boolean;
}
```

## Event Listeners Example

```typescript
// In compliance module
@OnEvent('sanctions.match.auto-blocked')
async handleAutoBlock(payload: any) {
  // Block user account
  await userService.blockUser(payload.userId, 'Sanctions match');

  // Generate SAR
  await sarService.generateReport({
    userId: payload.userId,
    reason: 'sanctions_match',
    matches: payload.matches,
  });

  // Alert compliance team
  await notificationService.alertCompliance({
    type: 'auto_block',
    userId: payload.userId,
    severity: 'critical',
  });
}

@OnEvent('sanctions.match.requires-review')
async handleReviewRequired(payload: any) {
  // Add to compliance review queue
  await complianceCaseService.createCase({
    userId: payload.userId,
    type: 'sanctions_review',
    priority: 'high',
    metadata: payload,
  });
}
```

## Testing

### Development Testing

Use the mock provider with test triggers:

```typescript
// Test auto-block
const result = await screeningService.screenIndividual(
  'test-user-1',
  'John Sanction Test', // Triggers sanctions match
  new Date('1980-01-01'),
  'US',
  undefined,
  '+1234567666', // Phone contains "666" - triggers auto-block
);

expect(result.blocked).toBe(true);
expect(result.highestScore).toBeGreaterThanOrEqual(95);

// Test PEP match
const pepResult = await screeningService.screenIndividual(
  'test-user-2',
  'Political PEP Figure',
);

expect(pepResult.requiresReview).toBe(true);
expect(pepResult.blocked).toBe(false);
```

### Integration Testing

```typescript
describe('SanctionsScreeningService', () => {
  it('should auto-block on exact match', async () => {
    const result = await service.screenIndividual(
      userId,
      'Sanctioned Person',
      new Date('1975-06-15'),
    );

    expect(result.blocked).toBe(true);
    expect(result.approved).toBe(false);

    const isBlocked = await service.isUserBlocked(userId);
    expect(isBlocked).toBe(false); // Not blocked until match confirmed
  });

  it('should flag for review on fuzzy match', async () => {
    const result = await service.screenIndividual(
      userId,
      'Fuzzy Match Name',
    );

    expect(result.requiresReview).toBe(true);
    expect(result.blocked).toBe(false);
  });
});
```

## Compliance Reporting

### Match Rate Metrics

```typescript
const stats = await screeningService.getStatistics(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
);

console.log(`
  Screening Statistics:
  - Total Screenings: ${stats.totalScreenings}
  - Total Matches: ${stats.totalMatches}
  - Match Rate: ${(stats.totalMatches / stats.totalScreenings * 100).toFixed(2)}%
  - Auto-Blocked: ${stats.autoBlocked}
  - Requires Review: ${stats.requiresReview}
  - Average Match Score: ${stats.avgMatchScore}

  Match Resolutions:
  - Pending: ${stats.matchCounts.pending}
  - Confirmed: ${stats.matchCounts.confirmed}
  - False Positives: ${stats.matchCounts.false_positive}
`);
```

### Audit Trail

All screening activities are logged with:
- Who was screened
- When they were screened
- What matches were found
- Who reviewed matches
- Resolution decisions and notes

Query audit trail:

```typescript
const history = await screeningService.getUserScreeningHistory(userId);

for (const record of history.records) {
  console.log(`
    Screening: ${record.createdAt}
    Provider: ${record.provider}
    Matches: ${record.matchCount}
    Risk Level: ${record.riskLevel}
  `);
}

for (const match of history.matches) {
  console.log(`
    Match: ${match.matchedName}
    List: ${match.listType}
    Score: ${match.matchScore}
    Status: ${match.status}
    Reviewed: ${match.reviewedAt}
    Notes: ${match.resolutionNotes}
  `);
}
```

## Performance Considerations

### Caching

Consider caching recent screening results to avoid duplicate API calls:

```typescript
// Cache screening results for 1 hour
const cacheKey = `screening:${userId}:${hash(name)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await provider.screenIndividual(request);
await redis.setex(cacheKey, 3600, JSON.stringify(result));
```

### Batch Processing

Use batch API when screening multiple users:

```typescript
// More efficient than individual calls
const result = await screeningService.batchScreen(users);
```

### Async Processing

For non-blocking screening (e.g., periodic re-screening):

```typescript
// Queue screening job
await queue.add('screen-user', {
  userId,
  name,
  priority: 'low',
});
```

## Security Best Practices

1. **API Key Protection**: Store provider API keys in secure vault (AWS Secrets Manager, HashiCorp Vault)
2. **Access Control**: Restrict match review endpoints to compliance officers only
3. **Encryption**: Encrypt sensitive match data in database
4. **Audit Logging**: Log all screening and review activities
5. **Rate Limiting**: Implement rate limits on screening endpoints

## Troubleshooting

### Provider Connection Issues

```typescript
const healthy = await screeningService.healthCheck();

if (!healthy) {
  // Fall back to mock provider or alert ops team
  logger.error('Sanctions screening provider unhealthy');
}
```

### High False Positive Rate

Adjust fuzziness threshold:

```env
# Lower value = stricter matching = fewer false positives
COMPLYADVANTAGE_FUZZINESS=0.9
```

### Missing Matches

Ensure all user data is included in screening:

```typescript
// Include all available data for better matching
await screeningService.screenIndividual(
  userId,
  fullName,
  dateOfBirth,      // Important for disambiguation
  nationality,      // Helps filter matches
  identificationNumber,  // Can provide exact match
  phone,           // Additional identifier
);
```

## Support

For integration issues or questions:
- Email: compliance@joonapay.com
- Slack: #compliance-engineering
- Documentation: https://docs.joonapay.com/sanctions-screening
