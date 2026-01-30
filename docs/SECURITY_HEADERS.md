# Security Headers Configuration

This document describes the security headers implemented in the USDC Wallet API.
Target: **A+ rating** on [securityheaders.com](https://securityheaders.com/).

## Overview

Security headers are HTTP response headers that help protect against common web vulnerabilities.
Our implementation follows [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) guidelines.

## Headers Implemented

### 1. Content-Security-Policy (CSP)

**Purpose:** Prevents Cross-Site Scripting (XSS), clickjacking, and code injection attacks.

**Production Configuration:**
```
Content-Security-Policy:
  default-src 'none';
  script-src 'none';
  style-src 'none';
  img-src 'none';
  font-src 'none';
  connect-src 'self';
  frame-src 'none';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  block-all-mixed-content
```

**Why:** As a pure JSON API, we don't need any scripts, styles, or other resources.
This maximally restrictive policy blocks all content types except API connections.

**Development Configuration:** Relaxed to allow Swagger UI functionality.

**OWASP Reference:** [CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

---

### 2. X-Frame-Options

**Value:** `DENY`

**Purpose:** Prevents clickjacking attacks by blocking the page from being embedded in iframes.

**Why:** Our API should never be iframed. Any attempt to do so is malicious.

**OWASP Reference:** [Clickjacking](https://owasp.org/www-community/attacks/Clickjacking)

---

### 3. X-Content-Type-Options

**Value:** `nosniff`

**Purpose:** Prevents MIME type sniffing attacks.

**Why:** Browsers might try to "guess" the content type of responses, which can lead to security vulnerabilities. This header forces browsers to respect the declared Content-Type.

**OWASP Reference:** [MIME Sniffing](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html#x-content-type-options)

---

### 4. Strict-Transport-Security (HSTS)

**Value:** `max-age=63072000; includeSubDomains; preload`

**Purpose:** Forces browsers to use HTTPS for all future connections.

**Configuration:**
- `max-age=63072000`: 2 years (required for HSTS preload list)
- `includeSubDomains`: Applies to all subdomains
- `preload`: Allows inclusion in browser HSTS preload lists

**Why:** Prevents SSL stripping attacks and ensures all communication is encrypted.

**OWASP Reference:** [HSTS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)

---

### 5. X-XSS-Protection

**Value:** `1; mode=block`

**Purpose:** Enables legacy browser XSS filters.

**Why:** While modern browsers use CSP, this header provides defense-in-depth for older browsers. It doesn't hurt and provides an extra layer of protection.

**Note:** This header is deprecated in favor of CSP but still recommended for compatibility.

---

### 6. Referrer-Policy

**Value:** `strict-origin-when-cross-origin`

**Purpose:** Controls what information is sent in the Referer header.

**Behavior:**
- Same-origin requests: Full URL
- Cross-origin requests: Only origin (scheme + host)
- HTTPS to HTTP: No referrer (protects against downgrade attacks)

**Why:** Balances privacy protection with functionality. Prevents leaking sensitive URL paths to external services.

**OWASP Reference:** [Referrer Policy](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html#referrer-policy)

---

### 7. Permissions-Policy

**Value:** Disables all browser features not needed by the API.

**Disabled Features:**
- Camera, microphone, geolocation
- Payment, USB, Bluetooth, gamepad
- Accelerometer, gyroscope, magnetometer
- Screen sharing, picture-in-picture
- And many more...

**Why:** Reduces attack surface by preventing access to sensitive browser APIs. Our API doesn't need any of these features.

**MDN Reference:** [Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)

---

### 8. Cross-Origin Headers

#### Cross-Origin-Opener-Policy (COOP)
**Value:** `same-origin`

**Purpose:** Protects against Spectre-like side-channel attacks by isolating browsing context.

#### Cross-Origin-Embedder-Policy (COEP)
**Value:** `require-corp` (production only)

**Purpose:** Required for SharedArrayBuffer and cross-origin isolation.

#### Cross-Origin-Resource-Policy (CORP)
**Value:** `same-origin`

**Purpose:** Controls which origins can load this resource.

---

### 9. Cache-Control (API Responses)

**Value:** `no-store, no-cache, must-revalidate, proxy-revalidate`

**Additional Headers:**
- `Pragma: no-cache`
- `Expires: 0`
- `Surrogate-Control: no-store`

**Purpose:** Prevents caching of sensitive API responses.

**Why:** API responses may contain personal or financial data that should not be cached.

---

### 10. Additional Security Headers

#### X-DNS-Prefetch-Control
**Value:** `off`

**Purpose:** Prevents DNS prefetching to protect user privacy.

#### X-Download-Options
**Value:** `noopen`

**Purpose:** IE-specific header to prevent automatic execution of downloads.

#### X-Permitted-Cross-Domain-Policies
**Value:** `none`

**Purpose:** Prevents Adobe Flash/Acrobat from loading content.

#### X-Robots-Tag
**Value:** `noindex, nofollow, noarchive, nosnippet`

**Purpose:** Prevents search engines from indexing API responses.

---

## CORS Configuration

**Purpose:** Controls which origins can make requests to the API.

**Production Configuration:**
```typescript
{
  origin: ['https://app.joonapay.com', 'https://dashboard.joonapay.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Idempotency-Key',
    'X-Request-ID',
    'Accept',
    'Accept-Language',
    'Origin',
  ],
  exposedHeaders: ['X-Idempotency-Key', 'X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
  optionsSuccessStatus: 204,
}
```

**Security Considerations:**
- Never use wildcard (`*`) with `credentials: true`
- Whitelist specific origins only
- Limit allowed headers and methods
- Cache preflight requests (24 hours)

**OWASP Reference:** [CORS](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

## Cookie Security

**Production Configuration:**
```typescript
{
  secure: true,       // HTTPS only
  httpOnly: true,     // No JavaScript access
  sameSite: 'strict', // CSRF protection
  path: '/',
  maxAge: 86400000,   // 24 hours
}
```

**Cookie Name Prefixes:**
- `__Host-session`: Session cookie (strictest security)
- `__Host-refresh`: Refresh token
- `__Secure-csrf`: CSRF token

**Security Considerations:**
- `__Host-` prefix requires: Secure=true, no Domain, Path=/
- `__Secure-` prefix requires: Secure=true
- Always use HttpOnly for sensitive cookies
- SameSite=Strict prevents CSRF attacks

**OWASP Reference:** [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

## Environment-Specific Configuration

| Header | Development | Staging | Production |
|--------|-------------|---------|------------|
| CSP | Relaxed (Swagger) | Relaxed | Strict |
| HSTS | Disabled | Enabled | Enabled + Preload |
| COEP | Disabled | Disabled | Enabled |
| Cookie Secure | false | true | true |
| Cookie Prefix | None | `__Secure-` | `__Host-` |

---

## Configuration Options

### Environment Variables

```bash
# Allowed CORS origins (comma-separated)
ALLOWED_ORIGINS=https://app.joonapay.com,https://dashboard.joonapay.com

# Cookie domain (optional, for cross-subdomain cookies)
COOKIE_DOMAIN=.joonapay.com

# Enable HSTS preload (set to true when ready for preload list submission)
HSTS_PRELOAD=true
```

### Configuration File

Security headers are configured in:
- `/src/config/security-headers.config.ts` - Header configurations
- `/src/main.ts` - Helmet and CORS setup
- `/src/common/middleware/security-headers.middleware.ts` - Route-specific headers

---

## Testing Security Headers

### Using securityheaders.com

1. Deploy to staging environment
2. Visit [securityheaders.com](https://securityheaders.com/)
3. Enter your staging URL
4. Verify A+ rating

### Using curl

```bash
# Check all security headers
curl -I https://api.joonapay.com/api/v1/health

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# Content-Security-Policy: default-src 'none'; ...
# Referrer-Policy: strict-origin-when-cross-origin
# Permissions-Policy: accelerometer=(), camera=(), ...
```

### Integration Tests

Run security header tests:
```bash
npm run test:e2e -- --grep "security headers"
```

---

## Checklist for A+ Rating

- [x] Content-Security-Policy with strict directives
- [x] X-Frame-Options: DENY
- [x] X-Content-Type-Options: nosniff
- [x] Strict-Transport-Security with preload
- [x] Referrer-Policy defined
- [x] Permissions-Policy restricts features
- [x] No deprecated headers with insecure values
- [x] CORS properly configured
- [x] Cookies secured with all flags

---

## Troubleshooting

### CSP Violations in Development

If Swagger UI breaks due to CSP:
1. Check you're in development mode (`NODE_ENV=development`)
2. Development CSP allows inline scripts for Swagger

### CORS Errors

If seeing CORS errors:
1. Check `ALLOWED_ORIGINS` environment variable
2. Ensure origin is in whitelist
3. Check if credentials are being sent (requires explicit origin)

### Cookie Not Being Set

If cookies aren't being set:
1. Check Secure flag (requires HTTPS in production)
2. Check SameSite setting (Strict may block cross-site)
3. Check Domain attribute (must match current domain)

---

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [MDN HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Security Headers Scanner](https://securityheaders.com/)
- [HSTS Preload List](https://hstspreload.org/)
