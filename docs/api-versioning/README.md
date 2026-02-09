# API Versioning Documentation

Comprehensive documentation for JoonaPay USDC Wallet API versioning, deprecation, and migration processes.

## Quick Links

| Document | Description | Audience |
|----------|-------------|----------|
| [VERSION_HISTORY.md](./VERSION_HISTORY.md) | Complete version history with timelines and changes | All developers |
| [DEPRECATION_POLICY.md](./DEPRECATION_POLICY.md) | Official deprecation policy and procedures | API consumers, platform teams |
| [MIGRATION_GUIDE_V1_V2.md](./MIGRATION_GUIDE_V1_V2.md) | Step-by-step migration guide from v1 to v2 | Developers migrating from v1 |

## Overview

JoonaPay API uses **URI-based versioning** to maintain backward compatibility while enabling API evolution. This directory contains all documentation related to versioning strategy, deprecation policies, and migration guides.

### Versioning Strategy

```
https://api.joonapay.com/api/v{version}/{resource}

Examples:
- https://api.joonapay.com/api/v1/wallet
- https://api.joonapay.com/api/v2/wallet/transfer
```

### Current Status

| Version | Status | Release Date | Support Level |
|---------|--------|--------------|---------------|
| **v1.0** | ✅ Current | 2026-01-01 | Full Support |
| **v2.0** | 📅 Planned | 2026-07-01 | In Development |

## For API Consumers

### I'm Using v1 - What Should I Do?

1. **Read:** [VERSION_HISTORY.md](./VERSION_HISTORY.md) to understand what's changing
2. **Plan:** Review [MIGRATION_GUIDE_V1_V2.md](./MIGRATION_GUIDE_V1_V2.md) for migration steps
3. **Test:** Use sandbox environment to test v2 integration
4. **Migrate:** Complete migration before v1 sunset date (2027-07-01)

### Timeline for v1 Users

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Now          v2 Released    Warnings    Maintenance   Sunset  │
│   │                │             │            │          │     │
│   ▼                ▼             ▼            ▼          ▼     │
│ 2026-01-01    2026-07-01    2027-01-01   2027-04-01  2027-07-01│
│                                                                 │
│ [v1 Current]  [v1 Deprecated] [Warnings] [Security Only] [410] │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

You have 18 months to migrate (2026-01-01 → 2027-07-01)
```

### Quick Start: Migration Checklist

- [ ] Review [VERSION_HISTORY.md](./VERSION_HISTORY.md) - breaking changes
- [ ] Review [MIGRATION_GUIDE_V1_V2.md](./MIGRATION_GUIDE_V1_V2.md) - step-by-step guide
- [ ] Set up sandbox environment
- [ ] Create utility functions (amount conversion, error handling)
- [ ] Migrate non-critical endpoints first
- [ ] Test thoroughly in sandbox
- [ ] Deploy to production gradually
- [ ] Monitor for issues
- [ ] Complete migration before 2027-07-01

### Detecting Deprecation

Check response headers:

```http
HTTP/1.1 200 OK
X-API-Version: 1.0.0
X-API-Latest-Version: 2.0.0
X-API-Deprecated: true
X-API-Sunset-Date: 2027-07-01
X-API-Deprecation-Info: API v1 is deprecated. Migrate to v2: https://docs.joonapay.com/migration
```

If you see `X-API-Deprecated: true`, start planning your migration!

## For Platform Teams

### Managing API Versions

#### Adding a New Version

1. **Planning** (3-6 months before release)
   - Identify breaking changes
   - Design new API structure
   - Create migration guide
   - Build backward compatibility layers

2. **Development** (2-3 months)
   - Implement new version
   - Create separate controllers (optional)
   - Update documentation
   - Build migration tools

3. **Testing** (1-2 months)
   - Internal testing
   - Beta testing with select clients
   - Load testing
   - Security audit

4. **Release** (Day 0)
   - Deploy new version
   - Announce to all clients
   - Update documentation
   - Enable sandbox access

See [DEPRECATION_POLICY.md](./DEPRECATION_POLICY.md) for complete process.

#### Deprecating a Version

Follow the standard timeline:

1. **Announcement** (T+0): New version released, old version marked for deprecation
2. **Grace Period** (0-6 months): Both versions fully supported
3. **Deprecation** (6-12 months): Warnings added, migration encouraged
4. **Maintenance** (12-18 months): Security fixes only
5. **Sunset** (18+ months): API returns 410 Gone

See [DEPRECATION_POLICY.md](./DEPRECATION_POLICY.md) for details.

### Version Monitoring

Track these metrics per version:

```
Dashboard Metrics:
- Request volume per version
- Error rates per version
- Response times per version
- Active clients per version
- Migration progress
```

### Version Support Matrix

| Version | Security Fixes | Bug Fixes | New Features | Support End |
|---------|----------------|-----------|--------------|-------------|
| Current | ✅ Yes | ✅ Yes | ✅ Yes | Next version + 18 months |
| Deprecated | ✅ Yes | ⚠️ Critical only | ❌ No | 12+ months |
| Sunset | ❌ No | ❌ No | ❌ No | Immediately |

## Document Structure

### VERSION_HISTORY.md

**Purpose:** Complete historical record of all API versions

**Contains:**
- Version overview table
- Release notes for each version
- Breaking changes summary
- Endpoint changes
- Timeline for each version
- Known limitations
- Migration support resources

**When to read:**
- Understanding what changed between versions
- Planning migration timeline
- Reviewing past decisions

### DEPRECATION_POLICY.md

**Purpose:** Official policy for deprecating API features

**Contains:**
- Deprecation timeline and phases
- Communication strategy
- What constitutes a breaking change
- Exception procedures
- Client responsibilities
- Support resources

**When to read:**
- Before deprecating any API feature
- Understanding deprecation timeline
- Planning communication strategy
- Requesting extensions

### MIGRATION_GUIDE_V1_V2.md

**Purpose:** Practical guide for migrating from v1 to v2

**Contains:**
- Breaking changes overview
- Endpoint-by-endpoint migration steps
- Code examples (before/after)
- Common patterns and utilities
- Testing strategies
- Deployment approaches
- Troubleshooting guide

**When to read:**
- Actively migrating from v1 to v2
- Planning migration effort
- Troubleshooting migration issues

## Breaking Changes Overview

### v1 → v2 Major Changes

| Change | v1 | v2 | Impact |
|--------|----|----|--------|
| **Amounts** | Float dollars (50.00) | Integer cents (5000) | 🔴 High |
| **Response Structure** | Varies | Standardized `data` wrapper | 🔴 High |
| **Errors** | String messages | Structured error codes | 🔴 High |
| **Pagination** | Offset-based | Page-based | 🟡 Medium |
| **Balance** | Single currency | Multi-currency array | 🟡 Medium |

See [MIGRATION_GUIDE_V1_V2.md](./MIGRATION_GUIDE_V1_V2.md) for complete details.

## Support Resources

### Documentation

- **Main API Docs:** https://docs.joonapay.com
- **v1 Reference:** https://docs.joonapay.com/api/v1
- **v2 Reference:** https://docs.joonapay.com/api/v2
- **Changelog:** https://docs.joonapay.com/changelog

### Environments

- **Production v1:** https://api.joonapay.com/api/v1
- **Production v2:** https://api.joonapay.com/api/v2 (available 2026-07-01)
- **Sandbox v1:** https://sandbox.api.joonapay.com/api/v1
- **Sandbox v2:** https://sandbox.api.joonapay.com/api/v2

### Support Channels

**General Support:**
- Email: api-support@joonapay.com
- Response time: 24 hours
- Available: Monday-Friday, 9 AM - 5 PM WAT

**Migration Support:**
- Email: migration@joonapay.com
- Response time: 12 hours
- Available: Monday-Friday, 9 AM - 6 PM WAT

**Office Hours:**
- When: Every Tuesday, 2:00 PM - 4:00 PM WAT
- Where: Zoom (link sent via email)
- Format: Open Q&A, screen sharing, debugging help

**Community:**
- Discord: https://discord.gg/joonapay
- Channel: #api-migration
- Active: 24/7 (community-supported)

**Enterprise Support:**
- Contact: Your account manager
- Email: enterprise@joonapay.com
- Phone: +225 XX XX XX XX
- Response time: 4 hours
- Dedicated migration engineer available

### Emergency Contact

For critical production issues:
- **Security Issues:** security@joonapay.com
- **Emergency Hotline:** +225 XX XX XX XX (24/7)
- **Status Page:** https://status.joonapay.com

## FAQ

### When will v1 stop working?

v1 will be sunset on **July 1, 2027**. After this date, all v1 requests will return `410 Gone`. You have 18 months from now to migrate.

### Can I use both v1 and v2 at the same time?

Yes! You can run v1 and v2 in parallel during migration. This is the recommended approach for gradual migration.

### Will my API keys work with v2?

Yes, the same API keys and authentication work for both v1 and v2.

### Do I need to migrate all at once?

No. You can migrate endpoint by endpoint. Start with read-only endpoints (like balance), then move to write operations (like transfers).

### What if I can't complete migration by the deadline?

Enterprise clients can request extensions. Email migration@joonapay.com with:
- Your migration plan
- Technical blockers
- Requested extension duration

### Will there be a cost to use v2?

No, v2 is included in your existing plan at no additional cost.

### How do I test v2 without affecting production?

Use the sandbox environment:
- URL: https://sandbox.api.joonapay.com/api/v2
- Same test credentials as v1 sandbox
- Separate test data

### What happens if v2 has bugs?

We have a rollback policy. If critical issues are found in v2, we may:
- Rollback v2
- Extend v1 support timeline
- Provide additional migration assistance

See [DEPRECATION_POLICY.md](./DEPRECATION_POLICY.md) for rollback procedures.

### Who do I contact for migration help?

**Self-Service:**
- Read [MIGRATION_GUIDE_V1_V2.md](./MIGRATION_GUIDE_V1_V2.md)
- Join Discord: #api-migration
- Attend office hours (Tuesdays)

**Email Support:**
- migration@joonapay.com (response in 12 hours)

**1-on-1 Support:**
- Available for Business and Enterprise clients
- Schedule via your account manager

## Contributing

### Updating Documentation

When making changes to API versions:

1. **Update VERSION_HISTORY.md** with new version information
2. **Update DEPRECATION_POLICY.md** if timeline changes
3. **Create/update migration guides** for version transitions
4. **Update this README** with current status

### Documentation Standards

- Use clear, concise language
- Include code examples for all breaking changes
- Provide before/after comparisons
- Link between related documents
- Keep FAQ up to date

### Review Process

All versioning documentation must be reviewed by:
- API team lead
- Developer relations
- Product management

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-30 | Initial versioning documentation created | API Team |
| 2026-01-01 | v1.0 released | API Team |

## Related Documentation

### In This Repository

- [API Versioning Strategy](/docs/API_VERSIONING.md) - Technical implementation
- [Architecture Documentation](/docs/ARCHITECTURE.md) - System architecture
- [API Changes Directory](/docs/api-changes/) - Detailed endpoint changes

### External Links

- [API Documentation](https://docs.joonapay.com)
- [Developer Portal](https://developers.joonapay.com)
- [Status Page](https://status.joonapay.com)
- [Blog](https://blog.joonapay.com)

---

**Questions?**

- Email: api-support@joonapay.com
- Discord: https://discord.gg/joonapay
- Twitter: @JoonaPayDev

**Last Updated:** January 30, 2026
**Next Review:** April 30, 2026
