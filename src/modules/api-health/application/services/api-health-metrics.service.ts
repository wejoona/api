import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ApiProvider,
  ApiHealthStatus,
} from '../../domain/entities/api-health-metric.entity';
import { HealthCollector } from '../../domain/interfaces/health-collector.interface';

@Injectable()
export class ApiHealthMetricsService {
  private readonly logger = new Logger(ApiHealthMetricsService.name);

  constructor(
    @InjectMetric('api_health_availability')
    private readonly availabilityGauge: Gauge<string>,

    @InjectMetric('api_health_latency_seconds')
    private readonly latencyHistogram: Histogram<string>,

    @InjectMetric('api_health_checks_total')
    private readonly checksCounter: Counter<string>,

    @InjectMetric('api_health_errors_total')
    private readonly errorsCounter: Counter<string>,

    @InjectMetric('api_health_status')
    private readonly statusGauge: Gauge<string>,

    @InjectMetric('api_twilio_delivery_rate')
    private readonly twilioDeliveryRate: Gauge<string>,

    @InjectMetric('api_twilio_messages_sent_total')
    private readonly twilioMessagesSent: Counter<string>,

    @InjectMetric('api_twilio_messages_failed_total')
    private readonly twilioMessagesFailed: Counter<string>,

    private readonly collectors: HealthCollector[],
  ) {}

  /**
   * Run health checks every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async runScheduledHealthChecks(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    this.logger.debug('Running scheduled API health checks');
    await this.collectAllMetrics();
  }

  /**
   * Collect metrics from all health collectors
   */
  async collectAllMetrics(): Promise<void> {
    const results = await Promise.allSettled(
      this.collectors.map((collector) =>
        this.collectMetricsForProvider(collector),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(`${failed.length} health collectors failed to complete`);
    }
  }

  /**
   * Collect metrics for a specific provider
   */
  private async collectMetricsForProvider(
    collector: HealthCollector,
  ): Promise<void> {
    const provider = collector.getProvider();

    try {
      const result = await collector.checkHealth();

      // Record health check
      this.checksCounter.inc({
        provider,
        endpoint: result.endpoint,
        status: result.statusCode?.toString() || 'unknown',
      });

      // Record availability (1 = available, 0 = unavailable)
      this.availabilityGauge.set(
        { provider, endpoint: result.endpoint },
        result.available ? 1 : 0,
      );

      // Record latency
      this.latencyHistogram.observe(
        { provider, endpoint: result.endpoint },
        result.latencyMs / 1000,
      );

      // Determine health status
      let status: ApiHealthStatus;
      if (!result.available) {
        status = ApiHealthStatus.DOWN;
      } else if (result.latencyMs > 2000) {
        status = ApiHealthStatus.DEGRADED;
      } else {
        status = ApiHealthStatus.HEALTHY;
      }

      // Record status as numeric value for Grafana
      // 2 = healthy, 1 = degraded, 0 = down
      const statusValue =
        status === ApiHealthStatus.HEALTHY
          ? 2
          : status === ApiHealthStatus.DEGRADED
            ? 1
            : 0;

      this.statusGauge.set(
        { provider, endpoint: result.endpoint },
        statusValue,
      );

      // Record errors if not available
      if (!result.available) {
        this.errorsCounter.inc({
          provider,
          endpoint: result.endpoint,
          error: result.errorMessage || 'unavailable',
        });
      }

      this.logger.debug(
        `Health check for ${provider}: ${status} (${result.latencyMs}ms)`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to collect metrics for ${provider}: ${errorMessage}`,
      );

      this.errorsCounter.inc({
        provider,
        endpoint: 'unknown',
        error: errorMessage,
      });

      // Mark as down
      this.statusGauge.set({ provider, endpoint: 'unknown' }, 0);
      this.availabilityGauge.set({ provider, endpoint: 'unknown' }, 0);
    }
  }

  /**
   * Record Twilio message delivery metrics
   */
  recordTwilioMessage(
    status: 'delivered' | 'failed' | 'sent' | 'undelivered',
    errorCode?: string,
  ): void {
    const labels = { status, error_code: errorCode || 'none' };

    if (status === 'delivered' || status === 'sent') {
      this.twilioMessagesSent.inc(labels);
    } else {
      this.twilioMessagesFailed.inc(labels);
    }

    // Update delivery rate (calculated by Prometheus)
    this.updateTwilioDeliveryRate();
  }

  /**
   * Update Twilio delivery rate based on sent/failed counters
   */
  private updateTwilioDeliveryRate(): void {
    // This will be calculated in Grafana using:
    // rate(api_twilio_messages_sent_total[5m]) / (rate(api_twilio_messages_sent_total[5m]) + rate(api_twilio_messages_failed_total[5m]))
    // We'll just set a gauge for real-time tracking
    this.twilioDeliveryRate.set(1); // Placeholder - actual rate calculated by Prometheus
  }

  /**
   * Manually trigger health check for a specific provider
   */
  async checkProviderHealth(provider: ApiProvider): Promise<void> {
    const collector = this.collectors.find((c) => c.getProvider() === provider);

    if (!collector) {
      throw new NotFoundException(`No health collector found for provider: ${provider}`);
    }

    await this.collectMetricsForProvider(collector);
  }

  /**
   * Get current health status for all providers
   */
  async getCurrentHealth(): Promise<
    Record<
      string,
      {
        provider: ApiProvider;
        endpoint: string;
        available: boolean;
        latencyMs: number;
      }
    >
  > {
    const results = await Promise.all(
      this.collectors.map(async (collector) => {
        const result = await collector.checkHealth();
        return {
          provider: collector.getProvider(),
          ...result,
        };
      }),
    );

    return results.reduce(
      (acc, result) => {
        acc[result.provider] = result;
        return acc;
      },
      {} as Record<string, any>,
    );
  }
}
