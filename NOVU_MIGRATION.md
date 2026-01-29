# Novu Push Notification Migration Guide

This guide explains how to integrate Novu for enhanced push notifications in JoonaPay.

## Overview

We've added Novu as an optional notification delivery platform alongside the existing FCM integration. You can:
- Use Novu for multi-channel notifications (push, email, SMS, in-app)
- Continue using direct FCM for push-only notifications
- Run both systems in parallel during migration

## What's New

### Backend

**New Files:**
- `src/modules/notification/infrastructure/adapters/novu-adapter.ts` - Novu SDK integration
- `src/modules/notification/application/domain/services/novu-notification.service.ts` - High-level notification service
- `src/modules/notification/application/controllers/novu.controller.ts` - API endpoints for Novu
- `src/modules/notification/infrastructure/adapters/NOVU_SETUP.md` - Detailed setup guide
- `.env.novu.example` - Environment variable template

**Modified Files:**
- `src/config/configuration.ts` - Added Novu configuration
- `src/modules/notification/notification.module.ts` - Registered Novu services
- `package.json` - Added `@novu/node` dependency

### Environment Variables

Add to `.env`:

```bash
NOVU_API_KEY=your_api_key_here
NOVU_APP_ID=your_app_id_here
NOVU_ENABLED=true
```

## Setup Steps

### 1. Install Dependencies

Already done! The `@novu/node` package has been installed.

### 2. Create Novu Account

1. Sign up at https://novu.co
2. Create a new application
3. Get API credentials from Settings → API Keys

### 3. Configure Environment

```bash
cp .env.novu.example .env.local
# Edit .env.local with your Novu credentials
```

### 4. Set Up FCM Integration in Novu

1. Go to Novu dashboard → Integrations
2. Add Firebase Cloud Messaging (FCM)
3. Upload your FCM service account JSON
4. Test the integration

### 5. Create Notification Templates

Create workflows in Novu dashboard for each notification type:

**Transaction Notifications:**
- `transaction-received`
- `transaction-sent`
- `transaction-completed`
- `transaction-failed`

**Security Notifications:**
- `new-device-login`
- `large-transaction-alert`
- `failed-login-attempts`
- `security-alert`

**KYC Notifications:**
- `kyc-approved`
- `kyc-rejected`
- `kyc-pending`
- `kyc-document-required`

**Balance Notifications:**
- `low-balance-alert`

**Promotional:**
- `welcome-message`
- `new-feature-announcement`
- `promotional-offer`
- `referral-bonus`

**System:**
- `maintenance-scheduled`
- `service-update`

See `src/modules/notification/infrastructure/adapters/NOVU_SETUP.md` for template details.

## Usage Examples

### Register User on Signup

```typescript
import { NovuNotificationService } from '@modules/notification/application/domain/services';

@Injectable()
export class AuthService {
  constructor(
    private readonly novuService: NovuNotificationService,
  ) {}

  async register(user: CreateUserDto): Promise<User> {
    // Create user in database
    const newUser = await this.userRepository.save(user);

    // Register in Novu
    await this.novuService.registerUser(newUser.id, {
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      locale: newUser.locale || 'fr',
    });

    // Send welcome notification
    await this.novuService.sendWelcomeMessage(
      newUser.id,
      newUser.firstName,
    );

    return newUser;
  }
}
```

### Send Transaction Notification

```typescript
import { NovuNotificationService } from '@modules/notification/application/domain/services';

@Injectable()
export class TransferService {
  constructor(
    private readonly novuService: NovuNotificationService,
  ) {}

  async executeTransfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
  ): Promise<Transfer> {
    // Execute transfer logic...

    // Notify via Novu (includes push, email, in-app)
    await this.novuService.sendTransactionNotification({
      userId: toUserId,
      type: 'received',
      amount,
      currency: 'USDC',
      transactionId: transfer.id,
      senderName: sender.firstName,
    });

    await this.novuService.sendTransactionNotification({
      userId: fromUserId,
      type: 'sent',
      amount,
      currency: 'USDC',
      transactionId: transfer.id,
      recipientName: recipient.firstName,
    });

    return transfer;
  }
}
```

### Send Security Alert

```typescript
import { NovuNotificationService } from '@modules/notification/application/domain/services';

@Injectable()
export class SessionService {
  constructor(
    private readonly novuService: NovuNotificationService,
  ) {}

  async createSession(userId: string, deviceInfo: DeviceInfo): Promise<Session> {
    // Create session...

    if (this.isNewDevice(deviceInfo)) {
      await this.novuService.sendNewDeviceLoginAlert(
        userId,
        deviceInfo.name,
        deviceInfo.location,
        deviceInfo.ipAddress,
      );
    }

    return session;
  }
}
```

## Mobile Integration

The mobile app already has push notification support. No changes needed! The mobile app will:
1. Register FCM token on app start
2. Receive push notifications via FCM
3. Handle deep linking to appropriate screens

### Testing on Mobile

1. Build and run the mobile app
2. Login with test account
3. Use Novu dashboard to send test notification
4. Notification should appear on device

## API Endpoints

New endpoints available at `/api/v1/notifications/novu`:

### User Management
- `POST /subscriber` - Register user in Novu
- `DELETE /subscriber` - Delete user from Novu

### Device Tokens
- `POST /device-token` - Register FCM/APNS token
- `DELETE /device-token/:platform` - Remove device token

### Topics
- `POST /topics/:topicKey/subscribe` - Subscribe to topic
- `POST /topics/:topicKey/unsubscribe` - Unsubscribe from topic

### Notifications
- `GET /feed` - Get notification feed
- `GET /unread-count` - Get unread count
- `POST /:messageId/read` - Mark as read
- `POST /read-all` - Mark all as read

### Testing (Development)
- `POST /test/transaction` - Send test transaction notification
- `POST /test/security` - Send test security alert
- `POST /test/kyc` - Send test KYC notification
- `POST /test/welcome` - Send test welcome message
- `GET /status` - Check Novu status

## Migration Strategy

### Phase 1: Parallel Run (Recommended)

Run both Novu and direct FCM simultaneously:

```bash
NOVU_ENABLED=true
FCM_USE_MOCK=false
```

Benefits:
- Zero downtime
- Easy rollback
- Compare delivery rates

### Phase 2: Gradual Transition

Move notification types one at a time to Novu:
1. Start with promotional notifications
2. Then transactional notifications
3. Finally security notifications

### Phase 3: Full Migration

Once stable, disable direct FCM for notification types handled by Novu.

## Rollback Plan

If issues arise, simply disable Novu:

```bash
NOVU_ENABLED=false
```

The system will automatically fall back to direct FCM.

## Monitoring

### Novu Dashboard

Monitor in Novu dashboard:
- Activity Feed: See all sent notifications
- Analytics: Delivery rates, open rates, CTR
- Subscribers: User notification history

### Backend Logs

Check application logs for:
- `[NovuAdapter]` - Novu operations
- `[NovuNotificationService]` - High-level notification events
- `[NovuController]` - API endpoint calls

### Metrics to Track

1. **Delivery Rate**: % of notifications successfully delivered
2. **Open Rate**: % of notifications opened
3. **Response Time**: Time from trigger to delivery
4. **Error Rate**: % of failed notifications
5. **User Engagement**: Click-through rates

## Troubleshooting

### Notifications Not Sending

**Check:**
1. `NOVU_ENABLED=true` in `.env`
2. API credentials are correct
3. FCM integration configured in Novu dashboard
4. User is registered: `POST /notifications/novu/subscriber`
5. Device token is set: `POST /notifications/novu/device-token`

**Debug:**
```bash
# Check Novu status
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/status

# Send test notification
curl -X POST -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:3000/api/v1/notifications/novu/test/transaction
```

### Template Not Found

**Error:** `Template 'transaction-received' not found`

**Solution:**
1. Go to Novu dashboard → Workflows
2. Create workflow with exact ID: `transaction-received`
3. Ensure workflow is published
4. Check at least one channel (push) is enabled

### User Not Receiving Notifications

**Check:**
1. User preferences in Novu dashboard
2. Device token is valid (check FCM integration)
3. Notification channel is enabled for user
4. Review Activity Feed in Novu for delivery errors

**Common Issues:**
- Invalid FCM token (reregister on app start)
- User opted out of notifications (check preferences)
- Template not published in Novu

## Performance Considerations

### Latency

- **Direct FCM**: ~100-200ms
- **Novu + FCM**: ~300-500ms (additional Novu processing)

For time-critical notifications, consider using direct FCM.

### Rate Limits

Novu free tier limits:
- 30,000 events/month
- 3 workflows

For production, consider paid tier or self-hosted Novu.

### Batch Operations

Use bulk operations for better performance:

```typescript
// Send to multiple users efficiently
await novuService.sendBulkNotification(
  NovuTemplate.NEW_FEATURE_ANNOUNCEMENT,
  userIds,
  { featureName: 'Send Money', featureDescription: '...' }
);
```

## Best Practices

1. **Always register users**: Call `registerUser()` after signup
2. **Update on profile changes**: Call `updateUser()` when user updates profile
3. **Handle token refresh**: Reregister device token on app start
4. **Test templates**: Use Novu preview before deploying
5. **Monitor analytics**: Check Novu dashboard weekly
6. **Respect preferences**: Let users control notification settings
7. **Use topics wisely**: Segment users for targeted notifications
8. **Handle errors gracefully**: Notification failures shouldn't break core flows

## Support

- **Novu Documentation**: https://docs.novu.co
- **Novu Discord**: https://discord.novu.co
- **Setup Guide**: `src/modules/notification/infrastructure/adapters/NOVU_SETUP.md`
- **Code Examples**: `src/modules/notification/application/controllers/novu.controller.ts`

## Next Steps

1. ✅ Install Novu SDK (done)
2. ⬜ Create Novu account
3. ⬜ Configure environment variables
4. ⬜ Set up FCM integration in Novu
5. ⬜ Create notification templates
6. ⬜ Test with development environment
7. ⬜ Run parallel with existing FCM
8. ⬜ Monitor for 1-2 weeks
9. ⬜ Gradually migrate notification types
10. ⬜ Full migration when stable

Good luck! 🚀
