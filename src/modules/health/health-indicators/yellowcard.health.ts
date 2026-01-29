import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class YellowCardHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const apiUrl = this.configService.get<string>(
      'yellowCard.apiUrl',
      'https://sandbox.api.yellowcard.io',
    );
    const apiKey = this.configService.get<string>('yellowCard.apiKey', '');
    const secretKey = this.configService.get<string>(
      'yellowCard.secretKey',
      '',
    );
    const startTime = Date.now();

    try {
      const path = '/business/rates';
      const timestamp = Date.now();
      const message = `${timestamp}GET${path}`;
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('hex');

      const response = await fetch(
        `${apiUrl}${path}?sourceCurrency=NGN&destinationCurrency=USDC&amount=100`,
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

      const latency = Date.now() - startTime;

      if (response.ok) {
        const result = this.getStatus(key, true, {
          latency: `${latency}ms`,
          url: apiUrl,
          status: response.status,
        });
        return result;
      }

      // 401/403 means API is reachable but auth failed - still indicates service is up
      if (response.status === 401 || response.status === 403) {
        const result = this.getStatus(key, true, {
          latency: `${latency}ms`,
          url: apiUrl,
          status: response.status,
          note: 'API reachable but authentication required',
        });
        return result;
      }

      throw new Error(`Yellow Card API returned status ${response.status}`);
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HealthCheckError(
        'Yellow Card API check failed',
        this.getStatus(key, false, {
          latency: `${latency}ms`,
          url: apiUrl,
          error: errorMessage,
        }),
      );
    }
  }
}
