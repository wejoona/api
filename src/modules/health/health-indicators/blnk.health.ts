import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlnkHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const blnkUrl = this.configService.get<string>(
      'blnk.url',
      'http://localhost:5001',
    );
    const startTime = Date.now();

    try {
      const response = await fetch(`${blnkUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const result = this.getStatus(key, true, {
          latency: `${latency}ms`,
          status: response.status,
        });
        return result;
      }

      throw new Error(`Blnk API returned status ${response.status}`);
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HealthCheckError(
        'Blnk API check failed',
        this.getStatus(key, false, {
          latency: `${latency}ms`,
          error: errorMessage,
        }),
      );
    }
  }
}
