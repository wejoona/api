/**
 * Fee Types
 */
export enum FeeType {
  PLATFORM = 'platform',
  PROVIDER = 'provider',
  NETWORK = 'network',
}

/**
 * Fee Calculation Method
 */
export enum FeeCalculationMethod {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  TIERED = 'tiered',
  HYBRID = 'hybrid', // Fixed + Percentage
}

/**
 * Transaction Type for Fee Calculation
 */
export enum FeeTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER_INTERNAL = 'transfer_internal',
  TRANSFER_EXTERNAL = 'transfer_external',
  BILL_PAYMENT = 'bill_payment',
}

/**
 * Fee Tier
 */
export interface FeeTier {
  minAmount: bigint;
  maxAmount: bigint;
  percentage: number;
  fixedAmount: bigint;
}

/**
 * Provider Fee Configuration
 */
export interface ProviderFeeConfig {
  provider: string;
  transactionType: FeeTransactionType;
  calculationMethod: FeeCalculationMethod;
  percentage?: number;
  fixedAmount?: bigint;
  minFee?: bigint;
  maxFee?: bigint;
  tiers?: FeeTier[];
  currency: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

/**
 * Fee Schedule Value Object
 *
 * Represents the fee structure for calculating and verifying transaction fees.
 * Used during reconciliation to ensure fees match expected values.
 */
export class FeeSchedule {
  private readonly schedules: Map<string, ProviderFeeConfig[]> = new Map();
  private readonly USDC_PRECISION = 1_000_000; // 6 decimal places

  constructor(configs: ProviderFeeConfig[]) {
    for (const config of configs) {
      const key = this.buildKey(config.provider, config.transactionType);
      const existing = this.schedules.get(key) || [];
      existing.push(config);
      this.schedules.set(key, existing);
    }
  }

  /**
   * Calculate expected fee for a transaction
   */
  calculateFee(
    provider: string,
    transactionType: FeeTransactionType,
    amount: bigint,
    currency: string,
    transactionDate: Date = new Date(),
  ): bigint {
    const config = this.getActiveConfig(
      provider,
      transactionType,
      transactionDate,
    );
    if (!config) {
      return 0n;
    }

    if (config.currency !== currency) {
      // Currency mismatch - should not happen in production
      return 0n;
    }

    let fee = 0n;

    switch (config.calculationMethod) {
      case FeeCalculationMethod.PERCENTAGE:
        fee = this.calculatePercentageFee(amount, config.percentage || 0);
        break;

      case FeeCalculationMethod.FIXED:
        fee = config.fixedAmount || 0n;
        break;

      case FeeCalculationMethod.TIERED:
        fee = this.calculateTieredFee(amount, config.tiers || []);
        break;

      case FeeCalculationMethod.HYBRID:
        const percentFee = this.calculatePercentageFee(
          amount,
          config.percentage || 0,
        );
        fee = percentFee + (config.fixedAmount || 0n);
        break;

      default:
        fee = 0n;
    }

    // Apply min/max constraints
    if (config.minFee && fee < config.minFee) {
      fee = config.minFee;
    }
    if (config.maxFee && fee > config.maxFee) {
      fee = config.maxFee;
    }

    return fee;
  }

  /**
   * Verify if a fee matches expected calculation
   */
  verifyFee(
    provider: string,
    transactionType: FeeTransactionType,
    amount: bigint,
    actualFee: bigint,
    currency: string,
    transactionDate: Date = new Date(),
    tolerance: bigint = 100n, // Default tolerance: 0.0001 USDC
  ): { isValid: boolean; expectedFee: bigint; difference: bigint } {
    const expectedFee = this.calculateFee(
      provider,
      transactionType,
      amount,
      currency,
      transactionDate,
    );

    const difference =
      actualFee > expectedFee
        ? actualFee - expectedFee
        : expectedFee - actualFee;

    const isValid = difference <= tolerance;

    return {
      isValid,
      expectedFee,
      difference,
    };
  }

  /**
   * Get all providers in the schedule
   */
  getProviders(): string[] {
    const providers = new Set<string>();
    for (const key of this.schedules.keys()) {
      const [provider] = key.split(':');
      providers.add(provider);
    }
    return Array.from(providers);
  }

  /**
   * Get fee config for display/audit
   */
  getConfig(
    provider: string,
    transactionType: FeeTransactionType,
    date: Date = new Date(),
  ): ProviderFeeConfig | null {
    return this.getActiveConfig(provider, transactionType, date);
  }

  private buildKey(
    provider: string,
    transactionType: FeeTransactionType,
  ): string {
    return `${provider}:${transactionType}`;
  }

  private getActiveConfig(
    provider: string,
    transactionType: FeeTransactionType,
    date: Date,
  ): ProviderFeeConfig | null {
    const key = this.buildKey(provider, transactionType);
    const configs = this.schedules.get(key);

    if (!configs || configs.length === 0) {
      return null;
    }

    // Find config active at the given date
    const activeConfig = configs.find((config) => {
      const isAfterStart = date >= config.effectiveFrom;
      const isBeforeEnd = !config.effectiveTo || date <= config.effectiveTo;
      return isAfterStart && isBeforeEnd;
    });

    return activeConfig || null;
  }

  private calculatePercentageFee(amount: bigint, percentage: number): bigint {
    // Percentage is expressed as decimal (e.g., 0.015 for 1.5%)
    const percentageBigInt = BigInt(
      Math.round(percentage * this.USDC_PRECISION),
    );
    return (amount * percentageBigInt) / BigInt(this.USDC_PRECISION);
  }

  private calculateTieredFee(amount: bigint, tiers: FeeTier[]): bigint {
    // Sort tiers by minAmount
    const sortedTiers = [...tiers].sort((a, b) =>
      a.minAmount > b.minAmount ? 1 : -1,
    );

    for (const tier of sortedTiers) {
      if (amount >= tier.minAmount && amount <= tier.maxAmount) {
        if (tier.percentage > 0) {
          return (
            this.calculatePercentageFee(amount, tier.percentage) +
            tier.fixedAmount
          );
        }
        return tier.fixedAmount;
      }
    }

    // If no tier matches, use the last tier
    const lastTier = sortedTiers[sortedTiers.length - 1];
    if (lastTier && lastTier.percentage > 0) {
      return (
        this.calculatePercentageFee(amount, lastTier.percentage) +
        lastTier.fixedAmount
      );
    }

    return lastTier?.fixedAmount || 0n;
  }

  /**
   * Create default fee schedule for JoonaPay
   */
  static createDefault(): FeeSchedule {
    const now = new Date();

    return new FeeSchedule([
      // Yellow Card Deposits (Mobile Money)
      {
        provider: 'yellowcard',
        transactionType: FeeTransactionType.DEPOSIT,
        calculationMethod: FeeCalculationMethod.PERCENTAGE,
        percentage: 0.015, // 1.5%
        minFee: 500000n, // $0.50
        maxFee: 50000000n, // $50
        currency: 'USDC',
        effectiveFrom: now,
      },
      // Yellow Card Withdrawals (Mobile Money)
      {
        provider: 'yellowcard',
        transactionType: FeeTransactionType.WITHDRAWAL,
        calculationMethod: FeeCalculationMethod.PERCENTAGE,
        percentage: 0.02, // 2%
        minFee: 1000000n, // $1.00
        maxFee: 100000000n, // $100
        currency: 'USDC',
        effectiveFrom: now,
      },
      // Circle External Transfers (USDC)
      {
        provider: 'circle',
        transactionType: FeeTransactionType.TRANSFER_EXTERNAL,
        calculationMethod: FeeCalculationMethod.FIXED,
        fixedAmount: 1000000n, // $1.00 flat fee
        currency: 'USDC',
        effectiveFrom: now,
      },
      // Circle Deposits (Crypto)
      {
        provider: 'circle',
        transactionType: FeeTransactionType.DEPOSIT,
        calculationMethod: FeeCalculationMethod.FIXED,
        fixedAmount: 0n, // Free deposits
        currency: 'USDC',
        effectiveFrom: now,
      },
      // Internal P2P Transfers (Free)
      {
        provider: 'internal',
        transactionType: FeeTransactionType.TRANSFER_INTERNAL,
        calculationMethod: FeeCalculationMethod.FIXED,
        fixedAmount: 0n,
        currency: 'USDC',
        effectiveFrom: now,
      },
      // Bill Payments
      {
        provider: 'internal',
        transactionType: FeeTransactionType.BILL_PAYMENT,
        calculationMethod: FeeCalculationMethod.PERCENTAGE,
        percentage: 0.005, // 0.5%
        minFee: 100000n, // $0.10
        maxFee: 5000000n, // $5
        currency: 'USDC',
        effectiveFrom: now,
      },
    ]);
  }
}
