# SQL Injection Security Audit Report

**Date:** 2026-01-29
**Auditor:** Security Audit (Claude)
**Scope:** `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src`
**Focus:** SQL Injection vulnerabilities in TypeORM queries

---

## Executive Summary

The codebase demonstrates **generally good security practices** with TypeORM. Most queries use parameterized queries correctly. **2 HIGH severity** and **3 MEDIUM severity** vulnerabilities were identified and **all have been remediated**.

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | - |
| High | 2 | FIXED |
| Medium | 3 | FIXED |
| Low | 1 | Informational (already mitigated) |

---

## Findings

### HIGH-001: Dynamic Column Name in ORDER BY (SQL Injection)

**File:** `/src/modules/transaction/infrastructure/repositories/transaction.repository.ts`
**Line:** 237
**OWASP:** A03:2021-Injection
**CVSS:** 7.5 (High)

**Vulnerable Code:**
```typescript
const sortBy = filters.sortBy || 'createdAt';
const sortOrder = filters.sortOrder || 'DESC';
query.orderBy(`tx.${sortBy}`, sortOrder);  // VULNERABLE
```

**Issue:** The `sortBy` parameter is directly interpolated into the SQL query without validation. Although the DTO validates against an enum `['createdAt', 'amount']`, if the DTO validation is bypassed or the validation changes, this becomes exploitable.

**Risk:** An attacker could inject malicious SQL via the `sortBy` parameter, potentially extracting data or manipulating query logic.

**Fix Applied:**
```typescript
const validSortBy = validateSortColumn(
  filters.sortBy,
  ALLOWED_SORT_COLUMNS.transaction,
  'createdAt',
);
const validSortOrder = validateSortOrder(filters.sortOrder, 'DESC');
query.orderBy(`tx.${validSortBy}`, validSortOrder);
```

**Status:** FIXED

---

### HIGH-002: Dynamic Column Name in ORDER BY (Alert Repository)

**File:** `/src/modules/monitoring/infrastructure/repositories/alert.repository.ts`
**Line:** 137
**OWASP:** A03:2021-Injection
**CVSS:** 7.5 (High)

**Vulnerable Code:**
```typescript
queryBuilder.orderBy(`alert.${sortBy}`, sortOrder).skip(skip).take(limit);
```

**Issue:** The `sortBy` parameter comes from `PaginationOptions.sortBy` which is typed as `string` without runtime validation.

**Fix Applied:**
```typescript
const validSortBy = validateSortColumn(
  sortBy,
  ALLOWED_SORT_COLUMNS.alert,
  'createdAt',
);
const validSortOrder = validateSortOrder(sortOrder, 'DESC');
queryBuilder.orderBy(`alert.${validSortBy}`, validSortOrder).skip(skip).take(limit);
```

**Status:** FIXED

---

### MEDIUM-001: LIKE Pattern with User Input (Audit Service)

**File:** `/src/modules/admin/application/services/audit.service.ts`
**Lines:** 85-87
**OWASP:** A03:2021-Injection
**CVSS:** 5.3 (Medium)

**Vulnerable Code:**
```typescript
if (params.action) {
  queryBuilder.andWhere('audit.action LIKE :action', {
    action: `%${params.action}%`,
  });
}
```

**Issue:** The `action` parameter is not sanitized before being used in a LIKE query.

**Fix Applied:**
```typescript
if (params.action) {
  const escapedAction = escapeLikePattern(params.action);
  queryBuilder.andWhere('audit.action LIKE :action', {
    action: `%${escapedAction}%`,
  });
}
```

**Status:** FIXED

---

### MEDIUM-002: LIKE Pattern with User Input (Watchlist Repository)

**File:** `/src/modules/compliance/infrastructure/repositories/typeorm-watchlist.repository.ts`
**Lines:** 53-58
**OWASP:** A03:2021-Injection
**CVSS:** 5.3 (Medium)

**Vulnerable Code:**
```typescript
.andWhere(
  '(LOWER(entry.name) LIKE LOWER(:name) OR entry.aliases::text ILIKE :aliasPattern)',
  {
    name: `%${name}%`,
    aliasPattern: `%${name}%`,
  },
);
```

**Fix Applied:**
```typescript
const escapedName = escapeLikePattern(name);
.andWhere(
  '(LOWER(entry.name) LIKE LOWER(:name) OR entry.aliases::text ILIKE :aliasPattern)',
  {
    name: `%${escapedName}%`,
    aliasPattern: `%${escapedName}%`,
  },
);
```

**Status:** FIXED

---

### MEDIUM-003: LIKE Pattern with User Input (Contact Repository)

**File:** `/src/modules/contacts/infrastructure/repositories/contact.repository.ts`
**Lines:** 87-88
**OWASP:** A03:2021-Injection
**CVSS:** 5.3 (Medium)

**Vulnerable Code:**
```typescript
.andWhere(
  '(LOWER(contact.name) LIKE :query OR LOWER(contact.username) LIKE :query)',
  { query: `%${query.toLowerCase()}%` },
)
```

**Fix Applied:**
```typescript
const escapedQuery = escapeLikePattern(query.toLowerCase());
.andWhere(
  '(LOWER(contact.name) LIKE :query OR LOWER(contact.username) LIKE :query)',
  { query: `%${escapedQuery}%` },
)
```

**Status:** FIXED

---

### MEDIUM-004: LIKE Pattern with User Input (User Repository)

**File:** `/src/modules/user/infrastructure/repositories/user.repository.ts`
**Lines:** 81-90
**OWASP:** A03:2021-Injection
**CVSS:** 5.3 (Medium)

**Vulnerable Code:**
```typescript
.where('LOWER(user.username) LIKE :query', {
  query: `${normalizedQuery}%`,
})
```

**Fix Applied:**
```typescript
const escapedQuery = escapeLikePattern(normalizedQuery);
.where('LOWER(user.username) LIKE :query', {
  query: `${escapedQuery}%`,
})
```

**Status:** FIXED

---

### LOW-001: User Search Input (Already Fixed)

**File:** `/src/modules/admin/application/services/admin.service.ts`
**Lines:** 93-153
**Status:** PROPERLY MITIGATED (pre-existing fix)

**Good Practice Observed:**
```typescript
private sanitizeSearchInput(search: string): string {
  let sanitized = search.replace(/[^a-zA-Z0-9\s@.+\-]/g, '');
  sanitized = sanitized.trim().substring(0, 100);
  sanitized = sanitized.replace(/%/g, '\\%').replace(/_/g, '\\_');
  return sanitized;
}
```

---

## Files Modified

1. **NEW:** `/src/common/utils/sql-utils.ts` - SQL security utility functions
2. **NEW:** `/src/common/utils/sql-utils.spec.ts` - Unit tests (25 passing)
3. **MODIFIED:** `/src/common/utils/index.ts` - Export new utilities
4. **MODIFIED:** `/src/modules/transaction/infrastructure/repositories/transaction.repository.ts`
5. **MODIFIED:** `/src/modules/monitoring/infrastructure/repositories/alert.repository.ts`
6. **MODIFIED:** `/src/modules/admin/application/services/audit.service.ts`
7. **MODIFIED:** `/src/modules/contacts/infrastructure/repositories/contact.repository.ts`
8. **MODIFIED:** `/src/modules/compliance/infrastructure/repositories/typeorm-watchlist.repository.ts`
9. **MODIFIED:** `/src/modules/user/infrastructure/repositories/user.repository.ts`

---

## New Security Utilities

A new utility module was created at `/src/common/utils/sql-utils.ts`:

### `escapeLikePattern(input: string): string`
Escapes SQL LIKE wildcards (%, _, \) to prevent pattern injection.

### `sanitizeSearchTerm(input: string, maxLength?: number): string`
Combines trimming, length limiting, and LIKE escaping.

### `validateSortColumn<T>(input, allowedColumns, defaultColumn): T[number]`
Validates ORDER BY column against an allowlist to prevent SQL injection.

### `validateSortOrder(input, defaultOrder?): 'ASC' | 'DESC'`
Validates sort direction to only allow ASC or DESC.

### `ALLOWED_SORT_COLUMNS`
Predefined allowlists for transaction, alert, user, and audit sort columns.

---

## Positive Findings

The following security best practices were observed:

1. **Parameterized Queries:** All `WHERE` clauses use TypeORM's parameterized query syntax (`:paramName`).

2. **IN Clause Safety:** All `IN` clauses use spread parameters (`:...paramName`) which is safe.

3. **No Raw SQL:** No direct `query()` calls with user input outside of migrations.

4. **DTO Validation:** Most DTOs use `class-validator` decorators for input validation.

5. **Pagination Limits:** Maximum pagination limits are enforced (e.g., `Math.min(query.limit || 50, 100)`).

6. **Type Safety:** TypeORM entity relationships prevent direct SQL manipulation.

---

## Security Checklist (Post-Remediation)

- [x] All WHERE clauses use parameterized queries
- [x] IN clauses use spread syntax (:...params)
- [x] No raw SQL with string concatenation
- [x] All ORDER BY columns are validated against allowlist
- [x] All LIKE patterns escape user input
- [x] DTOs validate input types
- [x] Pagination limits enforced
- [x] No direct query() with user input

---

## Test Coverage

The new `sql-utils.ts` module has 25 passing unit tests covering:
- `escapeLikePattern`: 8 tests including SQL injection prevention
- `sanitizeSearchTerm`: 4 tests
- `validateSortColumn`: 4 tests including injection attempts
- `validateSortOrder`: 5 tests including injection attempts
- `ALLOWED_SORT_COLUMNS`: 4 tests

Run tests: `npm test -- src/common/utils/sql-utils.spec.ts`

---

## References

- OWASP SQL Injection Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- OWASP A03:2021 Injection: https://owasp.org/Top10/A03_2021-Injection/
- TypeORM Security: https://typeorm.io/security

---

## Conclusion

All identified SQL injection vulnerabilities have been remediated. The fixes follow the defense-in-depth principle by adding validation at the repository layer, complementing existing DTO validation. The new `sql-utils.ts` module provides reusable, tested utilities for future development.
