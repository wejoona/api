# Twilio SMS Integration Setup Guide

This guide covers the complete setup of Twilio SMS integration for OTP delivery in JoonaPay.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Twilio Account Setup](#twilio-account-setup)
4. [Configuration](#configuration)
5. [Webhook Setup](#webhook-setup)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Cost Optimization](#cost-optimization)

## Overview

The Twilio integration provides:

- **SMS OTP Delivery**: Send verification codes via SMS
- **Multi-language Support**: Automatic French/English message selection
- **Rate Limiting**: Per-phone-number rate limits to prevent abuse
- **Retry Logic**: Exponential backoff for transient failures
- **Delivery Tracking**: Webhook-based delivery status updates
- **Dev Mode**: Simulated SMS for development/testing

## Prerequisites

- Twilio account (free trial or paid)
- Redis instance (for rate limiting and status tracking)
- Public HTTPS endpoint for webhooks (production)

## Twilio Account Setup

### 1. Create Twilio Account

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign up for a new account
3. Verify your email and phone number
4. Complete the onboarding questionnaire

### 2. Get Account Credentials

Navigate to [Account Settings](https://www.twilio.com/console/account/settings):

- **Account SID**: `ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Auth Token**: `your_auth_token_here`

Keep these credentials secure - never commit them to version control.

### 3. Get a Phone Number

**For Trial Accounts:**
1. Go to Phone Numbers → Manage → Active Numbers
2. Use your trial phone number
3. Note: Trial accounts can only send to verified numbers

**For Production:**
1. Go to Phone Numbers → Buy a Number
2. Search for numbers in your target region (e.g., Côte d'Ivoire +225)
3. Select a number with SMS capabilities
4. Complete purchase

**Cost**: ~$1-2/month per phone number

### 4. (Optional) Create a Messaging Service

Messaging Services provide better scalability and sender pooling:

1. Go to Messaging → Services
2. Click "Create Messaging Service"
3. Name it (e.g., "JoonaPay OTP")
4. Select "Notify my users" as use case
5. Add your phone number(s) to the sender pool
6. Copy the **Messaging Service SID**: `MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

**Benefits:**
- Automatic sender selection
- Higher throughput
- Better deliverability
- Unified configuration

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Twilio Configuration (Required)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here

# Phone Number (Option 1: Direct number)
TWILIO_PHONE_NUMBER=+1234567890

# Messaging Service (Option 2: Recommended for production)
TWILIO_MESSAGING_SERVICE_SID=MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Retry Configuration (Optional - has defaults)
TWILIO_MAX_RETRIES=3
TWILIO_INITIAL_RETRY_DELAY_MS=1000
TWILIO_MAX_RETRY_DELAY_MS=10000

# Rate Limiting (Optional - has defaults)
TWILIO_RATE_LIMIT_PER_MINUTE=5
TWILIO_RATE_LIMIT_PER_HOUR=10

# Webhook Security (Optional)
TWILIO_VALIDATE_SIGNATURES=true

# SMS Provider Selection
SMS_PROVIDER=twilio  # Options: mock, twilio, africas_talking

# Development Mode (Optional)
OTP_USE_DEV_OTP=false  # Set to true to bypass Twilio in dev
```

### Configuration Validation

The adapter will log warnings if credentials are missing:

```
[TwilioSmsAdapter] WARN: Twilio credentials not configured. SMS sending will be simulated in dev mode.
```

### Provider Selection

The SMS provider is selected via the `SMS_PROVIDER` environment variable:

- `mock`: Log-only (no actual SMS sent)
- `twilio`: Use Twilio (this guide)
- `africas_talking`: Use Africa's Talking alternative

## Webhook Setup

Webhooks allow Twilio to notify your backend about SMS delivery status.

### 1. Configure Webhook URL

**Option A: Per Phone Number**

1. Go to Phone Numbers → Active Numbers
2. Click on your phone number
3. Scroll to "Messaging"
4. Set "A message comes in" to:
   - Webhook: `https://your-api.com/webhooks/twilio/sms-status`
   - HTTP POST
5. Click Save

**Option B: Messaging Service (Recommended)**

1. Go to Messaging → Services
2. Select your messaging service
3. Go to "Integration" tab
4. Set "Status Callback URL" to:
   ```
   https://your-api.com/webhooks/twilio/sms-status
   ```
5. Enable these status events:
   - Queued
   - Sent
   - Delivered
   - Failed
   - Undelivered
6. Click Save

### 2. Expose Webhook Endpoint

**Development (ngrok):**

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Expose your local API
ngrok http 3000

# Use the HTTPS URL in Twilio console
# Example: https://abc123.ngrok.io/webhooks/twilio/sms-status
```

**Production:**

Ensure your API is:
- Accessible via HTTPS (required by Twilio)
- Has a valid SSL certificate
- Returns HTTP 200 for successful webhook processing

### 3. Set Public URL

Add to your `.env`:

```bash
APP_PUBLIC_URL=https://api.joonapay.com
```

This is used for webhook signature validation.

### 4. Test Webhook

Send a test SMS and check logs:

```bash
# Watch logs
npm run start:dev

# Look for:
[TwilioWebhookController] Received Twilio webhook: SM123... - delivered
[TwilioWebhookService] Processing SMS status update: SM123... -> delivered
```

## Testing

### Unit Tests

Run Twilio adapter tests:

```bash
npm test -- twilio-sms.adapter.spec
npm test -- twilio-webhook.service.spec
```

### Integration Testing

**Option 1: Twilio Test Credentials**

Twilio provides [test credentials](https://www.twilio.com/docs/iam/test-credentials) for testing without sending real SMS:

```bash
# Test credentials (do not charge)
TWILIO_ACCOUNT_SID=ACb7cf0cd01f3f9e08c8e9e39e71aa1d26
TWILIO_AUTH_TOKEN=test_auth_token
TWILIO_PHONE_NUMBER=+15005550006  # Magic test number
```

**Test Phone Numbers:**
- `+15005550006`: Valid number (will succeed)
- `+15005550001`: Invalid number (will fail)
- `+15005550009`: Number owned by someone else (will fail)

**Option 2: Dev Mode**

Bypass Twilio entirely for local development:

```bash
OTP_USE_DEV_OTP=true
NODE_ENV=development
```

This will:
- Simulate successful SMS sends
- Return mock delivery status
- Log messages instead of sending

### Manual Testing

**Step 1: Send OTP**

```bash
curl -X POST http://localhost:3000/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2250701234567"}'
```

**Step 2: Check logs**

```bash
# Should see:
[TwilioSmsAdapter] SMS sent successfully to +225...: SM123456789 (attempt 1)
```

**Step 3: Verify webhook received**

```bash
# Within a few seconds, should see:
[TwilioWebhookController] Received Twilio webhook: SM123456789 - delivered
```

## Monitoring

### Delivery Metrics

Get daily SMS metrics:

```bash
# Via service
await twilioWebhookService.getMetrics('2024-01-29');
```

Returns:

```json
{
  "total": 100,
  "queued": 5,
  "sent": 20,
  "delivered": 70,
  "failed": 3,
  "undelivered": 2
}
```

### Metrics are stored in Redis:

- `sms_metrics:{date}:total` - Total SMS sent
- `sms_metrics:{date}:{status}` - Per-status counts
- `sms_metrics:{date}:country:{code}` - Per-country counts
- Retention: 30 days

### Twilio Console Monitoring

1. Go to [Messaging Logs](https://www.twilio.com/console/sms/logs)
2. View real-time delivery status
3. Check error codes and reasons
4. Monitor usage and costs

### Alerts

Set up alerts for:
- **High failure rate**: > 5% failures
- **Rate limit hits**: Multiple rate limit errors
- **Cost spike**: Unexpected usage increase
- **Invalid credentials**: Authentication failures

## Troubleshooting

### Common Issues

#### 1. SMS Not Sending

**Symptoms:**
```
Error: Twilio credentials not configured
```

**Solution:**
- Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set
- Check credentials are correct in Twilio console
- Ensure no trailing spaces in `.env` file

#### 2. SMS Sent but Not Received

**Check Twilio Logs:**
1. Go to Messaging Logs
2. Find the message by SID
3. Check status and error code

**Common Error Codes:**
- `21211`: Invalid 'To' phone number
- `21614`: 'To' number not verified (trial account)
- `30003`: Unreachable destination handset
- `30005`: Unknown destination handset
- `30006`: Landline or unreachable carrier

**Solutions:**
- Verify phone number format: `+[country][number]`
- For trial: Add recipient to [Verified Numbers](https://www.twilio.com/console/phone-numbers/verified)
- Check carrier compatibility
- Try different phone number

#### 3. Webhook Not Received

**Symptoms:**
- SMS sends successfully
- No webhook logs in backend
- Status stays "queued" in metrics

**Solutions:**

1. **Check webhook URL is correct**
   ```bash
   # Should be publicly accessible HTTPS
   curl https://your-api.com/webhooks/twilio/sms-status
   # Should return: {"status": "ok"}
   ```

2. **Check webhook is configured in Twilio**
   - Phone Numbers or Messaging Service
   - Verify URL matches exactly
   - Ensure HTTP POST is selected

3. **Check firewall/security groups**
   - Allow Twilio IPs: [IP Ranges](https://www.twilio.com/docs/messaging/guides/webhook-request#ip-addresses)
   - Allow port 443 (HTTPS)

4. **Check signature validation**
   ```bash
   # Temporarily disable for testing
   TWILIO_VALIDATE_SIGNATURES=false
   ```

#### 4. Rate Limit Errors

**Symptoms:**
```
Error: Rate limit exceeded: 5 SMS per minute
```

**Solutions:**
- Adjust rate limits in `.env`:
  ```bash
  TWILIO_RATE_LIMIT_PER_MINUTE=10
  TWILIO_RATE_LIMIT_PER_HOUR=50
  ```
- Check for abuse/automated requests
- Implement CAPTCHA for registration
- Monitor rate limit Redis keys: `twilio_rate:{phone}:*`

#### 5. Retry Exhausted

**Symptoms:**
```
Failed to send SMS via Twilio (attempt 3): Network error
```

**Solutions:**
- Check network connectivity
- Verify Twilio API is not down: [Status Page](https://status.twilio.com/)
- Increase retry attempts:
  ```bash
  TWILIO_MAX_RETRIES=5
  ```
- Check Twilio account status (suspended?)

### Debug Mode

Enable detailed logging:

```bash
# In .env
LOG_LEVEL=debug
OTP_ENABLE_DEBUG_LOGGING=true
```

This will log:
- OTP codes (dev only)
- Retry attempts
- Rate limit checks
- Webhook payloads

## Cost Optimization

### Pricing Overview

**Twilio SMS Pricing (varies by country):**
- Côte d'Ivoire: ~$0.08/SMS
- Senegal: ~$0.07/SMS
- Mali: ~$0.07/SMS
- United States: ~$0.0079/SMS

**Phone Numbers:**
- ~$1-2/month per number

**Estimated Costs:**
- 1,000 OTPs/month: $70-80
- 10,000 OTPs/month: $700-800
- 100,000 OTPs/month: $7,000-8,000

### Cost Reduction Strategies

#### 1. Optimize OTP Expiry

Shorter expiry = fewer resend requests:

```bash
OTP_EXPIRES_IN=300  # 5 minutes (default)
```

#### 2. Implement Rate Limiting

Prevent abuse:

```bash
OTP_RATE_LIMIT_PER_HOUR=5  # Max 5 OTPs per hour per phone
```

#### 3. Use Messaging Services

Better routes and pricing:
- Enable "Smart Encoding" for international SMS
- Use "Copilot" for optimal routing
- Pool multiple numbers for better rates

#### 4. Monitor and Alert

Set up cost alerts in Twilio Console:
1. Settings → Usage Triggers
2. Create trigger for SMS
3. Set threshold (e.g., $100/day)
4. Get email/webhook alerts

#### 5. Use Alternative Channels

For high-volume:
- Voice OTP: ~$0.04/call (cheaper in some regions)
- WhatsApp: ~$0.005-0.03/message (requires Business API)
- Email: Free alternative for non-critical flows

#### 6. Implement CAPTCHA

Prevent bot abuse:
```typescript
// Before sending OTP
if (!captchaValid) {
  throw new BadRequestException('Complete CAPTCHA');
}
```

#### 7. Character Optimization

Our templates are already optimized:
- French: 67 characters (1 SMS segment)
- English: 66 characters (1 SMS segment)

> SMS over 160 chars is split into multiple segments and charged accordingly.

### Volume Discounts

For high-volume (100k+ SMS/month):
1. Contact Twilio sales
2. Negotiate volume discounts
3. Get dedicated account manager
4. Access to premium features

## Security Best Practices

### 1. Protect Credentials

```bash
# NEVER commit to git
echo ".env" >> .gitignore

# Use environment variables or secret managers
# AWS Secrets Manager, Azure Key Vault, etc.
```

### 2. Validate Webhook Signatures

Always enabled in production:

```bash
TWILIO_VALIDATE_SIGNATURES=true
```

This prevents attackers from spoofing webhook calls.

### 3. Rate Limiting

Already implemented per-phone-number rate limits prevent:
- SMS flooding attacks
- Abuse of trial accounts
- Excessive costs from bots

### 4. Monitor for Abuse

Watch for:
- Unusual spike in OTP requests
- Same IP requesting many different numbers
- Sequential phone number requests
- Failed OTP verifications

### 5. Use HTTPS

Webhooks MUST use HTTPS to prevent:
- Man-in-the-middle attacks
- Credential exposure
- Message tampering

## Support

### Twilio Support

- **Documentation**: https://www.twilio.com/docs/sms
- **Support**: https://support.twilio.com
- **Status**: https://status.twilio.com
- **Community**: https://www.twilio.com/community

### JoonaPay Team

For integration-specific issues:
1. Check logs first
2. Review this documentation
3. Check troubleshooting section
4. Contact backend team with:
   - Error messages
   - Message SID
   - Phone number (last 4 digits only)
   - Timestamp

## Appendix

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TWILIO_ACCOUNT_SID` | Yes | - | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | - | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes* | - | From phone number |
| `TWILIO_MESSAGING_SERVICE_SID` | No | - | Messaging service SID |
| `TWILIO_MAX_RETRIES` | No | 3 | Max retry attempts |
| `TWILIO_INITIAL_RETRY_DELAY_MS` | No | 1000 | Initial retry delay |
| `TWILIO_MAX_RETRY_DELAY_MS` | No | 10000 | Max retry delay |
| `TWILIO_RATE_LIMIT_PER_MINUTE` | No | 5 | Rate limit per minute |
| `TWILIO_RATE_LIMIT_PER_HOUR` | No | 10 | Rate limit per hour |
| `TWILIO_VALIDATE_SIGNATURES` | No | true | Validate webhook signatures |
| `SMS_PROVIDER` | Yes | mock | SMS provider (twilio) |
| `APP_PUBLIC_URL` | Yes | - | Public API URL for webhooks |

*Either `TWILIO_PHONE_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` is required.

### Message Templates

**French (West Africa):**
```
Votre code JoonaPay est: {otp}. Valide 5 min. Ne le partagez pas.
```
- Length: 67 characters
- Segments: 1

**English:**
```
Your JoonaPay code is: {otp}. Valid for 5 min. Don't share it.
```
- Length: 66 characters
- Segments: 1

### Supported Countries (French Auto-Detection)

- 🇨🇮 Côte d'Ivoire: +225
- 🇸🇳 Senegal: +221
- 🇲🇱 Mali: +223
- 🇧🇫 Burkina Faso: +226
- 🇳🇪 Niger: +227
- 🇹🇬 Togo: +228
- 🇧🇯 Benin: +229
- 🇨🇲 Cameroon: +237
- 🇬🇦 Gabon: +241
- 🇨🇬 Congo: +242
- 🇨🇩 DRC: +243

All other countries default to English.

### Webhook Event Types

| Event | Description | Action |
|-------|-------------|--------|
| `queued` | Message queued | Initial state |
| `sent` | Sent to carrier | In transit |
| `delivered` | Received by phone | Success |
| `undelivered` | Not delivered | Retry or log |
| `failed` | Permanent failure | Log error |

### Error Code Reference

| Code | Meaning | Action |
|------|---------|--------|
| 21211 | Invalid phone number | Validate format |
| 21408 | Permission denied | Check account status |
| 21614 | Number not verified (trial) | Verify in console |
| 30003 | Unreachable | Try later |
| 30005 | Unknown destination | Invalid number |
| 30006 | Landline | Mobile only |
| 30008 | Unknown error | Retry |

Full list: https://www.twilio.com/docs/api/errors
