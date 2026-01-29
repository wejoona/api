import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwilioHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const accountSid = this.configService.get<string>('twilio.accountSid', '');
    const authToken = this.configService.get<string>('twilio.authToken', '');
    const startTime = Date.now();

    try {
      // Check Twilio account status via API
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
        'base64',
      );

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${credentials}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        const result = this.getStatus(key, true, {
          latency: `${latency}ms`,
          accountStatus: data.status || 'active',
          accountSid: accountSid.substring(0, 8) + '...',
        });
        return result;
      }

      // 401 means API is reachable but credentials invalid
      if (response.status === 401) {
        const result = this.getStatus(key, true, {
          latency: `${latency}ms`,
          status: response.status,
          note: 'API reachable but authentication failed',
        });
        return result;
      }

      throw new Error(`Twilio API returned status ${response.status}`);
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HealthCheckError(
        'Twilio API check failed',
        this.getStatus(key, false, {
          latency: `${latency}ms`,
          error: errorMessage,
        }),
      );
    }
  }
}
