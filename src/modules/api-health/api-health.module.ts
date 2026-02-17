import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { ApiHealthController } from './application/controllers/api-health.controller';
import { ApiHealthMetricsService } from './application/services/api-health-metrics.service';
import {
  CircleHealthCollector,
  YellowCardHealthCollector,
  TwilioHealthCollector,
} from './infrastructure/collectors';

// Yellow Card collectors are conditionally included based on YELLOW_CARD_ENABLED env var
const yellowCardEnabled = process.env.YELLOW_CARD_ENABLED === 'true';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule],
  controllers: [ApiHealthController],
  providers: [
    // Health Collectors
    CircleHealthCollector,
    ...(yellowCardEnabled ? [YellowCardHealthCollector] : []),
    TwilioHealthCollector,

    // Inject collectors into service
    {
      provide: 'HEALTH_COLLECTORS',
      useFactory: (
        circle: CircleHealthCollector,
        twilio: TwilioHealthCollector,
        ...optional: any[]
      ) => {
        const collectors = [circle, twilio];
        if (optional.length > 0) collectors.push(...optional);
        return collectors;
      },
      inject: [
        CircleHealthCollector,
        TwilioHealthCollector,
        ...(yellowCardEnabled ? [YellowCardHealthCollector] : []),
      ],
    },

    // Metrics Service
    {
      provide: ApiHealthMetricsService,
      useFactory: (
        availabilityGauge,
        latencyHistogram,
        checksCounter,
        errorsCounter,
        statusGauge,
        twilioDeliveryRate,
        twilioMessagesSent,
        twilioMessagesFailed,
        collectors,
      ) => {
        return new ApiHealthMetricsService(
          availabilityGauge,
          latencyHistogram,
          checksCounter,
          errorsCounter,
          statusGauge,
          twilioDeliveryRate,
          twilioMessagesSent,
          twilioMessagesFailed,
          collectors,
        );
      },
      inject: [
        'PROM_METRIC_API_HEALTH_AVAILABILITY',
        'PROM_METRIC_API_HEALTH_LATENCY_SECONDS',
        'PROM_METRIC_API_HEALTH_CHECKS_TOTAL',
        'PROM_METRIC_API_HEALTH_ERRORS_TOTAL',
        'PROM_METRIC_API_HEALTH_STATUS',
        'PROM_METRIC_API_TWILIO_DELIVERY_RATE',
        'PROM_METRIC_API_TWILIO_MESSAGES_SENT_TOTAL',
        'PROM_METRIC_API_TWILIO_MESSAGES_FAILED_TOTAL',
        'HEALTH_COLLECTORS',
      ],
    },

    // Prometheus Metrics
    makeGaugeProvider({
      name: 'api_health_availability',
      help: 'API availability status (1 = available, 0 = unavailable)',
      labelNames: ['provider', 'endpoint'],
    }),

    makeHistogramProvider({
      name: 'api_health_latency_seconds',
      help: 'API health check latency in seconds',
      labelNames: ['provider', 'endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),

    makeCounterProvider({
      name: 'api_health_checks_total',
      help: 'Total number of API health checks performed',
      labelNames: ['provider', 'endpoint', 'status'],
    }),

    makeCounterProvider({
      name: 'api_health_errors_total',
      help: 'Total number of API health check errors',
      labelNames: ['provider', 'endpoint', 'error'],
    }),

    makeGaugeProvider({
      name: 'api_health_status',
      help: 'API health status (2 = healthy, 1 = degraded, 0 = down)',
      labelNames: ['provider', 'endpoint'],
    }),

    // Twilio-specific metrics
    makeGaugeProvider({
      name: 'api_twilio_delivery_rate',
      help: 'Twilio message delivery rate (0-1)',
      labelNames: ['status'],
    }),

    makeCounterProvider({
      name: 'api_twilio_messages_sent_total',
      help: 'Total Twilio messages sent successfully',
      labelNames: ['status', 'error_code'],
    }),

    makeCounterProvider({
      name: 'api_twilio_messages_failed_total',
      help: 'Total Twilio messages that failed to send',
      labelNames: ['status', 'error_code'],
    }),
  ],
  exports: [ApiHealthMetricsService],
})
export class ApiHealthModule {}
