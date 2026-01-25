import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  Summary,
} from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    // HTTP Metrics
    @InjectMetric('http_request_duration_seconds')
    public httpRequestDuration: Histogram<string>,

    @InjectMetric('http_requests_total')
    public httpRequestsTotal: Counter<string>,

    @InjectMetric('http_request_errors_total')
    public httpRequestErrorsTotal: Counter<string>,

    // User Metrics
    @InjectMetric('active_users_gauge')
    public activeUsersGauge: Gauge<string>,

    @InjectMetric('user_registrations_total')
    public userRegistrationsTotal: Counter<string>,

    // Transaction Metrics
    @InjectMetric('transactions_total')
    public transactionsTotal: Counter<string>,

    @InjectMetric('transaction_amount_usd')
    public transactionAmountUsd: Histogram<string>,

    @InjectMetric('transaction_duration_seconds')
    public transactionDuration: Histogram<string>,

    // External API Metrics
    @InjectMetric('external_api_latency_seconds')
    public externalApiLatency: Histogram<string>,

    @InjectMetric('external_api_calls_total')
    public externalApiCallsTotal: Counter<string>,

    @InjectMetric('external_api_errors_total')
    public externalApiErrorsTotal: Counter<string>,

    // Cache Metrics
    @InjectMetric('cache_hits_total')
    public cacheHitsTotal: Counter<string>,

    @InjectMetric('cache_misses_total')
    public cacheMissesTotal: Counter<string>,

    @InjectMetric('cache_operation_duration_seconds')
    public cacheOperationDuration: Histogram<string>,

    // Database Metrics
    @InjectMetric('db_query_duration_seconds')
    public dbQueryDuration: Histogram<string>,

    @InjectMetric('db_queries_total')
    public dbQueriesTotal: Counter<string>,

    @InjectMetric('db_errors_total')
    public dbErrorsTotal: Counter<string>,

    @InjectMetric('db_connection_pool_size')
    public dbConnectionPoolSize: Gauge<string>,

    // Wallet Metrics
    @InjectMetric('wallet_balance_usd')
    public walletBalanceUsd: Gauge<string>,

    @InjectMetric('pending_transactions_gauge')
    public pendingTransactionsGauge: Gauge<string>,

    // Business Metrics
    @InjectMetric('kyc_verifications_total')
    public kycVerificationsTotal: Counter<string>,

    @InjectMetric('webhook_deliveries_total')
    public webhookDeliveriesTotal: Counter<string>,

    @InjectMetric('webhook_failures_total')
    public webhookFailuresTotal: Counter<string>,

    // System Metrics
    @InjectMetric('nodejs_heap_size_total_bytes')
    public heapSizeTotal: Gauge<string>,

    @InjectMetric('nodejs_heap_size_used_bytes')
    public heapSizeUsed: Gauge<string>,
  ) {}

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ): void {
    const labels = { method, path, status: statusCode.toString() };

    this.httpRequestDuration.observe(labels, duration / 1000);
    this.httpRequestsTotal.inc(labels);

    if (statusCode >= 400) {
      this.httpRequestErrorsTotal.inc({ method, path, status: statusCode.toString() });
    }
  }

  /**
   * Record transaction metrics
   */
  recordTransaction(
    type: string,
    status: string,
    amount: number,
    duration: number,
  ): void {
    this.transactionsTotal.inc({ type, status });
    this.transactionAmountUsd.observe({ type, status }, amount);
    this.transactionDuration.observe({ type, status }, duration / 1000);
  }

  /**
   * Record external API call metrics
   */
  recordExternalApiCall(
    provider: string,
    endpoint: string,
    statusCode: number,
    duration: number,
  ): void {
    const labels = { provider, endpoint, status: statusCode.toString() };

    this.externalApiLatency.observe(labels, duration / 1000);
    this.externalApiCallsTotal.inc(labels);

    if (statusCode >= 400) {
      this.externalApiErrorsTotal.inc({ provider, endpoint, status: statusCode.toString() });
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(operation: string, key: string): void {
    this.cacheHitsTotal.inc({ operation, key });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(operation: string, key: string): void {
    this.cacheMissesTotal.inc({ operation, key });
  }

  /**
   * Record cache operation duration
   */
  recordCacheOperation(operation: string, duration: number): void {
    this.cacheOperationDuration.observe({ operation }, duration / 1000);
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(operation: string, table: string, duration: number, error = false): void {
    const labels = { operation, table };

    this.dbQueryDuration.observe(labels, duration / 1000);
    this.dbQueriesTotal.inc(labels);

    if (error) {
      this.dbErrorsTotal.inc(labels);
    }
  }

  /**
   * Update active users gauge
   */
  updateActiveUsers(count: number): void {
    this.activeUsersGauge.set(count);
  }

  /**
   * Record user registration
   */
  recordUserRegistration(method: string, status: string): void {
    this.userRegistrationsTotal.inc({ method, status });
  }

  /**
   * Update wallet balance
   */
  updateWalletBalance(userId: string, balance: number): void {
    this.walletBalanceUsd.set({ user_id: userId }, balance);
  }

  /**
   * Update pending transactions count
   */
  updatePendingTransactions(count: number): void {
    this.pendingTransactionsGauge.set(count);
  }

  /**
   * Record KYC verification
   */
  recordKycVerification(status: string, level: string): void {
    this.kycVerificationsTotal.inc({ status, level });
  }

  /**
   * Record webhook delivery
   */
  recordWebhookDelivery(event: string, status: string): void {
    this.webhookDeliveriesTotal.inc({ event, status });
  }

  /**
   * Record webhook failure
   */
  recordWebhookFailure(event: string, reason: string): void {
    this.webhookFailuresTotal.inc({ event, reason });
  }

  /**
   * Update database connection pool size
   */
  updateDbConnectionPoolSize(total: number, active: number, idle: number): void {
    this.dbConnectionPoolSize.set({ state: 'total' }, total);
    this.dbConnectionPoolSize.set({ state: 'active' }, active);
    this.dbConnectionPoolSize.set({ state: 'idle' }, idle);
  }

  /**
   * Update Node.js heap metrics
   */
  updateHeapMetrics(): void {
    const memUsage = process.memoryUsage();
    this.heapSizeTotal.set(memUsage.heapTotal);
    this.heapSizeUsed.set(memUsage.heapUsed);
  }
}
