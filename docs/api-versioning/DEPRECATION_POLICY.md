# JoonaPay API Deprecation Policy

This document outlines the official policy for deprecating and removing features, endpoints, and versions from the JoonaPay USDC Wallet API.

## Core Principles

1. **Transparency:** Deprecations are announced clearly with sufficient notice
2. **Predictability:** Consistent timeline and process for all deprecations
3. **Support:** Migration assistance provided throughout deprecation period
4. **Communication:** Multiple channels to reach affected developers
5. **Gradual:** Deprecation happens in phases, never abruptly

## Deprecation Timeline

### Standard Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Announcement    Grace Period    Deprecation     Sunset        │
│       │              │                │            │           │
│       ▼              ▼                ▼            ▼           │
│   T+0 days      T+180 days      T+365 days    T+730 days      │
│                                                                 │
│   [New version]  [Warnings]    [Maintenance]  [410 Gone]       │
│    released       added          only                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Minimum Timeline: 12 months from announcement to sunset
Standard Timeline: 18-24 months from announcement to sunset
```

### Timeline Breakdown

| Phase | Duration | Status | Description |
|-------|----------|--------|-------------|
| **Announcement** | Day 0 | Current | New version released, old version marked for deprecation |
| **Grace Period** | 0-6 months | Current | Both versions fully supported, no warnings |
| **Deprecation** | 6-12 months | Deprecated | Warnings added to responses, migration encouraged |
| **Maintenance** | 12-18 months | Maintenance | Only critical security fixes, active migration support |
| **Sunset** | 18+ months | Sunset | API returns 410 Gone, no support |

### Timeline by Change Type

| Change Type | Minimum Notice | Recommended Timeline | Example |
|-------------|---------------|---------------------|---------|
| Major Version | 18 months | 24 months | v1 → v2 |
| Endpoint Removal | 12 months | 18 months | `DELETE /old-endpoint` |
| Parameter Removal | 6 months | 12 months | Remove `deprecated_field` |
| Response Field Removal | 6 months | 12 months | Remove `old_field` from response |
| Enum Value Removal | 6 months | 9 months | Remove status value |
| Breaking Behavior Change | 12 months | 18 months | Change validation rules |

## What Constitutes a Breaking Change

### Breaking Changes (Require Deprecation)

#### API Structure
- Removing or renaming endpoints
- Changing HTTP methods (GET → POST)
- Changing URL structure
- Removing API versions

#### Request Changes
- Removing request parameters (query, path, body)
- Making optional parameters required
- Changing parameter types (string → integer)
- Changing validation rules (stricter validation)
- Removing accepted values from enums

#### Response Changes
- Removing response fields
- Changing response structure
- Changing field types
- Changing field meanings
- Removing status codes

#### Authentication
- Changing authentication mechanisms
- Removing authentication methods
- Stricter authorization requirements

#### Behavior
- Changing error response formats
- Changing rate limits (more restrictive)
- Changing timeout values (shorter)
- Changing pagination mechanics

### Non-Breaking Changes (No Deprecation Required)

#### Additive Changes
- Adding new endpoints
- Adding new optional parameters
- Adding new response fields
- Adding new enum values
- Adding new HTTP headers

#### Improvements
- Bug fixes
- Performance improvements
- More lenient validation
- Higher rate limits
- Better error messages

#### Documentation
- Documentation updates
- Example improvements
- SDK updates

## Deprecation Process

### 1. Planning Phase (T-90 days)

**Internal Review**
- [ ] Identify breaking changes
- [ ] Analyze impact on existing clients
- [ ] Create migration guide
- [ ] Build backward compatibility layer (if possible)
- [ ] Update SDK with new version support
- [ ] Prepare sandbox environment

**Documentation**
- [ ] Document all breaking changes
- [ ] Create before/after examples
- [ ] Prepare migration scripts/tools
- [ ] Update API reference documentation
- [ ] Create video tutorials (if major)

### 2. Announcement Phase (T-0)

**Communication Channels**

1. **Official Announcement** (All clients)
   - Email to all registered developers
   - Blog post on developer portal
   - Twitter/X announcement
   - Discord announcement

2. **Documentation Updates**
   - Deprecation notice on affected pages
   - Migration guide published
   - Changelog updated
   - API reference marked with deprecation badges

3. **In-API Notification**
   - Response headers indicate deprecation
   - Deprecation warnings in Swagger/OpenAPI spec

**Announcement Template**

```markdown
Subject: [Action Required] API v1 Deprecation - Migrate to v2 by [DATE]

Dear JoonaPay Developer,

We're announcing the deprecation of API v1, with sunset scheduled for [DATE].

What's Changing:
- [List of breaking changes]

Why We're Making These Changes:
- [Rationale for each major change]

Timeline:
- Now: v2 available in sandbox
- [Date]: Deprecation warnings added
- [Date]: v1 enters maintenance mode
- [Date]: v1 sunset (410 Gone)

How to Migrate:
1. Review migration guide: [URL]
2. Test in sandbox: [URL]
3. Update your integration
4. Monitor for deprecation warnings

Support Available:
- Migration guide: [URL]
- Email: migration@joonapay.com
- Office hours: Tuesdays 2-4 PM WAT
- Discord: #api-migration

Questions? Reply to this email or join our office hours.

JoonaPay Developer Relations Team
```

### 3. Grace Period (T+0 to T+180 days)

**Developer Experience**
- Both versions fully functional
- No deprecation warnings in responses
- Full support for both versions
- Migration guide available
- Sandbox environment ready

**Team Activities**
- Monitor adoption of new version
- Gather feedback on migration experience
- Update migration guide based on feedback
- Provide 1-on-1 migration support
- Host office hours for questions

### 4. Deprecation Phase (T+180 to T+365 days)

**API Changes**

Add deprecation headers to all responses:

```http
HTTP/1.1 200 OK
X-API-Version: 1.0.0
X-API-Latest-Version: 2.0.0
X-API-Deprecated: true
X-API-Sunset-Date: 2027-07-01
X-API-Deprecation-Info: API v1 is deprecated. Migrate to v2: https://docs.joonapay.com/migration
Sunset: Sat, 01 Jul 2027 00:00:00 GMT
```

**Communication**
- Monthly email reminders to clients still on old version
- Deprecation warnings in developer dashboard
- SDK warnings/logs when using deprecated version
- Status page updates

**Monitoring**
- Track usage of deprecated version
- Identify high-volume clients still on old version
- Reach out proactively to large clients
- Measure migration progress

### 5. Maintenance Phase (T+365 to T+730 days)

**Support Level**
- ✅ Critical security patches
- ✅ Breaking bug fixes
- ❌ New features
- ❌ Performance improvements
- ❌ Non-critical bug fixes

**Communication**
- Bi-weekly email reminders (final 3 months)
- Weekly reminders (final month)
- Daily reminders (final week)
- In-app notifications (if applicable)

**Actions**
- Identify clients still on deprecated version
- Personal outreach to remaining clients
- Offer migration assistance
- Document blockers and address them

### 6. Sunset Phase (T+730 days)

**API Behavior**

Deprecated endpoints return 410 Gone:

```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": {
    "code": "API_VERSION_SUNSET",
    "message": "API v1 has been sunset. Please use v2.",
    "sunsetDate": "2027-07-01T00:00:00Z",
    "migrationGuide": "https://docs.joonapay.com/migration/v1-to-v2"
  }
}
```

**Final Communication**
- Final notice email 1 week before sunset
- Status page incident on sunset day
- Support tickets for clients still affected
- Document lessons learned

## Communicating Deprecations

### Deprecation Notice Format

All deprecation notices must include:

1. **What's being deprecated:** Specific endpoint, parameter, or behavior
2. **Why:** Rationale for the change
3. **When:** Timeline with specific dates
4. **Alternative:** What to use instead
5. **How:** Link to migration guide
6. **Support:** Contact information for help

### Example: Endpoint Deprecation

```http
GET /api/v1/wallet/deposit/channels

HTTP/1.1 200 OK
X-Deprecated: true
X-Deprecation-Date: 2026-07-01
X-Sunset-Date: 2027-07-01
X-Alternative-Endpoint: GET /api/v2/wallet/channels
X-Migration-Guide: https://docs.joonapay.com/migration/channels

Response:
{
  "data": [...],
  "_meta": {
    "deprecation": {
      "deprecated": true,
      "deprecationDate": "2026-07-01",
      "sunsetDate": "2027-07-01",
      "alternative": "GET /api/v2/wallet/channels",
      "migrationGuide": "https://docs.joonapay.com/migration/channels"
    }
  }
}
```

### Example: Parameter Deprecation

```typescript
// Request
POST /api/v1/wallet/transfer
{
  "toPhone": "+2250701234567",    // Deprecated: Use recipient object
  "amount": 50.00
}

// Response
HTTP/1.1 200 OK
X-Deprecated-Parameters: toPhone

{
  "transfer": {...},
  "_warnings": [
    {
      "code": "DEPRECATED_PARAMETER",
      "parameter": "toPhone",
      "message": "Parameter 'toPhone' is deprecated. Use 'recipient.phone' instead.",
      "deprecationDate": "2026-07-01",
      "sunsetDate": "2027-07-01",
      "example": {
        "deprecated": { "toPhone": "+2250701234567" },
        "replacement": { "recipient": { "type": "phone", "phone": "+2250701234567" } }
      }
    }
  ]
}
```

## Exceptions to Standard Timeline

### Shortened Timeline (Security/Critical)

In cases of security vulnerabilities or critical issues, the timeline may be shortened:

**Immediate Deprecation (0-30 days)**
- Critical security vulnerabilities
- Data integrity issues
- Compliance violations

**Accelerated Deprecation (30-90 days)**
- High-priority security issues
- Breaking third-party dependencies
- Legal/regulatory requirements

**Process for Exceptions:**
1. Security team identifies critical issue
2. Engineering assesses impact and alternatives
3. Leadership approves shortened timeline
4. All clients notified immediately via:
   - Emergency email
   - Phone calls to top 20 clients
   - Status page incident
   - API warnings
5. Migration support prioritized
6. Postmortem published after resolution

**Recent Example:**
```
Issue: CVE-2025-XXXXX in authentication flow
Announcement: 2026-01-15
Deprecation: 2026-01-22 (7 days)
Sunset: 2026-02-15 (30 days total)
Rationale: Critical security vulnerability allowing account takeover
```

### Extended Timeline (Enterprise Clients)

Enterprise clients with complex integrations may request extensions:

**Eligibility:**
- Enterprise/business tier clients
- Active migration plan documented
- Valid technical blocker identified
- Commitment to complete migration

**Extension Request Process:**
1. Submit request via enterprise support channel
2. Provide migration timeline and blockers
3. Schedule review meeting with solutions team
4. Receive approval/denial within 5 business days
5. Extension documented in contract

**Maximum Extension:** 6 months beyond standard sunset
**Conditions:** May include additional support fees

## Monitoring Deprecated APIs

### Metrics to Track

1. **Usage Metrics**
   ```
   - Requests per day to deprecated endpoints
   - Unique clients using deprecated version
   - % of traffic on old vs new version
   ```

2. **Client Adoption**
   ```
   - Clients fully migrated
   - Clients partially migrated
   - Clients not started
   - Clients blocked (with reasons)
   ```

3. **Error Rates**
   ```
   - Errors on deprecated endpoints
   - Errors on new endpoints (migration issues)
   - Support tickets related to migration
   ```

4. **Performance**
   ```
   - Response time comparison (old vs new)
   - Resource usage comparison
   ```

### Dashboard Example

```
Deprecated API: v1
Sunset Date: 2027-07-01 (151 days remaining)

Usage Overview:
┌─────────────────────────────────────────┐
│ v1 Requests: 1.2M/day (▼ 45%)          │
│ v2 Requests: 2.1M/day (▲ 89%)          │
│ v1 → v2 Migration: 63% complete        │
└─────────────────────────────────────────┘

Client Status:
┌─────────────────────────────────────────┐
│ Fully Migrated:     245 (63%)           │
│ Partially Migrated:  78 (20%)           │
│ Not Started:         42 (11%)           │
│ Blocked:             23 (6%)            │
└─────────────────────────────────────────┘

Top Deprecated Endpoints:
┌─────────────────────────────────────────┐
│ 1. GET /wallet/deposit/channels  450K   │
│ 2. POST /wallet/transfer         320K   │
│ 3. GET /wallet/transactions      280K   │
└─────────────────────────────────────────┘

Clients Needing Attention:
┌─────────────────────────────────────────┐
│ • Client A: 450K req/day, not started   │
│ • Client B: 320K req/day, blocked       │
│ • Client C: 180K req/day, in progress   │
└─────────────────────────────────────────┘
```

## Migration Support

### Resources Provided

1. **Documentation**
   - Comprehensive migration guide
   - Before/after code examples
   - Video walkthroughs
   - FAQ document

2. **Tools**
   - Request/response transformers
   - Automated migration scripts
   - Validation tools
   - SDK upgrade helpers

3. **Environments**
   - Sandbox with both versions
   - Parallel testing environment
   - Migration testing tools

4. **Support**
   - Dedicated migration email
   - Office hours (weekly)
   - 1-on-1 consultation (enterprise)
   - Discord support channel

### Migration Assistance Levels

| Client Tier | Support Level | Response Time | Resources |
|-------------|--------------|---------------|-----------|
| **Free** | Self-service | Email (48h) | Docs, Discord, Office Hours |
| **Standard** | Email support | Email (24h) | + Migration scripts, Priority office hours |
| **Business** | Priority support | Email (12h) | + 1-on-1 calls, Custom scripts |
| **Enterprise** | Dedicated support | Email (4h), Phone | + Migration engineer, Custom development |

### Office Hours

**Schedule:**
- Every Tuesday, 2:00 PM - 4:00 PM WAT
- Every Thursday, 9:00 AM - 11:00 AM WAT (during active deprecation)

**Format:**
- Zoom meeting (link in deprecation emails)
- Open Q&A format
- Screen sharing for debugging
- Recorded and published later

**Topics:**
- Migration walkthrough
- Common issues and solutions
- Best practices
- New feature demos

## Rollback Policy

### When We Rollback

If a new version causes significant issues, we may rollback:

**Criteria for Rollback:**
- Critical bug affecting >10% of requests
- Security vulnerability in new version
- Performance degradation >50%
- Data integrity issues

**Rollback Process:**
1. Incident identified and confirmed
2. Emergency response team assembled
3. Rollback decision made (within 1 hour)
4. Rollback executed (within 2 hours)
5. All clients notified immediately
6. Deprecation timeline paused
7. Postmortem published within 48 hours

**Recent Example:**
```
Date: 2026-03-15
Issue: v2 authentication bug causing 401 errors
Impact: 15% of login requests failing
Decision: Rollback v2, extend v1 support
Timeline Extended: +90 days
Resolution: Bug fixed, v2 re-released 2026-04-01
```

## Client Responsibilities

### During Deprecation Period

Clients are expected to:

1. **Monitor:** Check response headers for deprecation warnings
2. **Plan:** Review migration guide and plan migration
3. **Test:** Test migration in sandbox environment
4. **Update:** Update integration to new version
5. **Deploy:** Deploy updated integration to production
6. **Verify:** Verify migration complete
7. **Communicate:** Notify JoonaPay of completion or blockers

### Client Checklist

```markdown
Migration Checklist for API v1 → v2

Pre-Migration:
- [ ] Review VERSION_HISTORY.md for all breaking changes
- [ ] Review MIGRATION_GUIDE_V1_V2.md
- [ ] Set up sandbox account for testing
- [ ] Identify all affected code paths
- [ ] Estimate migration effort

Development:
- [ ] Update API base URL
- [ ] Update amount handling (float → integer)
- [ ] Update pagination logic
- [ ] Update error handling
- [ ] Update request/response parsing
- [ ] Add idempotency keys
- [ ] Add request tracing headers
- [ ] Update SDK to latest version

Testing:
- [ ] Unit tests updated and passing
- [ ] Integration tests with sandbox
- [ ] Load testing with new version
- [ ] Error handling tested
- [ ] Backwards compatibility tested (if applicable)
- [ ] Security testing (auth, PIN, etc.)

Deployment:
- [ ] Staged rollout plan created
- [ ] Monitoring and alerts configured
- [ ] Rollback plan documented
- [ ] Deploy to staging environment
- [ ] Smoke tests pass
- [ ] Deploy to production (gradual)
- [ ] Monitor error rates and performance

Post-Deployment:
- [ ] Verify all traffic on v2
- [ ] Remove v1 code paths
- [ ] Update internal documentation
- [ ] Notify JoonaPay of completion
```

## Version Support Matrix

| Version | Release Date | Status | Security Fixes | Bug Fixes | New Features | Support End |
|---------|--------------|--------|----------------|-----------|--------------|-------------|
| v1.0 | 2026-01-01 | Current | ✅ Yes | ✅ Yes | ✅ Yes | 2027-07-01 |
| v2.0 | 2026-07-01 | Planned | - | - | - | TBD |

## FAQ

### When will my API version be deprecated?

Check the `X-API-Deprecated` and `X-API-Sunset-Date` response headers. If present, plan to migrate before the sunset date.

### How do I know if I'm using deprecated features?

Monitor these indicators:
1. `X-Deprecated: true` response header
2. `_warnings` array in response body
3. Deprecation notices in API documentation
4. Emails from JoonaPay developer relations

### Can I request an extension?

Yes, enterprise clients can request extensions. Contact your account manager or email migration@joonapay.com with:
- Your migration plan
- Technical blockers
- Requested extension duration
- Commitment to complete migration

### What happens if I don't migrate before sunset?

After sunset, the API will return `410 Gone` for all requests. Your application will stop working. Migrate before the sunset date to avoid disruption.

### Will you notify me before deprecation?

Yes, through multiple channels:
- Email to registered developer email
- API response headers
- Developer dashboard notifications
- Status page updates

### Can deprecated features be un-deprecated?

No. Once deprecated, the timeline proceeds as announced. However, if a rollback occurs due to issues with the new version, the timeline may be extended.

### Do I need to migrate all at once?

No. You can migrate gradually:
1. Run v1 and v2 in parallel
2. Migrate endpoint by endpoint
3. Test each migration thoroughly
4. Complete before sunset date

### Is there a cost to use the new version?

No. New API versions are included in your existing plan at no additional cost.

## Contact & Support

**General Questions:**
- Email: api-support@joonapay.com
- Discord: #api-deprecation
- Office Hours: Tuesdays 2-4 PM WAT

**Migration Support:**
- Email: migration@joonapay.com
- Discord: #api-migration
- Office Hours: Tuesdays 2-4 PM WAT

**Enterprise Support:**
- Contact your account manager
- Email: enterprise@joonapay.com
- Phone: +225 XX XX XX XX

**Emergency Security Issues:**
- Email: security@joonapay.com
- Report: https://joonapay.com/security/report

## References

- [API Versioning Strategy](/docs/API_VERSIONING.md)
- [Version History](/docs/api-versioning/VERSION_HISTORY.md)
- [Migration Guide v1→v2](/docs/api-versioning/MIGRATION_GUIDE_V1_V2.md)
- [API Status Page](https://status.joonapay.com)

---

**Document Version:** 1.0
**Last Updated:** January 30, 2026
**Next Review:** April 30, 2026
**Owner:** JoonaPay API Team
