# API Health Monitoring Integration Guide

This guide shows how to integrate the API Health Monitoring module into your existing services.

## Step 1: Import the Module

Add `ApiHealthModule` to your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ApiHealthModule } from './modules/api-health';
import { MetricsModule } from './modules/metrics';

@Module({
  imports: [
    // ... other modules
    MetricsModule,
    ApiHealthModule,
  ],
})
export class AppModule {}
```

## Step 2: Configure Environment Variables

Add the following to your `.env` file:

```env
# Circle API
CIRCLE_API_URL=https://api.circle.com
CIRCLE_API_KEY=your_circle_api_key_here

# Yellow Card API
YELLOW_CARD_API_URL=https://sandbox.api.yellowcard.io
YELLOW_CARD_API_KEY=your_yellowcard_api_key_here
YELLOW_CARD_SECRET_KEY=your_yellowcard_secret_key_here

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## Step 3: Track Twilio Message Delivery

In your SMS service, track message delivery:

```typescript
// src/modules/notifications/sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { ApiHealthMetricsService } from '@modules/api-health';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly twilioClient: Twilio;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiHealthMetricsService: ApiHealthMetricsService,
  ) {
    const accountSid = this.configService.get<string>('twilio.accountSid');
    const authToken = this.configService.get<string>('twilio.authToken');
    this.twilioClient = new Twilio(accountSid, authToken);
  }

  async sendSms(to: string, message: string): Promise<void> {
    const from = this.configService.get<string>('twilio.phoneNumber');

    try {
      const result = await this.twilioClient.messages.create({
        to,
        from,
        body: message,
      });

      // Track successful send
      this.apiHealthMetricsService.recordTwilioMessage(
        result.status as 'sent' | 'delivered',
      );

      this.logger.log(`SMS sent to ${to}: ${result.sid}`);
    } catch (error) {
      // Track failure
      const errorCode = error.code || 'unknown';
      this.apiHealthMetricsService.recordTwilioMessage('failed', errorCode);

      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle Twilio webhook callback for delivery status
   */
  async handleDeliveryStatus(
    messageSid: string,
    status: string,
    errorCode?: string,
  ): Promise<void> {
    // Track delivery status
    if (status === 'delivered') {
      this.apiHealthMetricsService.recordTwilioMessage('delivered');
    } else if (status === 'undelivered' || status === 'failed') {
      this.apiHealthMetricsService.recordTwilioMessage(
        'undelivered',
        errorCode,
      );
    }

    this.logger.log(`SMS ${messageSid} status: ${status}`);
  }
}
```

## Step 4: Add Twilio Webhook Endpoint

Create a webhook controller to receive delivery status updates:

```typescript
// src/modules/notifications/twilio-webhook.controller.ts
import { Controller, Post, Body, Headers } from '@nestjs/common';
import { SmsService } from './sms.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

interface TwilioWebhookDto {
  MessageSid: string;
  MessageStatus: string;
  ErrorCode?: string;
}

@Controller('webhooks/twilio')
export class TwilioWebhookController {
  constructor(
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('status')
  async handleStatusCallback(
    @Body() body: TwilioWebhookDto,
    @Headers('x-twilio-signature') signature: string,
  ): Promise<{ success: boolean }> {
    // Verify webhook signature (optional but recommended)
    const isValid = this.verifyTwilioSignature(signature, body);
    if (!isValid) {
      throw new Error('Invalid Twilio signature');
    }

    // Process status update
    await this.smsService.handleDeliveryStatus(
      body.MessageSid,
      body.MessageStatus,
      body.ErrorCode,
    );

    return { success: true };
  }

  private verifyTwilioSignature(
    signature: string,
    body: any,
  ): boolean {
    const authToken = this.configService.get<string>('twilio.authToken');
    const url = this.configService.get<string>('app.url') + '/webhooks/twilio/status';

    // Construct the data string
    const data = Object.keys(body)
      .sort()
      .reduce((acc, key) => acc + key + body[key], url);

    // Compute HMAC-SHA1
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    return signature === expectedSignature;
  }
}
```

## Step 5: Monitor API Health Programmatically

Check API health in your monitoring service:

```typescript
// src/modules/monitoring/monitoring.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiHealthMetricsService } from '@modules/api-health';
import { ApiProvider } from '@modules/api-health/domain/entities/api-health-metric.entity';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly apiHealthMetricsService: ApiHealthMetricsService,
  ) {}

  /**
   * Check critical APIs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkCriticalAPIs(): Promise<void> {
    this.logger.debug('Checking critical API health');

    const health = await this.apiHealthMetricsService.getCurrentHealth();

    // Check Circle API (critical for USDC transfers)
    if (!health[ApiProvider.CIRCLE]?.available) {
      this.logger.error('CRITICAL: Circle API is down!');
      // Send alert to ops team
      await this.sendAlert('Circle API is down', 'critical');
    }

    // Check Yellow Card API (critical for mobile money)
    if (!health[ApiProvider.YELLOW_CARD]?.available) {
      this.logger.error('CRITICAL: Yellow Card API is down!');
      await this.sendAlert('Yellow Card API is down', 'critical');
    }

    // Check Twilio API (important for notifications)
    if (!health[ApiProvider.TWILIO]?.available) {
      this.logger.warn('WARNING: Twilio API is down!');
      await this.sendAlert('Twilio API is down', 'warning');
    }

    // Check for high latency
    Object.entries(health).forEach(([provider, data]) => {
      if (data.available && data.latencyMs > 2000) {
        this.logger.warn(
          `${provider} API latency is high: ${data.latencyMs}ms`,
        );
      }
    });
  }

  /**
   * Manual health check trigger
   */
  async triggerHealthCheck(provider?: ApiProvider): Promise<void> {
    if (provider) {
      await this.apiHealthMetricsService.checkProviderHealth(provider);
    } else {
      await this.apiHealthMetricsService.collectAllMetrics();
    }
  }

  private async sendAlert(message: string, severity: string): Promise<void> {
    // Implement your alerting logic here
    // e.g., send to Slack, PagerDuty, email, etc.
    this.logger.log(`Alert [${severity}]: ${message}`);
  }
}
```

## Step 6: Access Health Endpoints

Test the health endpoints:

```bash
# Get all API health status
curl http://localhost:3000/api-health

# Get Circle API health
curl http://localhost:3000/api-health/circle

# Get Yellow Card API health
curl http://localhost:3000/api-health/yellow_card

# Get Twilio API health
curl http://localhost:3000/api-health/twilio

# Manually trigger health checks (requires auth)
curl -X POST http://localhost:3000/api-health/check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Trigger health check for specific provider
curl -X POST http://localhost:3000/api-health/check/circle \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 7: View Prometheus Metrics

Access Prometheus metrics at `http://localhost:3000/metrics`:

```bash
# View all API health metrics
curl http://localhost:3000/metrics | grep api_health

# View Twilio metrics
curl http://localhost:3000/metrics | grep api_twilio
```

## Step 8: Configure Grafana Dashboard

1. Import the dashboard JSON:
   ```bash
   infrastructure/monitoring/grafana/dashboards/api-health-dashboard.json
   ```

2. Access the dashboard:
   ```
   http://localhost:3000/grafana/d/api-health-monitoring
   ```

3. Configure refresh interval (recommended: 30s)

## Step 9: Set Up Prometheus Alerts

1. Copy alert rules to Prometheus:
   ```bash
   cp infrastructure/monitoring/prometheus/alerts/api-health-alerts.yml \
      /path/to/prometheus/alerts/
   ```

2. Reload Prometheus configuration:
   ```bash
   curl -X POST http://localhost:9090/-/reload
   ```

3. Verify alerts are loaded:
   ```bash
   curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | select(.name == "api_health_alerts")'
   ```

## Step 10: Add Health Checks to CI/CD

Add health checks to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Verify API Health
  run: |
    # Wait for deployment
    sleep 30

    # Check health endpoint
    HEALTH_STATUS=$(curl -s https://api.joonapay.com/api-health | jq -r '.overall')

    if [ "$HEALTH_STATUS" != "healthy" ]; then
      echo "API health check failed: $HEALTH_STATUS"
      exit 1
    fi

    echo "All APIs are healthy"
```

## Common Integration Patterns

### Pattern 1: Circuit Breaker with Health Check

```typescript
import { Injectable } from '@nestjs/common';
import { ApiHealthMetricsService } from '@modules/api-health';
import { ApiProvider } from '@modules/api-health/domain/entities/api-health-metric.entity';

@Injectable()
export class CircuitBreakerService {
  private circuitOpen = new Map<ApiProvider, boolean>();

  constructor(
    private readonly apiHealthMetricsService: ApiHealthMetricsService,
  ) {}

  async executeWithCircuitBreaker<T>(
    provider: ApiProvider,
    operation: () => Promise<T>,
  ): Promise<T> {
    // Check if circuit is open
    if (this.circuitOpen.get(provider)) {
      throw new Error(`Circuit breaker open for ${provider}`);
    }

    try {
      const result = await operation();
      this.circuitOpen.set(provider, false);
      return result;
    } catch (error) {
      // Check health
      const health = await this.apiHealthMetricsService.getCurrentHealth();
      if (!health[provider]?.available) {
        // Open circuit
        this.circuitOpen.set(provider, true);
        setTimeout(() => this.circuitOpen.set(provider, false), 60000); // Reset after 1 minute
      }
      throw error;
    }
  }
}
```

### Pattern 2: Fallback Based on Health

```typescript
import { Injectable } from '@nestjs/common';
import { ApiHealthMetricsService } from '@modules/api-health';
import { ApiProvider } from '@modules/api-health/domain/entities/api-health-metric.entity';

@Injectable()
export class SmsServiceWithFallback {
  constructor(
    private readonly apiHealthMetricsService: ApiHealthMetricsService,
  ) {}

  async sendSms(to: string, message: string): Promise<void> {
    const health = await this.apiHealthMetricsService.getCurrentHealth();

    if (health[ApiProvider.TWILIO]?.available) {
      // Use Twilio
      await this.sendViaTwilio(to, message);
    } else {
      // Fallback to alternative provider
      await this.sendViaFallbackProvider(to, message);
    }
  }

  private async sendViaTwilio(to: string, message: string): Promise<void> {
    // Implementation
  }

  private async sendViaFallbackProvider(to: string, message: string): Promise<void> {
    // Fallback implementation
  }
}
```

## Troubleshooting

### Issue: Metrics not appearing

**Solution:** Ensure `ApiHealthModule` is imported in `app.module.ts` and Prometheus is scraping `/metrics` endpoint.

### Issue: Health checks always failing

**Solution:** Verify API credentials in `.env` file and network connectivity.

### Issue: Twilio delivery metrics not updating

**Solution:** Ensure `recordTwilioMessage()` is called after sending messages and webhook is configured.

### Issue: High memory usage

**Solution:** Reduce health check frequency or limit metric cardinality by removing high-cardinality labels.

## Best Practices

1. **Always record metrics** - Even on failures, record the attempt
2. **Use webhooks for accuracy** - Twilio webhooks provide accurate delivery status
3. **Set up alerts** - Don't just collect metrics, act on them
4. **Monitor latency** - High latency often precedes outages
5. **Test failover** - Regularly test what happens when APIs are down
6. **Document runbooks** - Create response procedures for each alert
7. **Review SLAs** - Ensure monitoring aligns with provider SLAs

## Production Checklist

- [ ] API credentials configured in production `.env`
- [ ] Prometheus scraping `/metrics` endpoint
- [ ] Grafana dashboard imported and accessible
- [ ] Alert rules configured in Prometheus
- [ ] Alert notifications configured (Slack, PagerDuty, etc.)
- [ ] Twilio webhook endpoint configured
- [ ] Health check cron job running
- [ ] CI/CD health checks added
- [ ] Runbooks created for each alert
- [ ] Team trained on alert responses
