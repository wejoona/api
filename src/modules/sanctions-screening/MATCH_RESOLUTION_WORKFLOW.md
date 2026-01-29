# Match Resolution Workflow

Comprehensive guide for compliance officers to review and resolve sanctions screening matches.

## Overview

When the sanctions screening system detects a potential match, it requires manual review to determine if it's a true match or false positive. This document outlines the complete workflow.

## Match Statuses

| Status | Description | Action Required |
|--------|-------------|-----------------|
| **pending** | New match awaiting review | Compliance review |
| **confirmed** | True positive - user is sanctioned | User blocked, SAR filed |
| **false_positive** | False alarm - different person | User can proceed |

## Scoring System

| Score Range | Risk Level | Auto-Action | Review Priority |
|-------------|------------|-------------|-----------------|
| 95-100 | High | Auto-block | Critical |
| 70-94 | Medium | Flag for review | High |
| 50-69 | Low | Log only | Medium |
| 0-49 | None | Pass | N/A |

## Review Queue Prioritization

Matches are prioritized for review based on:

1. **Match Score** (highest first)
2. **List Type** (sanctions > PEP > adverse media)
3. **User Activity** (active users before dormant)
4. **Age** (oldest pending matches first)

## Step-by-Step Review Process

### 1. Access Review Queue

```http
GET /sanctions-screening/matches/pending?minScore=70&limit=50
```

Response includes:
- Match ID
- User information
- Matched watchlist entry
- Match score and type
- List source

### 2. Gather User Information

Collect all available user data:
- Full name (including middle names, maiden names)
- Date of birth
- Nationality/citizenship
- Place of birth
- Current and historical addresses
- Identification documents
- Passport numbers
- National ID numbers
- Tax ID numbers
- Phone numbers
- Email addresses

### 3. Get Detailed Match Information

```http
GET /sanctions-screening/matches/{matchId}/details
```

Response provides:
- Full watchlist entry details
- All known aliases
- Date of birth (if available)
- Nationality
- Associated identifiers
- Source lists (OFAC, UN, EU, etc.)
- Program/sanction reason
- Additional context

### 4. Compare Data Points

Create a comparison matrix:

| Data Point | User | Watchlist Entry | Match? |
|-----------|------|-----------------|--------|
| Full Name | John Michael Smith | John M. Smith | Similar |
| Date of Birth | 1985-03-15 | 1985-03-15 | ✓ Exact |
| Nationality | US | RU | ✗ Different |
| Location | Côte d'Ivoire | Russia | ✗ Different |
| Passport | CI123456 | RU789012 | ✗ Different |

### 5. Assess Match Likelihood

Consider these factors:

#### Strong Indicators of TRUE Match:
- ✓ Exact name match
- ✓ Same date of birth
- ✓ Same nationality
- ✓ Matching identification numbers
- ✓ Same or connected locations
- ✓ Multiple aliases match
- ✓ User behavior aligns with watchlist activity

#### Strong Indicators of FALSE Positive:
- ✗ Different date of birth
- ✗ Different nationality
- ✗ Common name (e.g., "Mohammed Ali", "John Smith")
- ✗ User has valid local ID documents
- ✗ No geographic connection
- ✗ Age difference
- ✗ Gender mismatch

### 6. Document Review

#### For Potential TRUE Match:
1. Request additional documentation from user:
   - Government-issued photo ID
   - Proof of address
   - Birth certificate
   - Passport

2. Conduct enhanced due diligence:
   - Search for news articles
   - Check business registrations
   - Verify employment history
   - Contact references

3. Escalate to senior compliance officer

#### For Likely FALSE Positive:
1. Document reasoning clearly
2. Note which data points don't match
3. Save evidence for audit trail

### 7. Make Decision

#### Confirm Match (True Positive)

```http
POST /sanctions-screening/matches/{matchId}/review
{
  "decision": "confirm",
  "notes": "Exact match on name, DOB, and nationality. User provided passport matches watchlist identifier RU789012. Listed on OFAC SDN for sanctions violations under UKRAINE-EO13662."
}
```

**Automated actions:**
- User account immediately blocked
- All pending transactions cancelled
- Balances frozen
- SAR (Suspicious Activity Report) generated
- Compliance team alerted
- Event logged: `sanctions.match.confirmed`

#### Dismiss as False Positive

```http
POST /sanctions-screening/matches/{matchId}/review
{
  "decision": "dismiss",
  "notes": "Different date of birth (user: 1990-05-20, watchlist: 1975-03-15). Different nationality (user: CI, watchlist: RU). User provided valid Ivorian passport CI123456. Common name but no other matching identifiers. Verified false positive."
}
```

**Automated actions:**
- Match status updated to `false_positive`
- User can proceed normally
- No further action required
- Event logged: `sanctions.match.dismissed`

## Review Notes Best Practices

### Good Example

```
DECISION: False Positive

ANALYSIS:
- Name similarity: 85% (John Michael Smith vs John M. Smith)
- DOB: Different (User: 1990-05-20, List: 1975-03-15) ✗
- Nationality: Different (User: CI, List: RU) ✗
- Passport: User has valid CI passport #CI123456 ✗
- Location: User in Abidjan, CI. List entry in Moscow, RU ✗

VERIFICATION:
- Reviewed copy of passport (uploaded 2024-01-15)
- Verified DOB on government ID
- No geographic or business connection to sanctioned individual

CONCLUSION:
Common name match only. No other data points align. Different person confirmed via ID verification.

Reviewed by: Officer Jane Doe
Date: 2024-01-20 14:30 UTC
```

### Poor Example ❌

```
Not the same person. Dismissed.
```

## Escalation Scenarios

Escalate to senior compliance officer when:

1. **High-value customer**: Account balance > $100,000
2. **Exact match**: Score = 100 with matching DOB and nationality
3. **Multiple matches**: User matches multiple watchlist entries
4. **Uncertain**: Unable to conclusively determine true/false positive
5. **VIP/PEP**: User is a politically exposed person
6. **Media attention**: User has adverse media coverage
7. **Complex case**: Requires legal interpretation

## Time Limits

| Priority | Initial Review | Final Decision |
|----------|----------------|----------------|
| Critical (score 95+) | 4 hours | 24 hours |
| High (score 80-94) | 24 hours | 72 hours |
| Medium (score 70-79) | 72 hours | 7 days |

## Bulk Review Tools

For periodic re-screening with many matches:

### Export Matches to CSV

```http
GET /sanctions-screening/matches/pending?format=csv
```

### Batch Review

```http
POST /sanctions-screening/matches/bulk-review
{
  "reviews": [
    {
      "matchId": "uuid-1",
      "decision": "dismiss",
      "notes": "Different DOB, verified false positive"
    },
    {
      "matchId": "uuid-2",
      "decision": "confirm",
      "notes": "Exact match confirmed via passport verification"
    }
  ]
}
```

## Audit Trail

Every review action is logged with:
- Match ID
- Reviewer ID and name
- Decision (confirm/dismiss)
- Review notes
- Timestamp
- IP address
- User agent

Query audit history:

```http
GET /sanctions-screening/matches/{matchId}/audit-trail
```

## Compliance Reporting

### Weekly Review Summary

```typescript
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-07');

const report = await sanctionsScreeningService.getStatistics(startDate, endDate);

// Generate report
{
  totalMatches: 45,
  pending: 10,
  confirmed: 2,
  falsePositives: 33,
  avgReviewTime: '18 hours',
  reviewers: ['Officer A', 'Officer B'],
  highRiskMatches: 5
}
```

### Monthly SAR Count

```sql
SELECT
  COUNT(*) as confirmed_matches,
  COUNT(DISTINCT user_id) as unique_users,
  list_type,
  source
FROM compliance.screening_matches
WHERE status = 'confirmed'
  AND created_at >= '2024-01-01'
  AND created_at < '2024-02-01'
GROUP BY list_type, source;
```

## Training Resources

### Required Reading
- OFAC Sanctions List Overview
- EU Consolidated Sanctions List Guide
- UN Security Council Sanctions
- PEP Identification Guidelines
- Adverse Media Assessment

### Practice Scenarios

#### Scenario 1: Common Name
**User**: Mohammed Ali, DOB: 1995-06-10, Nationality: SN
**Match**: Mohammed Ali, DOB: 1970-03-20, Nationality: IQ
**Score**: 75 (fuzzy name match)

**Analysis**: Very common name, different DOB, different nationality
**Decision**: FALSE POSITIVE

#### Scenario 2: Alias Match
**User**: John Smith, DOB: 1980-05-15, Nationality: RU
**Match**: John Smithson (aka John Smith), DOB: 1980-05-15, Nationality: RU
**Score**: 92 (alias match)

**Analysis**: Same DOB, same nationality, name is known alias
**Decision**: Requires enhanced due diligence → Likely TRUE MATCH

#### Scenario 3: PEP
**User**: Alassane Ouattara Jr., DOB: 2000-08-12, Nationality: CI
**Match**: Alassane Ouattara (President), DOB: 1942-01-01, Nationality: CI
**Score**: 88 (fuzzy name match)

**Analysis**: Same first/last name, same nationality, but 58-year age difference
**Decision**: Possible relative of PEP → Enhanced Due Diligence required

## Quality Assurance

### Random Sample Review
- 10% of false positives randomly re-reviewed
- All confirmed matches reviewed by supervisor
- Monthly team calibration sessions

### Key Metrics
- Average review time
- False positive rate
- Inter-reviewer agreement
- Escalation rate

## Tools and Resources

### Internal Tools
- User profile viewer: `/admin/users/{userId}`
- Document viewer: `/admin/documents/{userId}`
- Transaction history: `/admin/transactions?userId={userId}`

### External Resources
- OFAC SDN Search: https://sanctionssearch.ofac.treas.gov/
- UN Security Council: https://www.un.org/securitycouncil/sanctions/
- EU Sanctions Map: https://www.sanctionsmap.eu/
- World-Check (if subscribed)

## Contact

For questions or escalations:
- **Email**: compliance@joonapay.com
- **Slack**: #compliance-team
- **Phone**: +225 XX XX XX XX (emergency only)
- **On-call**: PagerDuty (critical matches only)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-20 | Initial workflow documentation |
| 1.1 | 2024-02-15 | Added bulk review tools |
| 1.2 | 2024-03-10 | Updated escalation criteria |
