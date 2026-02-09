# Security Audit Report - Dependency Vulnerabilities

**Project:** usdc-wallet
**Audit Date:** 2026-01-30
**Auditor:** Security Audit Tool (npm audit)
**Total Dependencies:** 1,368 (651 production, 658 dev, 93 optional)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Moderate | 3 |
| Low | 1 |
| **Total** | **4** |

**Overall Risk Assessment:** MODERATE

The codebase has no critical or high-severity vulnerabilities. The identified issues are primarily in transitive dependencies and have limited exploitability in the context of this application.

---

## Vulnerability Details

### 1. Lodash - Prototype Pollution (MODERATE)

| Field | Value |
|-------|-------|
| **Package** | lodash |
| **Installed Version** | 4.17.21 |
| **Vulnerable Range** | 4.0.0 - 4.17.22 |
| **CVE/Advisory** | [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) |
| **CVSS Score** | 6.5 |
| **CWE** | CWE-1321 (Prototype Pollution) |

**Description:**
Lodash versions before 4.17.22 are vulnerable to Prototype Pollution via the `_.unset` and `_.omit` functions. An attacker could inject properties into JavaScript object prototypes, potentially leading to:
- Denial of service
- Property injection
- Logic manipulation

**Affected Dependency Chain:**
```
usdc-wallet
  ├── @nestjs/config@4.0.2 -> lodash@4.17.21
  ├── @nestjs/swagger@11.2.5 -> lodash@4.17.21
  ├── @nestjs/cli@11.0.16 -> node-emoji -> lodash@4.17.21
  ├── nestjs-ddd-cli@2.2.1 -> inquirer -> lodash@4.17.21
  └── testcontainers@11.11.0 -> archiver -> archiver-utils -> lodash@4.17.21
```

**Risk Assessment:**
- `@nestjs/config` and `@nestjs/swagger` are production dependencies
- Prototype pollution requires attacker-controlled input reaching the vulnerable functions
- NestJS does not directly expose lodash's `_.unset` or `_.omit` to user input

**Remediation:**
```bash
# Option 1: Override lodash version (recommended)
# Add to package.json:
"overrides": {
  "lodash": "^4.17.22"
}

# Then run:
npm install

# Option 2: Wait for upstream fixes
# Monitor @nestjs/config and @nestjs/swagger for updates
```

---

### 2. @nestjs/config - Vulnerable Dependency (MODERATE)

| Field | Value |
|-------|-------|
| **Package** | @nestjs/config |
| **Installed Version** | 4.0.2 |
| **Vulnerable Range** | >=1.1.6 |
| **Root Cause** | Depends on vulnerable lodash |

**Description:**
This package depends on lodash 4.17.21 which contains the prototype pollution vulnerability described above.

**Remediation:**
```bash
# Use npm overrides to force lodash upgrade
# Add to package.json:
"overrides": {
  "lodash": "^4.17.22"
}
```

---

### 3. @nestjs/swagger - Vulnerable Dependency (MODERATE)

| Field | Value |
|-------|-------|
| **Package** | @nestjs/swagger |
| **Installed Version** | 11.2.5 |
| **Vulnerable Range** | 1.1.0 - 1.1.4 OR >=3.0.1 |
| **Root Cause** | Depends on vulnerable lodash |

**Description:**
This package depends on lodash 4.17.21 which contains the prototype pollution vulnerability described above.

**Remediation:**
```bash
# Use npm overrides to force lodash upgrade (same as above)
```

---

### 4. diff - Denial of Service (LOW)

| Field | Value |
|-------|-------|
| **Package** | diff |
| **Installed Version** | 4.0.2 |
| **Vulnerable Range** | <4.0.4 |
| **CVE/Advisory** | [GHSA-73rr-hh4g-fpgx](https://github.com/advisories/GHSA-73rr-hh4g-fpgx) |
| **CVSS Score** | N/A (Low severity) |
| **CWE** | CWE-400 (Resource Exhaustion), CWE-1333 (ReDoS) |

**Description:**
The `parsePatch` and `applyPatch` functions are vulnerable to Regular Expression Denial of Service (ReDoS) when processing specially crafted input.

**Affected Dependency Chain:**
```
usdc-wallet
  └── ts-node@10.9.2 -> diff@4.0.2
```

**Risk Assessment:**
- `diff` is only a **development dependency** (via ts-node)
- Not used in production runtime
- Minimal risk as it only affects development/build processes

**Remediation:**
```bash
# Option 1: Upgrade ts-node (if compatible)
npm update ts-node

# Option 2: Override diff version
# Add to package.json:
"overrides": {
  "diff": "^4.0.4"
}

# Then run:
npm install
```

---

## Security-Critical Package Versions

The following security-critical packages are at current versions with no known vulnerabilities:

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| bcrypt | 6.0.0 | Current | Latest major version |
| jsonwebtoken | 9.0.3 | Current | Used via @nestjs/jwt |
| passport-jwt | 4.0.1 | Current | No known CVEs |
| helmet | 8.1.0 | Current | Latest, provides security headers |
| cookie-parser | 1.4.7 | Current | No known CVEs |
| axios | 1.13.2 | Update Available | 1.13.4 available |
| multer | 1.4.5-lts.2 | Update Available | 2.0.2 available (breaking) |

---

## Outdated Packages (Security Recommended Updates)

| Package | Current | Wanted | Latest | Priority |
|---------|---------|--------|--------|----------|
| axios | 1.13.2 | 1.13.4 | 1.13.4 | Medium |
| pg | 8.17.1 | 8.17.2 | 8.17.2 | Medium |
| @aws-sdk/client-s3 | 3.975.0 | 3.978.0 | 3.978.0 | Low |
| sharp | 0.33.5 | 0.33.5 | 0.34.5 | Low |
| multer | 1.4.5-lts.2 | 1.4.5-lts.2 | 2.0.2 | Low (major) |

---

## Recommended Remediation Steps

### Immediate Actions (Priority: HIGH)

1. **Add npm overrides to fix lodash vulnerability:**

```json
// Add to package.json
{
  "overrides": {
    "lodash": "^4.17.22",
    "diff": "^4.0.4"
  }
}
```

2. **Run npm install to apply overrides:**
```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm install
npm audit
```

### Short-term Actions (Priority: MEDIUM)

1. **Update minor versions:**
```bash
npm update axios pg
```

2. **Verify no regressions:**
```bash
npm test
npm run test:e2e
```

### Long-term Actions (Priority: LOW)

1. **Monitor upstream packages** for lodash dependency updates
2. **Consider major version upgrades** when available:
   - multer 1.x -> 2.x (breaking changes)
   - sharp 0.33.x -> 0.34.x
3. **Set up automated dependency scanning** in CI/CD:
   - GitHub Dependabot
   - Snyk
   - npm audit in CI pipeline

---

## CI/CD Integration Recommendation

Add the following to your CI pipeline to prevent vulnerable dependencies:

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci
        working-directory: ./usdc-wallet

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        working-directory: ./usdc-wallet
```

---

## OWASP References

| Vulnerability | OWASP Category |
|--------------|----------------|
| Prototype Pollution (lodash) | A03:2021 - Injection |
| ReDoS (diff) | A05:2021 - Security Misconfiguration |
| Vulnerable Dependencies | A06:2021 - Vulnerable and Outdated Components |

---

## Conclusion

The usdc-wallet backend has **no critical or high-severity vulnerabilities**. The identified moderate issues are primarily in transitive dependencies and can be mitigated using npm overrides without breaking changes.

**Recommended immediate action:** Apply npm overrides for lodash and diff packages.

---

*Report generated: 2026-01-30*
*Next audit recommended: 2026-02-28 (monthly)*
