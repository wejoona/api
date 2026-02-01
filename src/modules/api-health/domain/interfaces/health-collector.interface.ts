import { ApiProvider } from '../entities/api-health-metric.entity';

export interface HealthCheckResult {
  provider: ApiProvider;
  endpoint: string;
  available: boolean;
  latencyMs: number;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface HealthCollector {
  /**
   * Check if the API is healthy
   */
  checkHealth(): Promise<HealthCheckResult>;

  /**
   * Get the provider name
   */
  getProvider(): ApiProvider;
}
