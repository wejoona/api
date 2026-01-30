# JoonaPay API - Quick Reference Card

One-page reference for the most common API operations.

---

## 🔐 Authentication

### Register New User
```http
POST /auth/register
{
  "phone": "+2250701234567",
  "countryCode": "CI"
}
→ OTP sent to phone (local: use "123456")
```

### Verify OTP & Login
```http
POST /auth/verify-otp
{
  "phone": "+2250701234567",
  "otp": "123456"
}
→ Returns accessToken, refreshToken (auto-saved)
```

### Refresh Token
```http
POST /auth/refresh
{
  "refreshToken": "{{refreshToken}}"
}
→ New tokens (auto-saved)
```

---

## 👤 User Profile

### Get Profile
```http
GET /user/profile
→ Current user info
```

### Update Profile
```http
PUT /user/profile
{
  "username": "kouame_ibrahim",
  "firstName": "Ibrahim",
  "lastName": "Kouame",
  "email": "ibrahim@example.ci"
}
```

### Check Username
```http
GET /user/username/check/kouame_ibrahim
→ { available: true/false }
```

---

## 💰 Wallet

### Get Balance
```http
GET /wallet
→ { walletId, balances: [{ currency: "USD", available: 100 }] }
```

### Create Wallet
```http
POST /wallet/create
→ Creates Circle wallet
```

### Set PIN (First Time)
```http
POST /wallet/pin/set
{
  "pin": "1234",
  "confirmPin": "1234"
}
```

### Verify PIN (Before Transfers)
```http
POST /wallet/pin/verify
{
  "pin": "1234"
}
→ Returns pinToken (valid 5 min, auto-saved)
```

---

## 💸 Deposits (Mobile Money → USDC)

### Get Exchange Rate
```http
GET /wallet/rate?sourceCurrency=XOF&targetCurrency=USD&amount=10000
→ { rate: 0.00166, targetAmount: 16.6, fee: 150 }
```

### Get Deposit Channels
```http
GET /wallet/deposit/channels?currency=XOF
→ Orange Money, MTN, Wave
```

### Initiate Deposit
```http
POST /wallet/deposit
Headers: X-Idempotency-Key: {{$guid}}
{
  "amount": 10000,
  "sourceCurrency": "XOF",
  "channelId": "orange_money_ci"
}
→ Payment instructions (send 10,000 XOF to +2250700000000, ref: DEP-ABC123)
```

### Check Deposit Status
```http
GET /wallet/transactions/deposit/:id/status
→ { status: "pending" | "completed" | "failed" }
```

---

## 💵 Transfers

### Send to JoonaPay User (P2P)
```http
POST /transfers/internal
Headers:
  X-Pin-Token: {{pinToken}}
  X-Idempotency-Key: {{$guid}}
{
  "recipientPhone": "+2250707654321",
  "amount": 5000,  // cents (50.00 USD)
  "currency": "USDC",
  "note": "Déjeuner"
}
```

### Send to External Wallet
```http
POST /transfers/external
Headers:
  X-Pin-Token: {{pinToken}}
  X-Idempotency-Key: {{$guid}}
{
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  "amount": 5000,  // cents
  "currency": "USDC",
  "network": "polygon"
}
```

### Get Transfer History
```http
GET /transfers?limit=20&offset=0
```

### Get Transfer Details
```http
GET /transfers/:id
```

---

## 📱 Transactions

### Get Transaction History
```http
GET /wallet/transactions?limit=20&offset=0&type=deposit&status=completed
Types: deposit, withdrawal, transfer_in, transfer_out
Status: pending, completed, failed
```

### Get Transaction Details
```http
GET /wallet/transactions/:id
```

---

## 📇 Beneficiaries (Saved Recipients)

### Get Beneficiaries
```http
GET /beneficiaries
GET /beneficiaries?favorites=true
GET /beneficiaries?recent=true&limit=5
```

### Add Beneficiary
```http
POST /beneficiaries
{
  "name": "Aminata Traore",
  "phoneE164": "+2250707654321",
  "accountType": "joonapay"
}
```

### Toggle Favorite
```http
POST /beneficiaries/:id/favorite
```

### Delete Beneficiary
```http
DELETE /beneficiaries/:id
```

---

## 🏪 Merchant Payments

### Decode QR Code
```http
POST /merchants/decode-qr
{
  "qrData": "joonapay://pay?v=1&t=static&m=..."
}
→ Merchant info, amount (if dynamic QR)
```

### Pay Merchant
```http
POST /merchants/pay
Headers:
  X-Pin-Token: {{pinToken}}
  X-Idempotency-Key: {{$guid}}
{
  "qrData": "joonapay://pay?v=1&t=static&m=...",
  "amount": 2500  // If static QR, provide amount
}
```

### Register as Merchant
```http
POST /merchants/register
{
  "businessName": "Café Abidjan",
  "displayName": "Café Abidjan - Plateau",
  "category": "restaurant",
  "address": "Boulevard Clozel, Plateau",
  "phone": "+2250701234567"
}
```

### Get My Merchant Profile
```http
GET /merchants/me
→ QR code, analytics
```

### Get Merchant Transactions
```http
GET /merchants/:id/transactions?limit=50&offset=0
```

---

## 💡 Bill Payments

### Get Providers
```http
GET /bill-payments/providers?country=CI&category=electricity
Categories: electricity, water, internet, tv, phone_credit, insurance
```

### Validate Account
```http
POST /bill-payments/validate
{
  "providerId": "cie_ci",
  "accountNumber": "1234567890",
  "meterNumber": "987654321"
}
→ Customer name, balance due
```

### Pay Bill
```http
POST /bill-payments/pay
Headers:
  X-Pin-Token: {{pinToken}}
  X-Idempotency-Key: {{$guid}}
{
  "providerId": "cie_ci",
  "accountNumber": "1234567890",
  "meterNumber": "987654321",
  "customerName": "Ibrahim Kouame",
  "amount": 15000,
  "currency": "XOF",
  "phone": "+2250701234567"
}
→ Receipt with token number
```

### Get Payment History
```http
GET /bill-payments/history?page=1&limit=20&category=electricity
```

### Get Receipt
```http
GET /bill-payments/:id/receipt
→ Receipt with QR code
```

---

## 🔒 Sessions & Devices

### Get Active Sessions
```http
GET /sessions
```

### Revoke Session
```http
DELETE /sessions/:id
{
  "reason": "Lost device"
}
```

### Register Device
```http
POST /devices/register
{
  "deviceIdentifier": "uuid-here",
  "displayName": "Samsung Galaxy A54",
  "brand": "Samsung",
  "model": "Galaxy A54",
  "os": "Android",
  "osVersion": "14",
  "platform": "android",
  "fcmToken": "fcm-token-here"
}
```

### Trust Device (Skip OTP)
```http
POST /devices/:id/trust
```

### Revoke All Devices
```http
DELETE /devices
```

---

## 🚩 Feature Flags

### Check Feature
```http
GET /feature-flags/check/merchant_payments?appVersion=1.0.0&platform=android
→ { key: "merchant_payments", enabled: true }
```

### Get All My Features
```http
GET /feature-flags/me?appVersion=1.0.0&platform=android
→ { merchant_payments: true, bill_payments: true, ... }
```

---

## 🏥 Health Checks

### Basic Health
```http
GET /health
→ { status: "ok" }
```

### Readiness (All Dependencies)
```http
GET /health/ready
→ Database, Redis, Circle, Blnk, Yellow Card
```

### Provider Health (Dashboard)
```http
GET /health/providers
→ Health score, latency, status per provider
```

---

## 📊 Response Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | ✅ Continue |
| 201 | Created | ✅ Resource created |
| 400 | Bad Request | ❌ Check input |
| 401 | Unauthorized | 🔐 Re-authenticate |
| 403 | Forbidden | 🔒 Check PIN token |
| 404 | Not Found | 🔍 Check ID |
| 409 | Conflict | ⚠️ Duplicate (idempotency) |
| 429 | Rate Limit | ⏱️ Wait 60s |
| 500 | Server Error | 🐛 Report to dev |

---

## 🔑 Required Headers

### All Protected Endpoints
```http
Authorization: Bearer {{accessToken}}
```

### Transfers & Payments (Money Operations)
```http
Authorization: Bearer {{accessToken}}
X-Pin-Token: {{pinToken}}
X-Idempotency-Key: {{$guid}}
```

### File Uploads
```http
Authorization: Bearer {{accessToken}}
Content-Type: multipart/form-data
```

---

## ⚡ Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (register, login, verify OTP) | 5 | 1 min |
| Transfers | 10 | 1 min |
| Bill Payments | 10 | 1 min |
| Merchant Payments | 10 | 1 min |
| General API | 100 | 1 min |

---

## 🌍 Test Data

### Phones
```
CI: +2250701234567 (Orange)
SN: +221701234567 (Orange)
```

### Amounts
```
1,000 XOF = ~$1.66 USD
10,000 XOF = ~$16.60 USD
100,000 XOF = ~$166 USD
```

### Local Dev Defaults
```
OTP: 123456
PIN: 1234
```

---

## 🛠️ Postman Variables

Auto-saved by collection:
- `accessToken` (15 min)
- `refreshToken` (7 days)
- `pinToken` (5 min)
- `userId`
- `tokenExpiry`

Use in requests:
```
{{accessToken}}
{{pinToken}}
{{$guid}}  ← Auto-generate UUID
{{$timestamp}}  ← Current Unix timestamp
```

---

## 🔄 Common Flows

### Onboarding
```
Register → Verify OTP → Update Profile → Create Wallet → Set PIN
```

### Deposit
```
Get Rate → Get Channels → Initiate Deposit → Check Status
```

### Send Money
```
Verify PIN → Transfer → Check Status
```

### Merchant Payment
```
Decode QR → Verify PIN → Pay → Receipt
```

### Bill Payment
```
Get Providers → Validate → Verify PIN → Pay → Receipt
```

---

**Tip**: Use Collection Runner to test full flows automatically!

**Newman CLI**: `newman run collection.json -e environment.json --folder "Folder Name"`
