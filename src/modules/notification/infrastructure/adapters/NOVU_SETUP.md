# Novu Integration Setup Guide

This guide explains how to set up and use Novu for unified notification delivery in JoonaPay.

## What is Novu?

Novu is an open-source notification infrastructure that provides:
- **Multi-channel delivery**: Push, Email, SMS, In-app, Chat
- **Template management**: Edit notification content without code changes
- **Preference management**: User-controlled notification settings
- **Analytics**: Delivery tracking and engagement metrics
- **Digest notifications**: Batch similar notifications
- **Topics/Segments**: Target specific user groups

## Why Use Novu?

### Benefits over Direct FCM
1. **Multi-channel orchestration**: Send push, email, and SMS from one trigger
2. **Template versioning**: Update content without deploying code
3. **Fallback channels**: If push fails, send email automatically
4. **User preferences**: Novu manages channel preferences per user
5. **Analytics dashboard**: Track delivery, open rates, CTR
6. **Digest support**: Batch multiple notifications (e.g., "You have 5 new transactions")

### When to Use Novu vs Direct FCM
- **Use Novu**: When you need multi-channel, template management, or analytics
- **Use Direct FCM**: For simple push-only notifications or lowest latency

## Setup Steps

### 1. Create Novu Account

1. Go to [https://novu.co](https://novu.co)
2. Sign up for free account
3. Create a new application

### 2. Get API Credentials

From Novu dashboard:
1. Navigate to **Settings** → **API Keys**
2. Copy your **API Key**
3. Copy your **Application Identifier** (App ID)

### 3. Configure Environment Variables

Add to `.env`:

```bash
# Novu Configuration
NOVU_API_KEY=your_api_key_here
NOVU_APP_ID=your_app_id_here
NOVU_ENABLED=true
```

### 4. Configure FCM in Novu

1. In Novu dashboard, go to **Integrations**
2. Click **Add Integration**
3. Select **Firebase Cloud Messaging (FCM)**
4. Enter your FCM credentials:
   - **Project ID**: Same as `FCM_PROJECT_ID`
   - **Service Account JSON**: Upload your Firebase service account JSON

### 5. Create Notification Templates

In Novu dashboard, create workflows for each notification type:

#### Transaction Templates

**Template: `transaction-received`**
- **Channels**: Push, Email, In-app
- **Push Title**: `Money Received`
- **Push Body**: `You received {{amount}} {{currency}} from {{senderName}}`
- **Variables**: `amount`, `currency`, `senderName`, `transactionId`, `timestamp`

**Template: `transaction-sent`**
- **Channels**: Push, In-app
- **Push Title**: `Transfer Sent`
- **Push Body**: `{{amount}} {{currency}} sent to {{recipientName}}`
- **Variables**: `amount`, `currency`, `recipientName`, `transactionId`, `timestamp`

**Template: `transaction-failed`**
- **Channels**: Push, Email, In-app
- **Push Title**: `Transaction Failed`
- **Push Body**: `Your transaction of {{amount}} {{currency}} failed`
- **Variables**: `amount`, `currency`, `transactionId`, `timestamp`

#### Security Templates

**Template: `new-device-login`**
- **Channels**: Push, Email
- **Push Title**: `New Device Login`
- **Push Body**: `New device "{{deviceName}}" logged into your account from {{location}}`
- **Variables**: `deviceName`, `location`, `ipAddress`, `timestamp`

**Template: `large-transaction-alert`**
- **Channels**: Push, Email
- **Push Title**: `Large Transaction Alert`
- **Push Body**: `A large transaction of {{amount}} {{currency}} has been initiated`
- **Variables**: `amount`, `currency`, `transactionId`, `timestamp`

**Template: `failed-login-attempts`**
- **Channels**: Push, Email
- **Push Title**: `Failed Login Attempts`
- **Push Body**: `{{attemptCount}} failed login attempts detected`
- **Variables**: `attemptCount`, `lastAttemptTime`, `timestamp`

#### KYC Templates

**Template: `kyc-approved`**
- **Channels**: Push, Email, In-app
- **Push Title**: `KYC Approved`
- **Push Body**: `Your identity has been verified. You now have full access.`
- **Variables**: `timestamp`

**Template: `kyc-rejected`**
- **Channels**: Push, Email, In-app
- **Push Title**: `KYC Verification Failed`
- **Push Body**: `{{reason}}`
- **Variables**: `reason`, `timestamp`

**Template: `kyc-pending`**
- **Channels**: Push, In-app
- **Push Title**: `KYC Under Review`
- **Push Body**: `Your documents are being reviewed. This usually takes 1-2 business days.`
- **Variables**: `timestamp`

#### Balance Templates

**Template: `low-balance-alert`**
- **Channels**: Push, In-app
- **Push Title**: `Low Balance Alert`
- **Push Body**: `Your {{currency}} balance ({{currentBalance}}) is below your threshold ({{threshold}})`
- **Variables**: `currentBalance`, `threshold`, `currency`, `timestamp`

#### Promotional Templates

**Template: `welcome-message`**
- **Channels**: Push, Email, In-app
- **Push Title**: `Welcome to JoonaPay!`
- **Push Body**: `Hi {{firstName}}, welcome to the easiest way to send money in West Africa`
- **Variables**: `firstName`, `timestamp`

**Template: `new-feature-announcement`**
- **Channels**: Push, Email, In-app
- **Push Title**: `New Feature: {{featureName}}`
- **Push Body**: `{{featureDescription}}`
- **Variables**: `featureName`, `featureDescription`, `timestamp`

**Template: `promotional-offer`**
- **Channels**: Push, Email, In-app
- **Push Title**: `{{offerTitle}}`
- **Push Body**: `{{offerDescription}}`
- **Variables**: `offerTitle`, `offerDescription`, `expiryDate`, `timestamp`

### 6. Create Topics (Optional)

For segmented notifications, create topics:

1. Go to **Topics** in Novu dashboard
2. Create topics:
   - `all-users` - All registered users
   - `premium-users` - Premium tier users
   - `beta-testers` - Beta feature access
   - `kyc-verified` - KYC approved users
   - `high-value` - High transaction volume users

## Usage Examples

### Register User on Signup

```typescript
import { NovuNotificationService } from '@modules/notification/application/domain/services';

@Injectable()
export class AuthService {
  constructor(
    private readonly novuService: NovuNotificationService,
  ) {}

  async register(user: User): Promise<void> {
    // ... create user

    // Register in Novu
    await this.novuService.registerUser(user.id, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      locale: user.locale || 'fr', // French for West Africa
    });

    // Send welcome notification
    await this.novuService.sendWelcomeMessage(user.id, user.firstName);
  }
}
```

### Register Device Token

```typescript
import { NovuNotificationService } from '@modules/notification/application/domain/services';

@Injectable()
export class PushNotificationController {
  constructor(
    private readonly novuService: NovuNotificationService,
  ) {}

  @Post('token')
  async registerToken(@Body() dto: RegisterTokenDto, @CurrentUser() user: User) {
    // Register with Novu
    await this.novuService.registerDeviceToken(
      user.id,
      dto.platform === 'ios' ? 'apns' : 'fcm',
      dto.token,
    );

    return { success: true };
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

  async sendMoney(fromUserId: string, toUserId: string, amount: number) {
    // ... execute transfer

    // Notify sender
    await this.novuService.sendTransactionNotification({
      userId: fromUserId,
      type: 'sent',
      amount,
      currency: 'USDC',
      transactionId: transfer.id,
      recipientName: recipient.name,
    });

    // Notify recipient
    await this.novuService.sendTransactionNotification({
      userId: toUserId,
      type: 'received',
      amount,
      currency: 'USDC',
      transactionId: transfer.id,
      senderName: sender.name,
    });
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

  async createSession(userId: string, deviceInfo: DeviceInfo) {
    // ... create session

    // Check if new device
    if (isNewDevice) {
      await this.novuService.sendNewDeviceLoginAlert(
        userId,
        deviceInfo.name,
        deviceInfo.location,
        deviceInfo.ipAddress,
      );
    }
  }
}
```

### Subscribe to Topic

```typescript
import { NovuNotificationService } from '@modules/notification/application/domain/services';

@Injectable()
export class KycService {
  constructor(
    private readonly novuService: NovuNotificationService,
  ) {}

  async approveKyc(userId: string) {
    // ... approve KYC

    // Subscribe to KYC-verified topic
    await this.novuService.subscribeToTopic(userId, 'kyc-verified');

    // Send approval notification
    await this.novuService.sendKycStatusNotification(userId, 'approved');
  }
}
```

### Send Broadcast Notification

```typescript
import { NovuNotificationService } from '@modules/notification/application/domain/services';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly novuService: NovuNotificationService,
  ) {}

  async scheduleMaintenance(scheduledTime: Date, duration: string) {
    // Notify all users
    await this.novuService.sendMaintenanceScheduled(
      scheduledTime,
      duration,
      ['Transfers', 'Deposits', 'Withdrawals'],
    );
  }
}
```

## Testing

### Test with Mock Notifications

Set `NOVU_ENABLED=false` to disable Novu and use direct FCM:

```bash
NOVU_ENABLED=false
```

### Test with Novu Dashboard

1. Go to **Activity Feed** in Novu dashboard
2. Send test notification using the web interface
3. View delivery status and logs

### Monitor Delivery

Check notification delivery in Novu dashboard:
1. **Activity Feed**: See all sent notifications
2. **Analytics**: View delivery rates, open rates
3. **Subscribers**: See user notification history

## Best Practices

1. **Always register users**: Call `registerUser()` after signup
2. **Update device tokens**: Call `registerDeviceToken()` on app start and token refresh
3. **Use templates**: Create all content in Novu dashboard, not in code
4. **Test templates**: Use Novu's preview feature before deploying
5. **Monitor analytics**: Track delivery issues in Novu dashboard
6. **Handle errors gracefully**: Novu failures shouldn't break core functionality
7. **Set user preferences**: Respect user notification preferences
8. **Use topics wisely**: Segment users for targeted notifications

## Troubleshooting

### Notifications Not Sending

1. Check `NOVU_ENABLED=true` in `.env`
2. Verify API credentials are correct
3. Check FCM integration is configured in Novu
4. Verify user is registered: `novuService.registerUser()`
5. Check device token is set: `novuService.registerDeviceToken()`

### Template Not Found

1. Verify template ID matches exactly (case-sensitive)
2. Check template is published in Novu dashboard
3. Ensure template has at least one active channel

### User Not Receiving Notifications

1. Check user preferences in Novu dashboard
2. Verify device token is valid
3. Check notification channel is enabled for user
4. Review Activity Feed in Novu for delivery errors

## Migration from Direct FCM

To migrate from direct FCM to Novu:

1. Set up Novu as described above
2. Enable both systems temporarily:
   ```bash
   NOVU_ENABLED=true
   FCM_USE_MOCK=false
   ```
3. Test Novu notifications in parallel
4. Monitor for 1-2 weeks
5. Gradually move notification types to Novu
6. Once stable, can disable direct FCM for those types

## Support

- **Novu Docs**: https://docs.novu.co
- **Novu Discord**: https://discord.novu.co
- **JoonaPay Support**: Check internal documentation
