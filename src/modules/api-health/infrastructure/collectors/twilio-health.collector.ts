import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCollector,
  HealthCheckResult,
} from '../../domain/interfaces/health-collector.interface';
import { ApiProvider } from '../../domain/entities/api-health-metric.entity';

@Injectable()
export class TwilioHealthCollector implements HealthCollector {
  private readonly logger = new Logger(TwilioHealthCollector.name);

  constructor(private readonly configService: ConfigService) {}

  getProvider(): ApiProvider {
    return ApiProvider.TWILIO;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const accountSid = this.configService.get<string>('twilio.accountSid', '');
    const authToken = this.configService.get<string>('twilio.authToken', '');
    const endpoint = `/2010-04-01/Accounts/${accountSid}.json`;
    const startTime = Date.now();

    try {
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
        'base64',
      );

      const response = await fetch(`https://api.twilio.com${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;

      // Twilio is considered healthy if it responds (even with auth errors)
      const available = response.ok || response.status === 401;

      let metadata: Record<string, any> = {
        accountSid: accountSid ? accountSid.substring(0, 8) + '...' : 'none',
        hasAuthToken: !!authToken,
      };

      // If successful, parse the response to get account status
      if (response.ok) {
        try {
          const data = await response.json();
          metadata = {
            ...metadata,
            accountStatus: data.status || 'unknown',
            accountType: data.type || 'unknown',
          };
        } catch (parseError) {
          // Ignore parse errors for metadata
        }
      }

      return {
        provider: ApiProvider.TWILIO,
        endpoint,
        available,
        latencyMs,
        statusCode: response.status,
        metadata,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Twilio health check failed: ${errorMessage}`);

      return {
        provider: ApiProvider.TWILIO,
        endpoint,
        available: false,
        latencyMs,
        errorMessage,
        metadata: {
          accountSid: accountSid ? accountSid.substring(0, 8) + '...' : 'none',
          errorType: error.constructor.name,
        },
      };
    }
  }
}
