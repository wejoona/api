# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing: security@joonapay.com

Please include the following information:
- Type of vulnerability (e.g., XSS, SQL Injection, IDOR)
- Full path of the affected source file(s)
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

We will acknowledge receipt within 48 hours and aim to provide a detailed response within 7 days.

## Security Measures

### Application Security

#### Backend API
- **Authentication**: JWT with short-lived access tokens (15min) and refresh tokens (7 days)
- **Password Hashing**: bcrypt with appropriate work factor
- **OTP Generation**: Cryptographically secure random number generation
- **Rate Limiting**: Global throttling on all endpoints
- **Input Validation**: Request validation using class-validator
- **SQL Injection Protection**: Parameterized queries via TypeORM
- **CORS**: Restricted origins in production
- **Security Headers**: Helmet.js for XSS, clickjacking, etc.
- **Request Size Limits**: Body size limited to prevent DoS

#### Mobile App
- **Certificate Pinning**: Production API connections verify server certificates
- **Root/Jailbreak Detection**: App blocks on compromised devices
- **Secure Storage**: Sensitive data stored in platform secure storage (Keychain/EncryptedSharedPreferences)
- **PIN Security**: Hashed with SHA-256 + salt, attempt limiting with lockout
- **Code Obfuscation**: Release builds use ProGuard (Android) and Flutter obfuscation
- **No Debug Logging**: Sensitive data never logged in release builds

#### Financial Security
- **Pessimistic Locking**: Race condition protection on balance updates
- **Balance Verification**: Server-side balance checks before all transfers
- **Amount Validation**: Strict validation of transfer amounts
- **Webhook Verification**: Circle webhooks verified via HMAC signatures
- **Transaction Integrity**: All financial operations use database transactions

### Infrastructure Security

#### Secrets Management
- No hardcoded secrets in source code
- Environment variables for all sensitive configuration
- `.gitignore` prevents accidental secret commits
- Separate secrets for production vs development

#### CI/CD Security
- Automated security scanning (Snyk, npm audit, CodeQL)
- Docker image vulnerability scanning (Trivy)
- Secret detection in commits (TruffleHog, GitLeaks)
- Dependency updates via Dependabot

### Compliance

We aim to follow:
- OWASP Top 10 Web Application Security Risks
- OWASP Mobile Top 10 Security Risks
- PCI-DSS guidelines for payment data handling

## Security Checklist for Contributors

Before submitting code:

- [ ] No secrets or credentials in code
- [ ] Input validation on all user inputs
- [ ] Output encoding to prevent XSS
- [ ] Parameterized queries for database operations
- [ ] Appropriate authentication checks
- [ ] Authorization checks for resource access
- [ ] Sensitive data not logged
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies scanned for vulnerabilities

## Bug Bounty

We do not currently operate a formal bug bounty program. However, we greatly appreciate security researchers who take the time to report vulnerabilities responsibly.
