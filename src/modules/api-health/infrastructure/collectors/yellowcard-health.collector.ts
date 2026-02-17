import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  HealthCollector,
  HealthCheckResult,
} from '../../domain/interfaces/health-collector.interface';
import { ApiProvider } from '../../domain/entities/api-health-metric.entity';

@Injectable()
export class YellowCardHealthCollector implements HealthCollector {
  private readonly logger = new Logger(YellowCardHealthCollector.name);

  constructor(private readonly configService: ConfigService) {}

  getProvider(): ApiProvider {
    return ApiProvider.YELLOW_CARD;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    // Yellow Card integration disabled — return healthy stub
    if (this.configService.get<string>('YELLOW_CARD_ENABLED', 'false') !== 'true') {
      return {
        provider: ApiProvider.YELLOW_CARD,
        endpoint: '/business/rates',
        available: false,
        latencyMs: 0,
        metadata: { disabled: true, note: 'YELLOW_CARD_ENABLED=false' },
      };
    }

    const baseUrl = this.configService.get<string>(
      'yellowCard.apiUrl',
      'https://sandbox.api.yellowcard.io',
    );
    const apiKey = this.configService.get<string>('yellowCard.apiKey', '');
    const secretKey = this.configService.get<string>(
      'yellowCard.secretKey',
      '',
    );
    const endpoint = '/business/rates';
    const startTime = Date.now();

    try {
      const timestamp = Date.now();
      const message = `${timestamp}GET${endpoint}`;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('hex');

      const response = await fetch(
        `${baseUrl}${endpoint}?sourceCurrency=XOF&destinationCurrency=USDC&amount=1000`,
        {
          method: 'GET',
          headers: {
            'YC-Timestamp': String(timestamp),
            Authorization: `YcHmacV1 ${apiKey}:${signature}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      const latencyMs = Date.now() - startTime;

      // Yellow Card is considered healthy if it responds (even with auth errors)
      const available =
        response.ok || response.status === 401 || response.status === 403;

      let metadata: Record<string, any> = {
        baseUrl,
        hasApiKey: !!apiKey,
        hasSecretKey: !!secretKey,
      };

      // If successful, parse the response to get rate data
      if (response.ok) {
        try {
          const data = await response.json();
          metadata = {
            ...metadata,
            rateAvailable: !!data?.rate,
            currency: 'XOF',
          };
        } catch (parseError) {
          // Ignore parse errors for metadata
        }
      }

      return {
        provider: ApiProvider.YELLOW_CARD,
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

      this.logger.error(`Yellow Card health check failed: ${errorMessage}`);

      return {
        provider: ApiProvider.YELLOW_CARD,
        endpoint,
        available: false,
        latencyMs,
        errorMessage,
        metadata: {
          baseUrl,
          errorType: error.constructor.name,
        },
      };
    }
  }
}
