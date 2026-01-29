# Twilio Module

Enterprise-grade Twilio SMS integration for OTP delivery in JoonaPay.

## Features

- **SMS OTP Delivery**: Send verification codes via Twilio SMS
- **Multi-language Support**: Auto-detect French/English based on phone country code
- **Rate Limiting**: Per-phone-number rate limits (5/min, 10/hour default)
- **Retry Logic**: Exponential backoff for transient failures (3 retries default)
- **Delivery Tracking**: Webhook-based status updates (queued, sent, delivered, failed)
- **Character Optimization**: SMS messages under 160 chars (single segment)
- **Dev Mode**: Simulate SMS for development/testing
- **Security**: Webhook signature validation prevents spoofing

## Architecture

```
twilio/
├── twilio.module.ts                    # Module registration
└── ../webhook/application/
    ├── controllers/
    │   └── twilio-webhook.controller.ts  # Webhook endpoint
    └── services/
        └── twilio-webhook.service.ts     # Status tracking

shared/infrastructure/gateways/sms/
├── twilio-sms.adapter.ts              # Twilio SDK integration
└── twilio-sms.adapter.spec.ts         # Unit tests
```

## Quick Start

### 1. Install Dependencies

```bash
npm install twilio
```

### 2. Configure Environment

```bash
# Required
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Or use Messaging Service (recommended)
TWILIO_MESSAGING_SERVICE_SID=MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Set provider
SMS_PROVIDER=twilio

# Public URL for webhooks
APP_PUBLIC_URL=https://api.joonapay.com
```

### 3. Import Module

Already imported in `app.module.ts`:

```typescript
import { TwilioModule } from './modules/twilio/twilio.module';

@Module({
  imports: [
    TwilioModule, // SMS OTP and webhook handling
  ],
})
export class AppModule {}
```

### 4. Send OTP

The OTP service automatically uses Twilio when `SMS_PROVIDER=twilio`:

```typescript
// No code changes needed - OtpService uses SMS_GATEWAY injection
await otpService.sendOtp('+2250701234567');
```

### 5. Setup Webhooks

Configure in Twilio Console:
- Messaging → Services → [Your Service]
- Status Callback URL: `https://your-api.com/webhooks/twilio/sms-status`
- Events: Queued, Sent, Delivered, Failed, Undelivered

## Configuration

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Account SID from console | `ACXXXXXX...` |
| `TWILIO_AUTH_TOKEN` | Auth token from console | `secret123...` |
| `TWILIO_PHONE_NUMBER` | From phone number | `+1234567890` |
| `SMS_PROVIDER` | Provider selection | `twilio` |
| `APP_PUBLIC_URL` | Public API URL | `https://api.joonapay.com` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `TWILIO_MESSAGING_SERVICE_SID` | - | Use Messaging Service instead of phone number |
| `TWILIO_MAX_RETRIES` | 3 | Max retry attempts |
| `TWILIO_INITIAL_RETRY_DELAY_MS` | 1000 | Initial retry delay |
| `TWILIO_MAX_RETRY_DELAY_MS` | 10000 | Max retry delay |
| `TWILIO_RATE_LIMIT_PER_MINUTE` | 5 | Rate limit per minute |
| `TWILIO_RATE_LIMIT_PER_HOUR` | 10 | Rate limit per hour |
| `TWILIO_VALIDATE_SIGNATURES` | true | Validate webhook signatures |

## Usage

### Send OTP

```typescript
import { OtpService } from '@/modules/user/application/domain/services/otp.service';

// OtpService automatically uses TwilioSmsAdapter when SMS_PROVIDER=twilio
await otpService.sendOtp(phone);
```

The adapter automatically:
- Detects language (French for +225, +221, etc.)
- Applies rate limiting
- Retries on failures
- Logs delivery status

### Track Delivery Status

```typescript
import { TwilioWebhookService } from '@/modules/webhook/application/services/twilio-webhook.service';

// Get delivery status
const status = await twilioWebhookService.getDeliveryStatus('SM123456789');
// Returns: { status: 'delivered', to: '+2250701234567', ... }

// Get daily metrics
const metrics = await twilioWebhookService.getMetrics('2024-01-29');
// Returns: { total: 100, delivered: 95, failed: 5, ... }
```

### Listen for Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MyService {
  @OnEvent('sms.status.updated')
  handleSmsStatusUpdate(event: any) {
    console.log(`SMS ${event.messageSid} status: ${event.status}`);
    // Handle failed deliveries, log metrics, etc.
  }
}
```

## Message Templates

### French (Auto-selected for West Africa)

```
Votre code JoonaPay est: {otp}. Valide 5 min. Ne le partagez pas.
```
- **Length**: 67 characters
- **Segments**: 1 (under 160 chars)
- **Auto-detected for**: +225, +221, +223, +226, +227, +228, +229, +237, +241, +242, +243

### English (Default)

```
Your JoonaPay code is: {otp}. Valid for 5 min. Don't share it.
```
- **Length**: 66 characters
- **Segments**: 1 (under 160 chars)
- **Used for**: All other country codes

## Rate Limiting

Rate limits are enforced per phone number to prevent abuse:

- **Per Minute**: 5 SMS (default)
- **Per Hour**: 10 SMS (default)

Tracked in Redis:
- `twilio_rate:{phone}:minute` (TTL: 60s)
- `twilio_rate:{phone}:hour` (TTL: 3600s)

**Customization:**

```bash
TWILIO_RATE_LIMIT_PER_MINUTE=10
TWILIO_RATE_LIMIT_PER_HOUR=50
```

## Retry Logic

Automatic retry with exponential backoff:

1. **Attempt 1**: Immediate
2. **Attempt 2**: After 1s + jitter
3. **Attempt 3**: After 2s + jitter

**Retryable Errors:**
- Network errors (ECONNRESET, ETIMEDOUT)
- Rate limits (20429)
- Server errors (20500, 20503)
- Queue overflow (30001)

**Non-retryable Errors:**
- Invalid phone number (21211)
- Permission denied (21408)
- Unverified number (21614)

## Webhooks

### Endpoint

```
POST /webhooks/twilio/sms-status
```

### Payload

```json
{
  "MessageSid": "SM123456789",
  "MessageStatus": "delivered",
  "To": "+2250701234567",
  "From": "+1234567890",
  "ErrorCode": null,
  "ErrorMessage": null
}
```

### Status Flow

```
queued → sent → delivered
                ↓
              failed/undelivered
```

### Security

Webhooks are validated using Twilio signature:
1. Request signature in `X-Twilio-Signature` header
2. Computed from URL + sorted payload + auth token
3. HMAC SHA-1 comparison (timing-safe)

Disable validation (dev only):
```bash
TWILIO_VALIDATE_SIGNATURES=false
```

## Development Mode

Bypass Twilio for local development:

```bash
OTP_USE_DEV_OTP=true
NODE_ENV=development
```

This will:
- Simulate SMS sends (no API calls)
- Return mock delivery status
- Log messages to console
- Generate dev message IDs: `DEV_xxxxx`

## Testing

### Unit Tests

```bash
npm test -- twilio-sms.adapter.spec
npm test -- twilio-webhook.service.spec
```

### Integration Tests

Use Twilio test credentials:

```bash
TWILIO_ACCOUNT_SID=ACb7cf0cd01f3f9e08c8e9e39e71aa1d26
TWILIO_AUTH_TOKEN=test_auth_token
TWILIO_PHONE_NUMBER=+15005550006
```

Test numbers:
- `+15005550006`: Valid (succeeds)
- `+15005550001`: Invalid (fails)

### Manual Testing

```bash
# Send OTP
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250701234567"}'

# Check logs
npm run start:dev

# Simulate webhook (dev)
curl -X POST http://localhost:3000/webhooks/twilio/sms-status \
  -H "Content-Type: application/json" \
  -d '{
    "MessageSid": "SM123456789",
    "MessageStatus": "delivered",
    "To": "+2250701234567",
    "From": "+1234567890"
  }'
```

## Monitoring

### Metrics

Stored in Redis (30-day retention):
- `sms_metrics:{date}:total` - Total sent
- `sms_metrics:{date}:delivered` - Successful
- `sms_metrics:{date}:failed` - Failed
- `sms_metrics:{date}:country:{code}` - Per-country

### Logs

Watch for:
```
[TwilioSmsAdapter] SMS sent successfully to +225...: SM123456789
[TwilioWebhookController] Received Twilio webhook: SM123456789 - delivered
[TwilioWebhookService] Processing SMS status update: SM123456789 -> delivered
```

### Alerts

Monitor for:
- High failure rate (>5%)
- Rate limit hits
- Cost spikes
- Invalid credentials

## Cost Optimization

### Pricing (Approximate)

- Côte d'Ivoire: $0.08/SMS
- Senegal: $0.07/SMS
- Mali: $0.07/SMS
- Phone Number: $1-2/month

### Optimization Tips

1. **Short OTP expiry**: Reduce resend requests
2. **Rate limiting**: Prevent abuse
3. **Character optimization**: Stay under 160 chars (our templates do)
4. **Messaging Services**: Better routing and pricing
5. **CAPTCHA**: Prevent bot abuse
6. **Volume discounts**: Contact Twilio for 100k+ SMS/month

## Troubleshooting

### SMS Not Sending

```
Error: Twilio credentials not configured
```
- Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
- Check for trailing spaces in `.env`

### SMS Not Received

Check Twilio Console Logs:
- Go to Messaging → Logs
- Find message by SID
- Check error code

Common issues:
- Invalid phone format (use `+[country][number]`)
- Unverified number (trial account)
- Carrier issues

### Webhook Not Working

1. Check URL is publicly accessible (HTTPS)
2. Verify URL in Twilio console matches
3. Test webhook endpoint: `curl https://your-api.com/webhooks/twilio/sms-status`
4. Temporarily disable signature validation

### Rate Limits

```
Error: Rate limit exceeded: 5 SMS per minute
```
- Adjust `TWILIO_RATE_LIMIT_PER_MINUTE`
- Check for abuse
- Implement CAPTCHA

## Documentation

- [Full Setup Guide](../../docs/TWILIO_SETUP.md)
- [Twilio SMS Docs](https://www.twilio.com/docs/sms)
- [Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [Error Codes](https://www.twilio.com/docs/api/errors)

## Support

For integration issues:
1. Check logs
2. Review [TWILIO_SETUP.md](../../docs/TWILIO_SETUP.md)
3. Check Twilio Console Logs
4. Contact backend team with:
   - Error message
   - Message SID
   - Phone number (last 4 digits)
   - Timestamp
