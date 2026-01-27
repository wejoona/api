# JoonaPay USDC Wallet - TODO

> Remove items when completed. Keep focused on actionable work.

---

## Backend API (`/usdc-wallet`)

### Critical
- [ ] Configure production provider credentials in `.env`:
  - `CIRCLE_API_KEY`, `CIRCLE_USE_MOCK=false`
  - `YELLOW_CARD_API_KEY`, `YELLOW_CARD_USE_MOCK=false`
- [ ] Configure SMS provider (Twilio) for OTP delivery
- [ ] Disable `useDevOtp` in production config
- [ ] Phone number verification via OTP before sensitive actions
- [ ] Set up production PostgreSQL with SSL
- [ ] Configure Redis for production (session, cache, rate limiting)

### High
- [ ] Database schema separation:
  - `api` schema - users, wallets, transactions
  - `backoffice` schema - admins, audit_logs, compliance
  - `providers` schema - blnk, circle, yellowcard data
- [ ] Enable TypeScript strict mode (162 errors to fix)
- [ ] Webhook reliability:
  - Dead-letter queue for failed webhooks
  - Retry mechanism with exponential backoff
  - Webhook signature verification
- [ ] Rate limiting per user/endpoint
- [ ] API versioning strategy (v1, v2)

### Medium
- [ ] Increase test coverage to 70%:
  - Webhook handler tests
  - Rate limiting tests
  - Transfer flow integration tests
  - KYC flow tests
- [ ] Refactor `yellow-card.service.ts` (647 lines)
- [ ] Add request/response logging (sanitized)
- [ ] Health check endpoints for all external services
- [ ] Graceful shutdown handling

### Low
- [ ] Clean up unused imports
- [ ] Add OpenAPI/Swagger documentation
- [ ] Performance profiling and optimization

---

## Mobile App (`/mobile`)

### Critical
- [ ] Replace certificate pinning placeholders:
  ```bash
  openssl s_client -servername api.joonapay.com -connect api.joonapay.com:443 </dev/null 2>/dev/null | \
    openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
    openssl dgst -sha256 -binary | openssl enc -base64
  ```
- [ ] Configure FCM production credentials
- [ ] Replace Firebase placeholder configs (google-services.json, GoogleService-Info.plist)
- [ ] App Store / Play Store assets (icons, screenshots, descriptions)

### High
- [ ] Navigation animations (contextual slide/fade transitions)
- [ ] Select/dropdown styling:
  - Clear selected state highlight
  - Match design system colors
  - Proper focus states
- [ ] Migrate remaining views to i18n (see LOCALIZATION_MIGRATION_CHECKLIST.md)
- [ ] Deep linking support (joonapay://send, joonapay://receive)
- [ ] Push notification handling:
  - Transaction alerts
  - Security alerts
  - Promotional (opt-in)
- [ ] Offline mode:
  - Cache recent transactions
  - Queue pending transfers
  - Sync on reconnect

### Medium
- [ ] Fix 9 biometric test mocks
- [ ] Feature flags for non-MVP features
- [ ] App analytics (Firebase Analytics or similar)
- [ ] Crash reporting (Crashlytics)
- [ ] Performance monitoring
- [ ] Accessibility audit (screen readers, contrast)
- [ ] Add loading skeletons for better UX

### Low
- [ ] Remove debug print statements
- [ ] Reduce APK/IPA size
- [ ] Add app review prompts (after successful transactions)

---

## Dashboard (`/dashboard`)

### Critical
- [ ] Production deployment setup
- [ ] Admin authentication hardening (2FA)
- [ ] Audit logging for all admin actions

### High
- [ ] Real-time transaction monitoring dashboard
- [ ] KYC document review workflow:
  - Document preview
  - Approve/reject with notes
  - Request re-upload
- [ ] User management:
  - Search/filter users
  - View user details
  - Freeze/unfreeze accounts
- [ ] Compliance alerts dashboard
- [ ] Provider status monitoring (Circle, Yellow Card, Blnk)

### Medium
- [ ] Export functionality (CSV, PDF reports)
- [ ] Bulk operations (approve KYC, send notifications)
- [ ] Role-based access control (admin, compliance, support)
- [ ] Dashboard analytics (daily/weekly/monthly stats)

### Low
- [ ] Dark mode support
- [ ] Customizable dashboard widgets

---

## DevOps & Infrastructure

### Critical
- [ ] Production environment setup (AWS/GCP)
- [ ] SSL certificates for all domains
- [ ] Database backups (automated daily)
- [ ] Secrets management (AWS Secrets Manager / Vault)

### High
- [ ] CI/CD pipeline:
  - Automated tests on PR
  - Staging deployment on merge
  - Production deployment (manual approval)
- [ ] Monitoring & alerting:
  - Uptime monitoring
  - Error rate alerts
  - Performance thresholds
- [ ] Log aggregation (CloudWatch / ELK)

### Medium
- [ ] Auto-scaling configuration
- [ ] Disaster recovery plan
- [ ] Load testing (k6 or similar)

---

## Security

### Critical
- [ ] Security audit before launch
- [ ] Penetration testing
- [ ] OWASP top 10 review

### High
- [ ] Rate limiting tuning
- [ ] Input validation audit
- [ ] SQL injection prevention check
- [ ] XSS prevention check

---

## Compliance

### Critical
- [ ] BCEAO compliance verification
- [ ] KYC/AML procedures documentation
- [ ] Transaction limits per tier
- [ ] Sanctions screening integration

### High
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Data retention policy

---

*Last updated: 2026-01-26*
