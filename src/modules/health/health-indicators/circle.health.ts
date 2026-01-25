import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CircleHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const circleApiUrl = this.configService.get<string>('circle.apiUrl', 'https://api.circle.com');
    const startTime = Date.now();

    try {
      // Circle doesn't have a dedicated health endpoint, so we check the base API
      const response = await fetch(`${circleApiUrl}/v1/ping`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - startTime;

      if (response.ok || response.status === 404) {
        // 404 is okay - means API is reachable even if /ping doesn't exist
        const result = this.getStatus(key, true, {
          latency: `${latency}ms`,
          url: circleApiUrl,
          status: response.status,
        });
        return result;
      }

      throw new Error(`Circle API returned status ${response.status}`);
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      throw new HealthCheckError(
        'Circle API check failed',
        this.getStatus(key, false, {
          latency: `${latency}ms`,
          url: circleApiUrl,
          error: errorMessage,
        }),
      );
    }
  }
}
