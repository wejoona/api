import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'usdc_wallet_',
        },
      },
      defaultLabels: {
        app: 'usdc-wallet',
        environment: process.env.NODE_ENV || 'development',
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    // HTTP Metrics
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10],
    }),
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    makeCounterProvider({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'path', 'status'],
    }),
    // User Metrics
    makeGaugeProvider({
      name: 'active_users_gauge',
      help: 'Number of active users',
    }),
    makeCounterProvider({
      name: 'user_registrations_total',
      help: 'Total user registrations',
      labelNames: ['method', 'status'],
    }),
    // Transaction Metrics
    makeCounterProvider({
      name: 'transactions_total',
      help: 'Total number of transactions',
      labelNames: ['type', 'status'],
    }),
    makeHistogramProvider({
      name: 'transaction_amount_usd',
      help: 'Transaction amount in USD',
      labelNames: ['type', 'status'],
      buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000],
    }),
    makeHistogramProvider({
      name: 'transaction_duration_seconds',
      help: 'Transaction processing duration in seconds',
      labelNames: ['type', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),
    // External API Metrics
    makeHistogramProvider({
      name: 'external_api_latency_seconds',
      help: 'External API latency in seconds',
      labelNames: ['provider', 'endpoint', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    }),
    makeCounterProvider({
      name: 'external_api_calls_total',
      help: 'Total external API calls',
      labelNames: ['provider', 'endpoint', 'status'],
    }),
    makeCounterProvider({
      name: 'external_api_errors_total',
      help: 'Total external API errors',
      labelNames: ['provider', 'endpoint', 'status'],
    }),
    // Cache Metrics
    makeCounterProvider({
      name: 'cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['operation', 'key'],
    }),
    makeCounterProvider({
      name: 'cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['operation', 'key'],
    }),
    makeHistogramProvider({
      name: 'cache_operation_duration_seconds',
      help: 'Cache operation duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
    }),
    // Database Metrics
    makeHistogramProvider({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    }),
    makeCounterProvider({
      name: 'db_queries_total',
      help: 'Total database queries',
      labelNames: ['operation', 'table'],
    }),
    makeCounterProvider({
      name: 'db_errors_total',
      help: 'Total database errors',
      labelNames: ['operation', 'table'],
    }),
    makeGaugeProvider({
      name: 'db_connection_pool_size',
      help: 'Database connection pool size',
      labelNames: ['state'],
    }),
    // Wallet Metrics
    makeGaugeProvider({
      name: 'wallet_balance_usd',
      help: 'Wallet balance in USD',
      labelNames: ['user_id'],
    }),
    makeGaugeProvider({
      name: 'pending_transactions_gauge',
      help: 'Number of pending transactions',
    }),
    // Business Metrics
    makeCounterProvider({
      name: 'kyc_verifications_total',
      help: 'Total KYC verifications',
      labelNames: ['status', 'level'],
    }),
    makeCounterProvider({
      name: 'webhook_deliveries_total',
      help: 'Total webhook deliveries',
      labelNames: ['event', 'status'],
    }),
    makeCounterProvider({
      name: 'webhook_failures_total',
      help: 'Total webhook failures',
      labelNames: ['event', 'reason'],
    }),
    // System Metrics
    makeGaugeProvider({
      name: 'nodejs_heap_size_total_bytes',
      help: 'Total size of the heap in bytes',
    }),
    makeGaugeProvider({
      name: 'nodejs_heap_size_used_bytes',
      help: 'Used size of the heap in bytes',
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
