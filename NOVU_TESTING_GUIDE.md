# Novu Push Notification Testing Guide

This guide shows you how to test the Novu integration step-by-step.

## Prerequisites

- Node.js 18+ installed
- Novu account (free at https://novu.co)
- Firebase project with FCM configured
- PostgreSQL database running
- Redis running

## Setup

### 1. Install Dependencies

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet
npm install
```

Packages installed:
- `@novu/node@2.6.6` - Novu SDK
- `nanoid` - ID generation

### 2. Get Novu Credentials

1. Sign up at https://novu.co
2. Create a new application
3. Go to **Settings** → **API Keys**
4. Copy:
   - API Key
   - Application Identifier (App ID)

### 3. Configure Environment

```bash
# Copy example env file
cp .env.novu.example .env.test

# Edit .env.test
nano .env.test
```

Add your credentials:
```bash
NOVU_API_KEY=your_api_key_here
NOVU_APP_ID=your_app_id_here
NOVU_ENABLED=true

# Also configure FCM (required for Novu)
FCM_PROJECT_ID=your_firebase_project_id
FCM_CLIENT_EMAIL=your_firebase_client_email
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 4. Configure FCM in Novu Dashboard

1. Go to Novu dashboard → **Integrations**
2. Click **Add Integration**
3. Select **Firebase Cloud Messaging (FCM)**
4. Upload your Firebase service account JSON file
5. Click **Save**

### 5. Create Test Templates

In Novu dashboard, create a workflow for testing:

**Workflow: `transaction-received`**

1. Go to **Workflows** → **Create Workflow**
2. Name: `Transaction Received`
3. Identifier: `transaction-received` (exact match!)
4. Add **Push** channel:
   - Title: `Money Received`
   - Body: `You received {{amount}} {{currency}} from {{senderName}}`
5. Click **Update** to save
6. **Publish** the workflow

## Testing

### Test 1: Check Novu Status

```bash
# Start the server
npm run start:dev

# In another terminal, check Novu status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/status
```

Expected response:
```json
{
  "success": true,
  "enabled": true,
  "message": "Novu is enabled and ready"
}
```

### Test 2: Register Test User

```bash
# Register a user in Novu
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/v1/notifications/novu/subscriber
```

Expected response:
```json
{
  "success": true,
  "message": "Subscriber registered in Novu"
}
```

Verify in Novu dashboard:
1. Go to **Subscribers**
2. You should see the user listed

### Test 3: Register Device Token

```bash
# Register FCM token
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_fcm_device_token_here",
    "platform": "android"
  }' \
  http://localhost:3000/api/v1/notifications/novu/device-token
```

Expected response:
```json
{
  "success": true,
  "message": "Device token registered"
}
```

### Test 4: Send Test Transaction Notification

```bash
# Send test notification
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/test/transaction
```

Expected response:
```json
{
  "success": true,
  "message": "Test transaction notification sent"
}
```

What to check:
1. **Mobile device** should receive push notification
2. **Novu dashboard** → **Activity Feed** should show the notification
3. **Backend logs** should show: `[NovuAdapter] Novu notification triggered: transaction-received`

### Test 5: Get Notification Feed

```bash
# Get user's notification feed
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/feed
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "notification_id",
      "content": "You received 100 USDC from Test Sender",
      "seen": false,
      "read": false,
      "createdAt": "2024-01-29T12:00:00.000Z"
    }
  ]
}
```

### Test 6: Get Unread Count

```bash
# Get unread notification count
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/unread-count
```

Expected response:
```json
{
  "success": true,
  "count": 1
}
```

### Test 7: Mark as Read

```bash
# Mark notification as read
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/NOTIFICATION_ID/read
```

Expected response:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Test 8: Send Different Notification Types

**Security Alert:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/test/security
```

**KYC Notification:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/test/kyc
```

**Welcome Message:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/test/welcome
```

### Test 9: Subscribe to Topic

```bash
# Subscribe to premium-users topic
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/topics/premium-users/subscribe
```

Expected response:
```json
{
  "success": true,
  "message": "Subscribed to topic: premium-users"
}
```

### Test 10: Integration Test (Full Flow)

```typescript
// Test using the service directly
import { Test } from '@nestjs/testing';
import { NovuNotificationService } from './novu-notification.service';

describe('Novu Integration Test', () => {
  let service: NovuNotificationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      // ... module setup
    }).compile();

    service = module.get(NovuNotificationService);
  });

  it('should send transaction notification', async () => {
    await service.sendTransactionNotification({
      userId: 'test-user-123',
      type: 'received',
      amount: 100,
      currency: 'USDC',
      transactionId: 'tx-123',
      senderName: 'John Doe',
    });

    // Verify in Novu dashboard
  });
});
```

## Mobile App Testing

### 1. Run Mobile App

```bash
cd /Users/macbook/JoonaPay/USDC-Wallet/mobile
flutter run
```

### 2. Login

- Login with test account
- App automatically registers FCM token with backend

### 3. Trigger Notification

From another terminal:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/test/transaction
```

### 4. Verify

1. **Notification appears** on mobile device
2. **Tap notification** → App navigates to transaction screen
3. **Check logs** in Flutter console

Expected logs:
```
FCM Token: xxxxxxxxxxxxx
FCM token registered with backend
Received foreground message: xxxxx
Title: Money Received
Body: You received 100 USDC from Test Sender
```

## Troubleshooting

### Problem: "Novu is disabled"

**Cause:** Environment variables not set or incorrect

**Solution:**
1. Check `.env` file has `NOVU_ENABLED=true`
2. Verify `NOVU_API_KEY` and `NOVU_APP_ID` are set
3. Restart server: `npm run start:dev`

### Problem: "Template not found"

**Cause:** Workflow not created or wrong ID

**Solution:**
1. Go to Novu dashboard → Workflows
2. Check workflow ID exactly matches (e.g., `transaction-received`)
3. Ensure workflow is **Published**
4. Check at least Push channel is enabled

### Problem: "FCM integration failed"

**Cause:** FCM not configured in Novu

**Solution:**
1. Go to Novu dashboard → Integrations
2. Click on FCM integration
3. Re-upload Firebase service account JSON
4. Test connection

### Problem: "User not found in Novu"

**Cause:** User not registered as subscriber

**Solution:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/subscriber
```

### Problem: "Device not receiving notifications"

**Checklist:**
- [ ] FCM token registered: `POST /device-token`
- [ ] User registered: `POST /subscriber`
- [ ] Template created and published in Novu
- [ ] FCM integration active in Novu dashboard
- [ ] Mobile app has notification permissions
- [ ] Device is online

**Debug:**
1. Check Novu Activity Feed for delivery status
2. Check backend logs for errors
3. Check FCM token is valid (not expired)
4. Try sending test notification from Novu dashboard

### Problem: "Notification sent but not delivered"

**Check Novu Activity Feed:**
1. Go to Novu dashboard → Activity Feed
2. Find the notification
3. Click on it to see delivery details
4. Check error messages

Common issues:
- Invalid FCM token → Reregister device token
- User opted out → Check preferences
- Channel disabled → Enable in workflow

## Performance Testing

### Load Test

```bash
# Send 100 notifications
for i in {1..100}; do
  curl -X POST \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    http://localhost:3000/api/v1/notifications/novu/test/transaction &
done
wait
```

### Monitor

Check in Novu dashboard:
- **Activity Feed** → All 100 notifications sent
- **Analytics** → Delivery rate, latency

## Monitoring in Production

### Logs to Monitor

```bash
# Watch backend logs
tail -f logs/app.log | grep NovuAdapter

# Expected entries:
[NovuAdapter] Novu adapter initialized
[NovuAdapter] Novu subscriber upserted: user-123
[NovuAdapter] Novu device token set for user-123: fcm
[NovuAdapter] Novu notification triggered: transaction-received for user-123
```

### Metrics to Track

1. **Delivery Rate**: % of notifications successfully delivered
2. **Latency**: Time from trigger to delivery
3. **Open Rate**: % of notifications opened
4. **Error Rate**: % of failed notifications

### Novu Dashboard

Monitor daily:
- **Activity Feed** → Check for failures
- **Analytics** → Review delivery stats
- **Subscribers** → Check active users
- **Integrations** → Verify FCM is active

## Best Practices

### Development

1. **Use test endpoints** for development:
   - `POST /novu/test/transaction`
   - `POST /novu/test/security`
   - `POST /novu/test/kyc`

2. **Check status** before testing:
   - `GET /novu/status`

3. **Monitor Activity Feed** in Novu dashboard

### Staging

1. **Create separate Novu app** for staging
2. **Test with real users** in controlled environment
3. **Monitor for 1-2 weeks** before production

### Production

1. **Set up alerts** for delivery failures
2. **Monitor analytics** weekly
3. **Review error logs** daily
4. **Keep templates updated** in Novu dashboard

## Common Workflows

### New User Signup

```typescript
// 1. Create user
const user = await userService.create(signupDto);

// 2. Register in Novu
await novuService.registerUser(user.id, {
  email: user.email,
  firstName: user.firstName,
  phone: user.phone,
});

// 3. Send welcome notification
await novuService.sendWelcomeMessage(user.id, user.firstName);
```

### Transfer Money

```typescript
// 1. Execute transfer
const transfer = await transferService.execute(transferDto);

// 2. Notify recipient
await novuService.sendTransactionNotification({
  userId: transfer.recipientId,
  type: 'received',
  amount: transfer.amount,
  currency: 'USDC',
  transactionId: transfer.id,
  senderName: sender.firstName,
});

// 3. Notify sender
await novuService.sendTransactionNotification({
  userId: transfer.senderId,
  type: 'sent',
  amount: transfer.amount,
  currency: 'USDC',
  transactionId: transfer.id,
  recipientName: recipient.firstName,
});
```

### Security Alert

```typescript
// New device login detected
await novuService.sendNewDeviceLoginAlert(
  userId,
  'iPhone 15 Pro',
  'Abidjan, Côte d\'Ivoire',
  '41.123.45.67',
);
```

## Next Steps

1. ✅ Complete setup (environment, templates)
2. ✅ Test with curl commands
3. ✅ Test with mobile app
4. ⬜ Deploy to staging
5. ⬜ Monitor for 1 week
6. ⬜ Deploy to production

## Support

- **Novu Docs**: https://docs.novu.co
- **Novu Discord**: https://discord.novu.co
- **Setup Guide**: `src/modules/notification/infrastructure/adapters/NOVU_SETUP.md`
- **Migration Guide**: `NOVU_MIGRATION.md`

## Quick Reference

### API Endpoints

```
POST   /api/v1/notifications/novu/subscriber          - Register user
DELETE /api/v1/notifications/novu/subscriber          - Delete user
POST   /api/v1/notifications/novu/device-token        - Register token
DELETE /api/v1/notifications/novu/device-token/:platform - Remove token
GET    /api/v1/notifications/novu/feed                - Get feed
GET    /api/v1/notifications/novu/unread-count        - Get count
POST   /api/v1/notifications/novu/:id/read            - Mark read
POST   /api/v1/notifications/novu/read-all            - Mark all read
POST   /api/v1/notifications/novu/topics/:key/subscribe - Subscribe topic
POST   /api/v1/notifications/novu/test/*              - Test endpoints
GET    /api/v1/notifications/novu/status              - Check status
```

### Environment Variables

```bash
NOVU_API_KEY=          # Required
NOVU_APP_ID=           # Required
NOVU_ENABLED=true      # Enable/disable
```

Good luck with testing! 🚀
