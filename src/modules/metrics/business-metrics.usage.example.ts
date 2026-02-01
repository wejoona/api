/**
 * Business Metrics Usage Examples
 *
 * This file demonstrates how to integrate BusinessMetricsService
 * into various parts of your application to track business KPIs.
 */

import { Injectable } from '@nestjs/common';
import { BusinessMetricsService } from './business-metrics.service';

// ==================== EXAMPLE 1: Transaction Use Case ====================

@Injectable()
export class CreateTransferUseCase {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    // ... other dependencies
  ) {}

  async execute(dto: CreateTransferDto, _userId: string): Promise<Transfer> {
    const startTime = Date.now();

    try {
      // Create and process transfer
      const transfer = await this.processTransfer(dto);

      // Record transaction for TPM calculation
      this.businessMetrics.recordTransactionForRate(
        'transfer',
        transfer.status,
        'USD',
      );

      // Record transaction value for average calculation
      this.businessMetrics.recordTransactionValue(
        transfer.amount,
        'transfer',
        'USD',
      );

      // Record revenue from fees
      if (transfer.fee > 0) {
        this.businessMetrics.recordRevenue(transfer.fee, 'transfer_fee', 'USD');
      }

      const _duration = Date.now() - startTime;

      // Update success rate metrics
      this.updateTransactionSuccessMetrics('transfer');

      return transfer;
    } catch (error) {
      // Record failed transaction
      this.businessMetrics.recordFailedTransaction('transfer', error.message);

      throw error;
    }
  }

  private async updateTransactionSuccessMetrics(type: string) {
    // Fetch stats from database or cache
    const stats = await this.getTransactionStats(type);

    this.businessMetrics.updateTransactionSuccessRate(
      stats.successCount,
      stats.totalCount,
      type,
    );

    this.businessMetrics.updateAverageTransactionValue(
      stats.totalValue,
      stats.totalCount,
      type,
      'USD',
    );
  }

  private async getTransactionStats(_type: string) {
    // Implement based on your data layer
    return {
      successCount: 1000,
      totalCount: 1050,
      totalValue: 50000,
    };
  }

  private async processTransfer(_dto: CreateTransferDto) {
    // Implementation
    return {} as any;
  }
}

// ==================== EXAMPLE 2: KYC Use Case ====================

@Injectable()
export class ProcessKycSubmissionUseCase {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    // ... other dependencies
  ) {}

  async execute(dto: KycSubmissionDto, _userId: string): Promise<void> {
    const startTime = Date.now();

    // Record KYC submission start
    this.businessMetrics.recordKycSubmission(dto.level, dto.country);

    try {
      // Process KYC verification
      const result = await this.verifyKyc(dto);

      const duration = Date.now() - startTime;

      if (result.status === 'approved') {
        // Record successful completion
        this.businessMetrics.recordKycCompletion(
          dto.level,
          dto.country,
          duration,
        );

        // Record user activation
        this.businessMetrics.recordUserActivation(
          'mobile',
          dto.country,
          'kyc_completed',
        );
      } else {
        // Record rejection
        this.businessMetrics.recordKycRejection(
          dto.level,
          dto.country,
          result.reason,
          duration,
        );
      }

      // Update completion rate
      await this.updateKycCompletionRate(dto.level);
    } catch (error) {
      const duration = Date.now() - startTime;

      this.businessMetrics.recordKycRejection(
        dto.level,
        dto.country,
        'system_error',
        duration,
      );

      throw error;
    }
  }

  private async updateKycCompletionRate(level: string) {
    const stats = await this.getKycStats(level);

    this.businessMetrics.updateKycCompletionRate(
      stats.completions,
      stats.submissions,
      level,
    );
  }

  private async getKycStats(_level: string) {
    return { completions: 850, submissions: 1000 };
  }

  private async verifyKyc(_dto: KycSubmissionDto) {
    return { status: 'approved', reason: '' } as any;
  }
}

// ==================== EXAMPLE 3: User Registration Use Case ====================

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    // ... other dependencies
  ) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    try {
      // Create user account
      const user = await this.createUser(dto);

      // Record registration
      this.businessMetrics.recordUserRegistration(
        dto.channel || 'mobile',
        dto.country,
        'active',
      );

      // Update hourly registration rate (can be done via scheduled job)
      await this.updateRegistrationMetrics(dto.channel || 'mobile');

      return user;
    } catch (error) {
      // Record failed registration
      this.businessMetrics.recordUserRegistration(
        dto.channel || 'mobile',
        dto.country,
        'failed',
      );

      throw error;
    }
  }

  private async updateRegistrationMetrics(channel: string) {
    const hourlyCount = await this.getRegistrationsLastHour(channel);

    this.businessMetrics.updateRegistrationsPerHour(hourlyCount, channel);

    // Update activation rate
    const stats = await this.getActivationStats(channel);
    this.businessMetrics.updateUserActivationRate(
      stats.activations,
      stats.registrations,
      channel,
    );
  }

  private async getRegistrationsLastHour(_channel: string) {
    return 45; // Implementation
  }

  private async getActivationStats(_channel: string) {
    return { activations: 320, registrations: 400 };
  }

  private async createUser(_dto: RegisterUserDto) {
    return {} as any;
  }
}

// ==================== EXAMPLE 4: API Controller with Metrics ====================

import { Controller, Post, Body } from '@nestjs/common';

@Controller('transfers')
export class TransferController {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    private readonly createTransferUseCase: CreateTransferUseCase,
  ) {}

  @Post()
  async createTransfer(@Body() dto: CreateTransferDto) {
    const startTime = Date.now();
    const endpoint = '/api/v1/transfers';
    const method = 'POST';

    try {
      const result = await this.createTransferUseCase.execute(dto, 'user-id');

      const duration = Date.now() - startTime;

      // Record API latency
      this.businessMetrics.recordApiLatency(endpoint, method, 200, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const statusCode = this.getStatusCode(error);

      // Record API error latency
      this.businessMetrics.recordApiLatency(
        endpoint,
        method,
        statusCode,
        duration,
      );

      throw error;
    }
  }

  private getStatusCode(error: any): number {
    return error.status || 500;
  }
}

// ==================== EXAMPLE 5: Scheduled Job for Aggregated Metrics ====================

import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MetricsAggregationService {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    // Database repositories
  ) {}

  /**
   * Update API success rates every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateApiSuccessRates() {
    const endpoints = [
      '/api/v1/transfers',
      '/api/v1/deposits',
      '/api/v1/withdrawals',
      '/api/v1/kyc',
      '/api/v1/auth/login',
    ];

    for (const endpoint of endpoints) {
      const stats = await this.getEndpointStats(endpoint);

      this.businessMetrics.updateApiSuccessRate(
        stats.successCount,
        stats.totalCount,
        endpoint,
      );
    }
  }

  /**
   * Update active wallets count hourly
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateActiveWallets() {
    const last24h = await this.getActiveWalletsCount('24h');
    const last7d = await this.getActiveWalletsCount('7d');
    const last30d = await this.getActiveWalletsCount('30d');

    this.businessMetrics.updateActiveWallets(last24h, '24h');
    this.businessMetrics.updateActiveWallets(last7d, '7d');
    this.businessMetrics.updateActiveWallets(last30d, '30d');
  }

  /**
   * Update average transaction values every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateTransactionAverages() {
    const types = ['transfer', 'deposit', 'withdrawal', 'payment'];

    for (const type of types) {
      const stats = await this.getTransactionStats(type);

      this.businessMetrics.updateAverageTransactionValue(
        stats.totalValue,
        stats.totalCount,
        type,
        'USD',
      );

      this.businessMetrics.updateTransactionSuccessRate(
        stats.successCount,
        stats.totalCount,
        type,
      );
    }
  }

  /**
   * Calculate customer lifetime value daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async calculateCustomerLifetimeValue() {
    const cohorts = await this.getUserCohorts();

    for (const cohort of cohorts) {
      const users = await this.getUsersInCohort(cohort.id);

      for (const user of users) {
        const clv = await this.calculateCLV(user.id);

        this.businessMetrics.recordCustomerLifetimeValue(
          clv,
          cohort.name,
          user.country,
        );
      }
    }
  }

  private async getEndpointStats(_endpoint: string) {
    return { successCount: 9500, totalCount: 10000 };
  }

  private async getActiveWalletsCount(_timeframe: string) {
    return 1250; // Implementation
  }

  private async getTransactionStats(_type: string) {
    return {
      totalValue: 100000,
      totalCount: 2000,
      successCount: 1950,
    };
  }

  private async getUserCohorts() {
    return [{ id: '1', name: '2024-Q1' }];
  }

  private async getUsersInCohort(_cohortId: string) {
    return [{ id: 'user-1', country: 'CI' }];
  }

  private async calculateCLV(_userId: string) {
    return 5000; // Implementation
  }
}

// ==================== EXAMPLE 6: Mobile Money Provider Tracking ====================

@Injectable()
export class MobileMoneyDepositUseCase {
  constructor(
    private readonly businessMetrics: BusinessMetricsService,
    // ... other dependencies
  ) {}

  async execute(dto: MobileMoneyDepositDto): Promise<Deposit> {
    // Track provider usage
    this.businessMetrics.recordMobileMoneyProviderUsage(
      dto.provider, // 'orange_money' | 'mtn_momo' | 'wave'
      'deposit',
      dto.country,
    );

    // Process deposit
    const deposit = await this.processDeposit(dto);

    // Record transaction metrics
    this.businessMetrics.recordTransactionForRate(
      'deposit',
      deposit.status,
      'USD',
    );

    this.businessMetrics.recordTransactionValue(
      deposit.amount,
      'deposit',
      'USD',
    );

    return deposit;
  }

  private async processDeposit(_dto: MobileMoneyDepositDto) {
    return {} as any;
  }
}

// ==================== Type Definitions (for examples) ====================

interface CreateTransferDto {
  amount: number;
  recipientId: string;
}

interface Transfer {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  fee: number;
}

interface KycSubmissionDto {
  level: 'tier1' | 'tier2' | 'tier3';
  country: string;
}

interface RegisterUserDto {
  email: string;
  phone: string;
  country: string;
  channel?: 'mobile' | 'web' | 'api';
}

interface User {
  id: string;
  email: string;
}

interface MobileMoneyDepositDto {
  provider: 'orange_money' | 'mtn_momo' | 'wave';
  amount: number;
  country: string;
}

interface Deposit {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
}
