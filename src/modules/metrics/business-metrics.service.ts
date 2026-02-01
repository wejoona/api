import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge, Summary } from 'prom-client';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Business KPI Metrics Service
 *
 * Tracks critical business metrics and KPIs for monitoring business health,
 * performance, and growth. These metrics are distinct from technical metrics
 * and focus on business outcomes.
 */
@Injectable()
export class BusinessMetricsService implements OnModuleInit {
  // In-memory cache for rate calculations (transactions per minute)
  private transactionTimestamps: number[] = [];
  private readonly TPM_WINDOW_MS = 60000; // 1 minute

  constructor(
    // Transactions Per Minute (TPM)
    @InjectMetric('business_transactions_per_minute')
    public transactionsPerMinute: Gauge<string>,

    @InjectMetric('business_transactions_rate')
    public transactionsRate: Counter<string>,

    // Average Transaction Value
    @InjectMetric('business_transaction_value_summary')
    public transactionValueSummary: Summary<string>,

    @InjectMetric('business_transaction_value_total')
    public transactionValueTotal: Counter<string>,

    @InjectMetric('business_transaction_count_total')
    public transactionCountTotal: Counter<string>,

    @InjectMetric('business_avg_transaction_value')
    public avgTransactionValue: Gauge<string>,

    // KYC Completion Rate
    @InjectMetric('business_kyc_submissions_total')
    public kycSubmissionsTotal: Counter<string>,

    @InjectMetric('business_kyc_completions_total')
    public kycCompletionsTotal: Counter<string>,

    @InjectMetric('business_kyc_rejections_total')
    public kycRejectionsTotal: Counter<string>,

    @InjectMetric('business_kyc_completion_rate')
    public kycCompletionRate: Gauge<string>,

    @InjectMetric('business_kyc_processing_duration_seconds')
    public kycProcessingDuration: Histogram<string>,

    // User Registration Rate
    @InjectMetric('business_user_registrations_rate')
    public userRegistrationsRate: Counter<string>,

    @InjectMetric('business_registrations_per_hour')
    public registrationsPerHour: Gauge<string>,

    @InjectMetric('business_user_activations_total')
    public userActivationsTotal: Counter<string>,

    @InjectMetric('business_user_activation_rate')
    public userActivationRate: Gauge<string>,

    // API Latency by Endpoint
    @InjectMetric('business_api_latency_by_endpoint')
    public apiLatencyByEndpoint: Histogram<string>,

    @InjectMetric('business_api_success_rate')
    public apiSuccessRate: Gauge<string>,

    @InjectMetric('business_api_requests_by_endpoint')
    public apiRequestsByEndpoint: Counter<string>,

    @InjectMetric('business_api_errors_by_endpoint')
    public apiErrorsByEndpoint: Counter<string>,

    // Additional Business KPIs
    @InjectMetric('business_revenue_total_usd')
    public revenueTotalUsd: Counter<string>,

    @InjectMetric('business_active_wallets_gauge')
    public activeWalletsGauge: Gauge<string>,

    @InjectMetric('business_failed_transactions_rate')
    public failedTransactionsRate: Counter<string>,

    @InjectMetric('business_transaction_success_rate')
    public transactionSuccessRate: Gauge<string>,

    @InjectMetric('business_mobile_money_provider_usage')
    public mobileMoneyProviderUsage: Counter<string>,

    @InjectMetric('business_customer_lifetime_value')
    public customerLifetimeValue: Histogram<string>,
  ) {}

  onModuleInit() {
    // Initialize gauges with zero values
    this.transactionsPerMinute.set(0);
    this.avgTransactionValue.set(0);
    this.kycCompletionRate.set(0);
    this.registrationsPerHour.set(0);
    this.userActivationRate.set(0);
    this.apiSuccessRate.set(1.0); // Start at 100%
    this.transactionSuccessRate.set(1.0); // Start at 100%
    this.activeWalletsGauge.set(0);
  }

  // ==================== TRANSACTIONS PER MINUTE ====================

  /**
   * Record a transaction for TPM calculation
   * Call this whenever a transaction is created
   */
  recordTransactionForRate(
    type: 'transfer' | 'deposit' | 'withdrawal' | 'payment',
    status: 'pending' | 'completed' | 'failed',
    currency: string = 'USD',
  ): void {
    const now = Date.now();

    // Add to rolling window
    this.transactionTimestamps.push(now);

    // Clean old timestamps outside the window
    this.cleanOldTransactionTimestamps();

    // Increment rate counter
    this.transactionsRate.inc({ type, status, currency });

    // Update TPM gauge
    this.updateTransactionsPerMinute();
  }

  /**
   * Update the TPM gauge based on transactions in the last minute
   */
  private updateTransactionsPerMinute(): void {
    const tpm = this.transactionTimestamps.length;
    this.transactionsPerMinute.set(tpm);
  }

  /**
   * Remove timestamps older than 1 minute
   */
  private cleanOldTransactionTimestamps(): void {
    const cutoff = Date.now() - this.TPM_WINDOW_MS;
    this.transactionTimestamps = this.transactionTimestamps.filter(
      (ts) => ts > cutoff,
    );
  }

  /**
   * Scheduled job to clean old timestamps and update TPM
   * Runs every 10 seconds
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  handleTransactionsPerMinuteUpdate() {
    this.cleanOldTransactionTimestamps();
    this.updateTransactionsPerMinute();
  }

  // ==================== AVERAGE TRANSACTION VALUE ====================

  /**
   * Record a transaction value
   * Updates both summary metrics and average calculation
   */
  recordTransactionValue(
    amount: number,
    type: 'transfer' | 'deposit' | 'withdrawal' | 'payment',
    currency: string = 'USD',
  ): void {
    const labels = { type, currency };

    // Record in summary (percentiles)
    this.transactionValueSummary.observe(labels, amount);

    // Track total value and count for average calculation
    this.transactionValueTotal.inc(labels, amount);
    this.transactionCountTotal.inc(labels);
  }

  /**
   * Calculate and update average transaction value
   * Call this periodically or after recording transactions
   */
  updateAverageTransactionValue(
    totalValue: number,
    totalCount: number,
    type: string,
    currency: string = 'USD',
  ): void {
    if (totalCount > 0) {
      const average = totalValue / totalCount;
      this.avgTransactionValue.set({ type, currency }, average);
    }
  }

  // ==================== KYC COMPLETION RATE ====================

  /**
   * Record KYC submission start
   */
  recordKycSubmission(
    level: 'tier1' | 'tier2' | 'tier3',
    country: string,
  ): void {
    this.kycSubmissionsTotal.inc({ level, country });
  }

  /**
   * Record successful KYC completion
   */
  recordKycCompletion(
    level: 'tier1' | 'tier2' | 'tier3',
    country: string,
    durationMs: number,
  ): void {
    this.kycCompletionsTotal.inc({ level, country });
    this.kycProcessingDuration.observe(
      { level, country, status: 'completed' },
      durationMs / 1000,
    );
  }

  /**
   * Record KYC rejection
   */
  recordKycRejection(
    level: 'tier1' | 'tier2' | 'tier3',
    country: string,
    reason: string,
    durationMs: number,
  ): void {
    this.kycRejectionsTotal.inc({ level, country, reason });
    this.kycProcessingDuration.observe(
      { level, country, status: 'rejected' },
      durationMs / 1000,
    );
  }

  /**
   * Update KYC completion rate (percentage)
   */
  updateKycCompletionRate(
    completions: number,
    submissions: number,
    level: string,
  ): void {
    if (submissions > 0) {
      const rate = (completions / submissions) * 100;
      this.kycCompletionRate.set({ level }, rate);
    }
  }

  // ==================== USER REGISTRATION RATE ====================

  /**
   * Record a new user registration
   */
  recordUserRegistration(
    channel: 'mobile' | 'web' | 'api',
    country: string,
    status: 'pending' | 'active' | 'failed' = 'pending',
  ): void {
    this.userRegistrationsRate.inc({ channel, country, status });
  }

  /**
   * Record user activation (first transaction or KYC completion)
   */
  recordUserActivation(
    channel: 'mobile' | 'web' | 'api',
    country: string,
    activationType: 'first_transaction' | 'kyc_completed',
  ): void {
    this.userActivationsTotal.inc({
      channel,
      country,
      activation_type: activationType,
    });
  }

  /**
   * Update registrations per hour
   */
  updateRegistrationsPerHour(count: number, channel: string): void {
    this.registrationsPerHour.set({ channel }, count);
  }

  /**
   * Update user activation rate (percentage)
   */
  updateUserActivationRate(
    activations: number,
    registrations: number,
    channel: string,
  ): void {
    if (registrations > 0) {
      const rate = (activations / registrations) * 100;
      this.userActivationRate.set({ channel }, rate);
    }
  }

  // ==================== API LATENCY BY ENDPOINT ====================

  /**
   * Record API request latency
   */
  recordApiLatency(
    endpoint: string,
    method: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const labels = {
      endpoint,
      method,
      status: statusCode.toString(),
    };

    // Record latency
    this.apiLatencyByEndpoint.observe(labels, durationMs / 1000);

    // Track requests
    this.apiRequestsByEndpoint.inc(labels);

    // Track errors
    if (statusCode >= 400) {
      this.apiErrorsByEndpoint.inc(labels);
    }
  }

  /**
   * Update API success rate (percentage)
   */
  updateApiSuccessRate(
    successCount: number,
    totalCount: number,
    endpoint: string,
  ): void {
    if (totalCount > 0) {
      const rate = (successCount / totalCount) * 100;
      this.apiSuccessRate.set({ endpoint }, rate);
    }
  }

  // ==================== ADDITIONAL BUSINESS METRICS ====================

  /**
   * Record revenue from transaction fees
   */
  recordRevenue(
    amount: number,
    source: 'transfer_fee' | 'deposit_fee' | 'withdrawal_fee' | 'fx_spread',
    currency: string = 'USD',
  ): void {
    this.revenueTotalUsd.inc({ source, currency }, amount);
  }

  /**
   * Update active wallets count
   */
  updateActiveWallets(
    count: number,
    timeframe: '24h' | '7d' | '30d' = '24h',
  ): void {
    this.activeWalletsGauge.set({ timeframe }, count);
  }

  /**
   * Record failed transaction for success rate calculation
   */
  recordFailedTransaction(
    type: 'transfer' | 'deposit' | 'withdrawal' | 'payment',
    reason: string,
  ): void {
    this.failedTransactionsRate.inc({ type, reason });
  }

  /**
   * Update transaction success rate (percentage)
   */
  updateTransactionSuccessRate(
    successCount: number,
    totalCount: number,
    type: string,
  ): void {
    if (totalCount > 0) {
      const rate = (successCount / totalCount) * 100;
      this.transactionSuccessRate.set({ type }, rate / 100); // Store as decimal (0-1)
    }
  }

  /**
   * Record mobile money provider usage
   */
  recordMobileMoneyProviderUsage(
    provider: 'orange_money' | 'mtn_momo' | 'wave',
    operation: 'deposit' | 'withdrawal',
    country: string,
  ): void {
    this.mobileMoneyProviderUsage.inc({ provider, operation, country });
  }

  /**
   * Record customer lifetime value
   */
  recordCustomerLifetimeValue(
    value: number,
    cohort: string,
    country: string,
  ): void {
    this.customerLifetimeValue.observe({ cohort, country }, value);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get current transactions per minute
   */
  getCurrentTPM(): number {
    return this.transactionTimestamps.length;
  }

  /**
   * Reset in-memory caches (useful for testing)
   */
  resetCaches(): void {
    this.transactionTimestamps = [];
  }
}
