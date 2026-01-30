# JoonaPay API - Postman Collection

Complete Postman collection for testing the JoonaPay USDC Wallet API - A mobile money to USDC platform for West Africa.

## 📦 Files

```
postman/
├── JoonaPay_API.postman_collection.json        # Main collection (200+ requests)
├── JoonaPay_Local.postman_environment.json     # Local dev environment
├── JoonaPay_Staging.postman_environment.json   # Staging environment
├── JoonaPay_Production.postman_environment.json # Production environment
├── POSTMAN_GUIDE.md                            # Comprehensive guide
└── README.md                                   # This file
```

## 🚀 Quick Start

### 1. Import Collection

**Option A: Drag & Drop** (Recommended)
1. Open Postman
2. Drag all `.json` files into Postman window
3. Done!

**Option B: Import Button**
1. Click **Import** in Postman
2. Select all `.json` files
3. Click **Import**

### 2. Select Environment

Click the environment dropdown (top-right) → Select **JoonaPay - Local Development**

### 3. Test the API

1. Open **Health** > **Basic Health Check**
2. Click **Send**
3. Should return `200 OK` ✅

### 4. Get Started

Run requests in this order:
1. **Authentication** > **Register User** (phone: `+2250701234567`)
2. **Authentication** > **Verify OTP** (OTP: `123456` in local)
3. **Wallet** > **Create Wallet**
4. **Wallet** > **Set PIN** (PIN: `1234`)
5. **Wallet** > **Get Balance**

**You're ready! 🎉**

---

## 📚 What's Included

### Collections

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Authentication** | 6 | Register, login, OTP, token management |
| **User** | 6 | Profile, username search, limits |
| **Wallet** | 10 | Balance, deposit, transfer, withdraw, PIN |
| **Transactions** | 3 | History, details, deposit status |
| **Transfers** | 4 | Internal (P2P), external (blockchain) |
| **Beneficiaries** | 6 | Save recipients, favorites |
| **Sessions** | 4 | Multi-device session management |
| **Devices** | 8 | Device registration, trust, FCM |
| **Merchants** | 9 | QR payments, analytics |
| **Bill Payments** | 7 | Electricity, water, internet, etc. |
| **Feature Flags** | 2 | Gradual rollout checks |
| **Health** | 5 | Health checks, monitoring |

**Total**: 70+ endpoints organized in 12 categories

### Features

✅ **Auto-save tokens** - Access/refresh tokens automatically saved
✅ **Auto-refresh** - Expired tokens refreshed before requests
✅ **Auto-tests** - Response validation on each request
✅ **Idempotency** - Uses `{{$guid}}` for duplicate prevention
✅ **West African data** - Realistic test data (XOF, CI/SN phones)
✅ **PIN flow** - Complete PIN verification workflow
✅ **Environment isolation** - Separate local/staging/production

---

## 🔑 Key Concepts

### Authentication Flow

```
Register → Verify OTP → Login
    ↓           ↓          ↓
   SMS      Get Tokens   Save to env
```

**Auto-saved**:
- `accessToken` (15 min expiry)
- `refreshToken` (7 day expiry)
- `userId`
- `tokenExpiry`

### PIN Verification

Required for all money operations:

```
1. POST /wallet/pin/verify  → Returns pinToken (5 min validity)
2. POST /transfers/internal  → Include X-Pin-Token header
```

### Idempotency

Prevent duplicate payments:

```http
X-Idempotency-Key: {{$guid}}
```

Use `{{$guid}}` (auto-generates UUID) for all transfers/payments.

---

## 🌍 Environments

### Local Development

```
Base URL: http://localhost:3000
Test Phone: +2250701234567
Test OTP: 123456 (hardcoded)
Test PIN: 1234
```

### Staging

```
Base URL: https://api-staging.joonapay.com
Test Phone: +2250707777777
OTP: Via SMS (check Twilio logs)
```

### Production

```
Base URL: https://api.joonapay.com
⚠️ Use with caution - real money!
```

---

## 📖 Documentation

### Full Guide

See **[POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md)** for:
- Complete setup instructions
- Authentication workflows
- Common use cases (deposit, transfer, bill pay)
- Running tests with Collection Runner
- Newman CLI usage
- CI/CD integration
- Troubleshooting

### API Documentation

- **Swagger**: `http://localhost:3000/docs` (when backend running)
- **Controllers**: `/usdc-wallet/src/modules/*/application/controllers/`

---

## 🧪 Running Tests

### In Postman GUI

**Single Request**:
1. Select request
2. Click **Send**
3. Check **Test Results** tab

**Full Collection**:
1. Click **Collections** > **JoonaPay USDC Wallet API**
2. Click **Run**
3. Select environment
4. Click **Run JoonaPay USDC Wallet API**

### Newman CLI

```bash
# Install
npm install -g newman

# Run all tests
newman run JoonaPay_API.postman_collection.json \
  -e JoonaPay_Local.postman_environment.json

# Run specific folder
newman run JoonaPay_API.postman_collection.json \
  -e JoonaPay_Local.postman_environment.json \
  --folder "Authentication"

# Generate HTML report
npm install -g newman-reporter-htmlextra
newman run JoonaPay_API.postman_collection.json \
  -e JoonaPay_Local.postman_environment.json \
  --reporters htmlextra \
  --reporter-htmlextra-export report.html
```

---

## 💡 Common Workflows

### 1️⃣ User Registration & Onboarding

```
POST /auth/register          → Send OTP
POST /auth/verify-otp        → Get tokens
PUT  /user/profile           → Set username
POST /wallet/create          → Create wallet
POST /wallet/pin/set         → Set PIN
```

### 2️⃣ Deposit (Mobile Money → USDC)

```
GET  /wallet/rate            → Get XOF/USD rate
GET  /wallet/deposit/channels → Orange Money, MTN, Wave
POST /wallet/deposit         → Get payment instructions
GET  /wallet/transactions/deposit/:id/status → Check status
```

### 3️⃣ Send Money (P2P Transfer)

```
POST /wallet/pin/verify      → Get pinToken
POST /transfers/internal     → Send to phone number
GET  /transfers/:id          → Check status
```

### 4️⃣ Pay Merchant via QR

```
POST /merchants/decode-qr    → Decode QR
POST /wallet/pin/verify      → Verify PIN
POST /merchants/pay          → Complete payment
```

### 5️⃣ Pay Electricity Bill

```
GET  /bill-payments/providers → Get CIE, SODECI, etc.
POST /bill-payments/validate  → Validate meter number
POST /wallet/pin/verify       → Verify PIN
POST /bill-payments/pay       → Pay bill
GET  /bill-payments/:id/receipt → Get receipt with token
```

---

## 🐛 Troubleshooting

### "401 Unauthorized"

**Fix**: Re-authenticate
```
1. POST /auth/login
2. POST /auth/verify-otp
```

### "PIN verification required"

**Fix**: Verify PIN first
```
1. POST /wallet/pin/verify
2. Check pinToken is saved
3. Retry request
```

### "Cannot connect to localhost:3000"

**Fix**: Start backend
```bash
cd usdc-wallet
npm run start:dev
```

### "Rate limit exceeded"

**Fix**: Wait or use Newman with delay
```bash
newman run collection.json --delay-request 1000
```

### Variables not saving

**Fix**: Select environment
1. Click environment dropdown (top-right)
2. Select "JoonaPay - Local Development"
3. Re-run request

---

## 📊 Test Data

### Phone Numbers

```
Côte d'Ivoire:
+2250701234567  (Orange)
+2250707654321  (MTN)
+2250705555555  (Moov)

Senegal:
+221701234567   (Orange)
+221771234567   (Free)
```

### Amounts (XOF)

```
1,000 XOF     ~$1.66 USD
10,000 XOF    ~$16.60 USD
100,000 XOF   ~$166 USD
```

### Names

```
Ibrahim Kouame
Aminata Traore
Mamadou Diallo
Fatoumata Kone
```

---

## 🔗 Resources

- **Backend Repo**: `/usdc-wallet`
- **Mobile App**: `/mobile`
- **Dashboard**: `/dashboard`
- **Swagger Docs**: `http://localhost:3000/docs`

---

## 📝 License

Internal use only - JoonaPay

---

## 🤝 Contributing

To update the collection:

1. Make changes in Postman
2. Export collection:
   - **Collections** > **...** > **Export**
   - Select **Collection v2.1**
   - Save to `postman/JoonaPay_API.postman_collection.json`
3. Export environment:
   - **Environments** > **...** > **Export**
   - Save to `postman/JoonaPay_Local.postman_environment.json`
4. Commit changes

---

**Questions?** Check [POSTMAN_GUIDE.md](./POSTMAN_GUIDE.md) or contact dev@joonapay.com
