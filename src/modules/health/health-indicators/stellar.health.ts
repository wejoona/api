import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StellarHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const horizonUrl = this.configService.get<string>(
      'STELLAR_HORIZON_URL',
      'https://horizon.stellar.org',
    );

    try {
      const start = Date.now();
      const response = await fetch(`${horizonUrl}/`, {
        signal: AbortSignal.timeout(5000),
      });
      const latency = `${Date.now() - start}ms`;

      if (!response.ok) {
        throw new HealthCheckError(
          'Stellar Horizon returned non-OK status',
          this.getStatus(key, false, { statusCode: response.status }),
        );
      }

      return this.getStatus(key, true, { latency });
    } catch (error) {
      if (error instanceof HealthCheckError) throw error;
      throw new HealthCheckError(
        'Stellar Horizon unreachable',
        this.getStatus(key, false, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
