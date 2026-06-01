import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
  makeSummaryProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { BusinessMetricsService } from './business-metrics.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ...(process.env.NODE_ENV === 'test' ? [] : [ScheduleModule.forRoot()]),
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
    BusinessMetricsService,
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

    // ==================== BUSINESS KPI METRICS ====================

    // Transactions Per Minute (TPM)
    makeGaugeProvider({
      name: 'business_transactions_per_minute',
      help: 'Number of transactions in the last minute (real-time TPM)',
      labelNames: [],
    }),
    makeCounterProvider({
      name: 'business_transactions_rate',
      help: 'Transaction rate counter for TPM calculation',
      labelNames: ['type', 'status', 'currency'],
    }),

    // Average Transaction Value
    makeSummaryProvider({
      name: 'business_transaction_value_summary',
      help: 'Summary of transaction values (percentiles)',
      labelNames: ['type', 'currency'],
      percentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
    }),
    makeCounterProvider({
      name: 'business_transaction_value_total',
      help: 'Total transaction value for average calculation',
      labelNames: ['type', 'currency'],
    }),
    makeCounterProvider({
      name: 'business_transaction_count_total',
      help: 'Total transaction count for average calculation',
      labelNames: ['type', 'currency'],
    }),
    makeGaugeProvider({
      name: 'business_avg_transaction_value',
      help: 'Average transaction value in USD',
      labelNames: ['type', 'currency'],
    }),

    // KYC Completion Rate
    makeCounterProvider({
      name: 'business_kyc_submissions_total',
      help: 'Total KYC submissions started',
      labelNames: ['level', 'country'],
    }),
    makeCounterProvider({
      name: 'business_kyc_completions_total',
      help: 'Total successful KYC completions',
      labelNames: ['level', 'country'],
    }),
    makeCounterProvider({
      name: 'business_kyc_rejections_total',
      help: 'Total KYC rejections',
      labelNames: ['level', 'country', 'reason'],
    }),
    makeGaugeProvider({
      name: 'business_kyc_completion_rate',
      help: 'KYC completion rate percentage',
      labelNames: ['level'],
    }),
    makeHistogramProvider({
      name: 'business_kyc_processing_duration_seconds',
      help: 'KYC processing duration in seconds',
      labelNames: ['level', 'country', 'status'],
      buckets: [10, 30, 60, 300, 600, 1800, 3600, 7200], // 10s to 2 hours
    }),

    // User Registration Rate
    makeCounterProvider({
      name: 'business_user_registrations_rate',
      help: 'User registration rate counter',
      labelNames: ['channel', 'country', 'status'],
    }),
    makeGaugeProvider({
      name: 'business_registrations_per_hour',
      help: 'Number of registrations per hour',
      labelNames: ['channel'],
    }),
    makeCounterProvider({
      name: 'business_user_activations_total',
      help: 'Total user activations',
      labelNames: ['channel', 'country', 'activation_type'],
    }),
    makeGaugeProvider({
      name: 'business_user_activation_rate',
      help: 'User activation rate percentage',
      labelNames: ['channel'],
    }),

    // API Latency by Endpoint
    makeHistogramProvider({
      name: 'business_api_latency_by_endpoint',
      help: 'API latency by endpoint in seconds',
      labelNames: ['endpoint', 'method', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    makeGaugeProvider({
      name: 'business_api_success_rate',
      help: 'API success rate percentage by endpoint',
      labelNames: ['endpoint'],
    }),
    makeCounterProvider({
      name: 'business_api_requests_by_endpoint',
      help: 'Total API requests by endpoint',
      labelNames: ['endpoint', 'method', 'status'],
    }),
    makeCounterProvider({
      name: 'business_api_errors_by_endpoint',
      help: 'Total API errors by endpoint',
      labelNames: ['endpoint', 'method', 'status'],
    }),

    // Additional Business KPIs
    makeCounterProvider({
      name: 'business_revenue_total_usd',
      help: 'Total revenue in USD',
      labelNames: ['source', 'currency'],
    }),
    makeGaugeProvider({
      name: 'business_active_wallets_gauge',
      help: 'Number of active wallets by timeframe',
      labelNames: ['timeframe'],
    }),
    makeCounterProvider({
      name: 'business_failed_transactions_rate',
      help: 'Failed transactions rate counter',
      labelNames: ['type', 'reason'],
    }),
    makeGaugeProvider({
      name: 'business_transaction_success_rate',
      help: 'Transaction success rate (0-1)',
      labelNames: ['type'],
    }),
    makeCounterProvider({
      name: 'business_mobile_money_provider_usage',
      help: 'Mobile money provider usage counter',
      labelNames: ['provider', 'operation', 'country'],
    }),
    makeHistogramProvider({
      name: 'business_customer_lifetime_value',
      help: 'Customer lifetime value in USD',
      labelNames: ['cohort', 'country'],
      buckets: [10, 50, 100, 500, 1000, 5000, 10000, 50000],
    }),
  ],
  exports: [MetricsService, BusinessMetricsService],
})
export class MetricsModule {}
