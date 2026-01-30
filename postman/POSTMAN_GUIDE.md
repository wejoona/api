# JoonaPay API - Postman Collection Guide

Complete guide for using the JoonaPay API Postman collection for testing and development.

## Table of Contents

- [Quick Start](#quick-start)
- [Import Collection](#import-collection)
- [Environment Setup](#environment-setup)
- [Authentication Flow](#authentication-flow)
- [Common Workflows](#common-workflows)
- [Running Tests](#running-tests)
- [Newman CLI](#newman-cli)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- **Postman Desktop** (v10+) or **Postman Web**
- **Node.js** (v18+) for Newman CLI
- Access to JoonaPay API (local, staging, or production)

### 5-Minute Setup

1. **Import the collection**:
   - Open Postman
   - Click **Import** > **Upload Files**
   - Select `JoonaPay_API.postman_collection.json`

2. **Import an environment**:
   - Click **Import** > **Upload Files**
   - Select `JoonaPay_Local.postman_environment.json` (or Staging/Production)
   - Click the environment dropdown (top-right) and select "JoonaPay - Local Development"

3. **Test the API**:
   - Open **Health** > **Basic Health Check**
   - Click **Send**
   - Should return `200 OK` with status

4. **Register a test user**:
   - Open **Authentication** > **Register User**
   - Click **Send** (uses pre-configured test phone)
   - Check response for OTP (in local dev, OTP is `123456`)

5. **Verify OTP and login**:
   - Open **Authentication** > **Verify OTP**
   - Click **Send**
   - Tokens are automatically saved to environment variables

---

## Import Collection

### Option 1: Import Files (Recommended)

```bash
# From project root
cd usdc-wallet/postman

# Import in Postman:
# 1. Click "Import"
# 2. Drag and drop files:
#    - JoonaPay_API.postman_collection.json
#    - JoonaPay_Local.postman_environment.json
#    - JoonaPay_Staging.postman_environment.json
#    - JoonaPay_Production.postman_environment.json
```

### Option 2: Import via Git URL

```bash
# Fork the repository, then import via URL:
https://raw.githubusercontent.com/your-org/USDC-Wallet/main/usdc-wallet/postman/JoonaPay_API.postman_collection.json
```

### Option 3: Import via Workspace

If your team has a Postman workspace, publish the collection there for easy sharing.

---

## Environment Setup

### Available Environments

| Environment | Base URL | Use Case |
|-------------|----------|----------|
| **Local** | `http://localhost:3000` | Development on your machine |
| **Staging** | `https://api-staging.joonapay.com` | Integration testing |
| **Production** | `https://api.joonapay.com` | Production testing (use with caution) |

### Environment Variables

The collection uses the following variables:

#### Authentication
- `accessToken` - JWT access token (auto-saved)
- `refreshToken` - JWT refresh token (auto-saved)
- `tokenExpiry` - Token expiration timestamp (auto-managed)
- `pinToken` - PIN verification token (auto-saved)

#### User Data
- `userId` - Current user ID (auto-saved)
- `testPhone` - Phone number for testing
- `testOtp` - OTP code for local dev
- `testPin` - PIN for transactions

#### Resource IDs (auto-saved during tests)
- `transactionId`
- `transferId`
- `beneficiaryId`
- `sessionId`
- `deviceId`
- `merchantId`
- `paymentId`

### Manual Variable Setup

1. Select environment (top-right dropdown)
2. Click the eye icon next to environment name
3. Edit values as needed
4. Click **Save**

---

## Authentication Flow

### 1. Register New User

```http
POST /auth/register
{
  "phone": "+2250701234567",
  "countryCode": "CI"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 300
}
```

**Local Dev**: OTP is always `123456`
**Staging/Production**: Check your SMS/Twilio logs

### 2. Verify OTP

```http
POST /auth/verify-otp
{
  "phone": "+2250701234567",
  "otp": "123456"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "phone": "+2250701234567"
  },
  "kycStatus": "not_started"
}
```

**Auto-saved variables**:
- ✅ `accessToken`
- ✅ `refreshToken`
- ✅ `userId`
- ✅ `tokenExpiry`

### 3. All Requests Now Authenticated

The collection automatically includes the `Authorization: Bearer {{accessToken}}` header for all protected endpoints.

### 4. Token Auto-Refresh

The collection has a **pre-request script** that automatically refreshes expired tokens:

```javascript
// Runs before each request
if (tokenExpiry < now) {
  // Auto-refresh using refreshToken
  // Updates accessToken automatically
}
```

### 5. Login (Existing User)

```http
POST /auth/login
{
  "phone": "+2250701234567"
}
```

Then verify OTP as in step 2.

---

## Common Workflows

### Workflow 1: Complete User Onboarding

1. **Register** → `POST /auth/register`
2. **Verify OTP** → `POST /auth/verify-otp`
3. **Update Profile** → `PUT /user/profile`
4. **Create Wallet** → `POST /wallet/create`
5. **Set PIN** → `POST /wallet/pin/set`

### Workflow 2: Deposit Money (Mobile Money → USDC)

1. **Get Exchange Rate** → `GET /wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000`
2. **Get Deposit Channels** → `GET /wallet/deposit/channels?currency=XOF`
3. **Initiate Deposit** → `POST /wallet/deposit`
   - Response includes payment instructions (Orange Money number, reference code)
4. **Check Transaction Status** → `GET /wallet/transactions/deposit/:id/status`

### Workflow 3: Send Money to Another User (P2P)

1. **Verify PIN** → `POST /wallet/pin/verify`
   - Saves `pinToken` to environment
2. **Create Transfer** → `POST /transfers/internal`
   - Headers: `X-Pin-Token: {{pinToken}}`
   - Headers: `X-Idempotency-Key: {{$guid}}` (auto-generates unique ID)
3. **Check Transfer Status** → `GET /transfers/:id`

### Workflow 4: Pay a Merchant via QR

1. **Decode QR Code** → `POST /merchants/decode-qr`
   - Body: `{ "qrData": "joonapay://pay?v=1&..." }`
2. **Verify PIN** → `POST /wallet/pin/verify`
3. **Pay Merchant** → `POST /merchants/pay`
   - Headers: `X-Pin-Token: {{pinToken}}`
   - Headers: `X-Idempotency-Key: {{$guid}}`

### Workflow 5: Pay Electricity Bill

1. **Get Providers** → `GET /bill-payments/providers?country=CI&category=electricity`
2. **Validate Account** → `POST /bill-payments/validate`
   - Body: `{ "providerId": "cie_ci", "accountNumber": "1234567890" }`
3. **Verify PIN** → `POST /wallet/pin/verify`
4. **Pay Bill** → `POST /bill-payments/pay`
5. **Get Receipt** → `GET /bill-payments/:id/receipt`

### Workflow 6: Withdraw USDC to External Wallet

1. **Verify PIN** → `POST /wallet/pin/verify`
2. **Withdraw** → `POST /wallet/withdraw`
   - Body: `{ "destinationAddress": "0x742d35...", "amount": 50, "network": "polygon" }`
3. **Check Transaction** → `GET /wallet/transactions/:id`

---

## Running Tests

### Individual Request Tests

Each request has **test scripts** that automatically run after the response:

```javascript
// Example: Verify OTP test
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Response has tokens', function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.accessToken).to.exist;
    pm.expect(jsonData.refreshToken).to.exist;
});
```

**Run tests**:
1. Send any request
2. Check **Test Results** tab (bottom of Postman)
3. Green ✅ = Pass, Red ❌ = Fail

### Collection Runner (Sequential Tests)

Test the entire API flow automatically:

1. Click **Collections** > **JoonaPay USDC Wallet API**
2. Click **Run** button
3. Select environment (e.g., Local)
4. Configure run:
   - ✅ Save responses
   - ✅ Persist variables
   - ✅ Run order: Sequential
5. Click **Run JoonaPay USDC Wallet API**

**Expected results**:
- All health checks pass
- Authentication flow works
- Tokens are saved
- Wallet operations succeed (if PIN is set)

### Folder-Level Testing

Test specific modules:

1. Right-click folder (e.g., "Authentication")
2. Select **Run folder**
3. Review results

---

## Newman CLI

### Installation

```bash
npm install -g newman
```

### Run Collection from CLI

#### Local Environment

```bash
cd usdc-wallet/postman

# Run full collection
newman run JoonaPay_API.postman_collection.json \
  -e JoonaPay_Local.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json

# Run specific folder
newman run JoonaPay_API.postman_collection.json \
  -e JoonaPay_Local.postman_environment.json \
  --folder "Authentication"

# Run with delay between requests (rate limiting)
newman run JoonaPay_API.postman_collection.json \
  -e JoonaPay_Local.postman_environment.json \
  --delay-request 500
```

#### Staging Environment

```bash
newman run JoonaPay_API.postman_collection.json \
  -e JoonaPay_Staging.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export report.html
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Newman
        run: npm install -g newman

      - name: Run API Tests
        run: |
          cd usdc-wallet/postman
          newman run JoonaPay_API.postman_collection.json \
            -e JoonaPay_Staging.postman_environment.json \
            --reporters cli,json \
            --bail
```

#### GitLab CI

```yaml
api-tests:
  stage: test
  image: postman/newman:alpine
  script:
    - newman run usdc-wallet/postman/JoonaPay_API.postman_collection.json \
        -e usdc-wallet/postman/JoonaPay_Staging.postman_environment.json \
        --reporters cli,junit \
        --reporter-junit-export results.xml
  artifacts:
    reports:
      junit: results.xml
```

### Newman Reporters

```bash
# HTML report (detailed)
npm install -g newman-reporter-htmlextra
newman run collection.json -e environment.json \
  --reporters htmlextra \
  --reporter-htmlextra-export report.html

# JSON report
newman run collection.json -e environment.json \
  --reporters json \
  --reporter-json-export results.json

# JUnit XML (for CI)
newman run collection.json -e environment.json \
  --reporters junit \
  --reporter-junit-export results.xml
```

---

## Troubleshooting

### Problem: "401 Unauthorized"

**Cause**: Token expired or missing

**Solutions**:
1. Check `accessToken` in environment (should not be empty)
2. Manually refresh token:
   - Run **Authentication** > **Refresh Token**
3. Re-login:
   - Run **Authentication** > **Login** → **Verify OTP**

### Problem: "PIN verification required"

**Cause**: Missing or expired `pinToken`

**Solutions**:
1. Run **Wallet** > **Verify PIN** first
2. Check `pinToken` is saved in environment
3. Ensure `X-Pin-Token` header is present in request

### Problem: "Rate limit exceeded"

**Cause**: Too many requests in short time

**Solutions**:
1. Wait 60 seconds
2. Use Newman with `--delay-request 1000` (1 second between requests)
3. Check rate limits in response headers:
   ```
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1738157100
   ```

### Problem: "Duplicate payment detected"

**Cause**: Reusing same `X-Idempotency-Key`

**Solutions**:
1. Use `{{$guid}}` in header (auto-generates unique UUID)
2. Manually change idempotency key
3. Check if previous request succeeded (might be duplicate)

### Problem: "Cannot connect to localhost:3000"

**Cause**: Backend not running

**Solutions**:
1. Start backend:
   ```bash
   cd usdc-wallet
   npm run start:dev
   ```
2. Check backend logs for errors
3. Verify port 3000 is not in use:
   ```bash
   lsof -i :3000
   ```

### Problem: "Invalid OTP"

**Cause**: Wrong OTP code

**Solutions**:
- **Local**: Use `123456` (hardcoded in dev)
- **Staging/Prod**: Check SMS or Twilio logs
- **Expired**: OTP valid for 5 minutes, request new one

### Problem: Collection variables not saving

**Cause**: Environment not selected

**Solutions**:
1. Select environment from dropdown (top-right)
2. Ensure environment is not in "read-only" mode
3. Check test scripts are running (Tests tab should show results)

---

## West African Test Data

### Phone Numbers (Côte d'Ivoire)

```
+2250701234567  (Orange CI)
+2250707654321  (MTN CI)
+2250705555555  (Moov CI)
```

### Phone Numbers (Senegal)

```
+221701234567   (Orange SN)
+221771234567   (Free SN)
+221781234567   (Expresso SN)
```

### Test Amounts (XOF)

```
Small:    1,000 XOF  (~$1.66 USD)
Medium:   10,000 XOF (~$16.60 USD)
Large:    100,000 XOF (~$166 USD)
```

### Test Names

```
Ibrahim Kouame
Aminata Traore
Mamadou Diallo
Fatoumata Kone
Youssouf Ouattara
Aissata Sylla
```

### Test Addresses (Abidjan)

```
Boulevard Clozel, Plateau, Abidjan
Rue du Commerce, Marcory, Abidjan
Avenue Lamblin, Cocody, Abidjan
```

---

## API Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 5 requests | 1 minute |
| Transfers | 10 requests | 1 minute |
| Bill Payments | 10 requests | 1 minute |
| Merchant Payments | 10 requests | 1 minute |
| General API | 100 requests | 1 minute |

**Rate limit headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1738157100
```

---

## Best Practices

### 1. Use Idempotency Keys

Always include `X-Idempotency-Key` for financial operations:

```http
X-Idempotency-Key: {{$guid}}
```

This prevents duplicate payments if network fails.

### 2. Verify PIN Before Transfers

Don't skip PIN verification:

```javascript
// ❌ Bad: Skip PIN verification
POST /transfers/internal

// ✅ Good: Verify PIN first
POST /wallet/pin/verify  // Get pinToken
POST /transfers/internal  // Include X-Pin-Token header
```

### 3. Check Health Before Tests

Always verify API is healthy:

```bash
newman run collection.json --folder "Health"
# If passes, run full suite
newman run collection.json
```

### 4. Use Environment Variables

Never hardcode values:

```javascript
// ❌ Bad
"phone": "+2250701234567"

// ✅ Good
"phone": "{{testPhone}}"
```

### 5. Handle Token Expiry

Let the collection auto-refresh, or manually refresh:

```javascript
// Pre-request script handles this automatically
// But you can manually trigger:
POST /auth/refresh
```

---

## Support

### Documentation
- **API Docs**: `/docs` endpoint (Swagger)
- **GitHub**: https://github.com/your-org/USDC-Wallet
- **Postman Workspace**: [Share link]

### Contact
- **Slack**: #joonapay-api
- **Email**: dev@joonapay.com

---

## Changelog

### v1.0.0 (2026-01-29)
- Initial release
- Complete API coverage
- Auto-refresh tokens
- West African test data
- Newman CLI support
- CI/CD examples
