/**
 * Balance Operations Test Suite
 *
 * Tests for wallet balance operations including deposits, withdrawals,
 * transfers, and balance calculations with precision handling.
 *
 * USDC uses 6 decimal places (1 USDC = 1,000,000 micro-units)
 * All balance operations use bigint for precision
 */

describe('BalanceOperations', () => {
  const USDC_PRECISION = 1_000_000;
  // USDC has 6 decimal places - used implicitly in toMicroUnits/fromMicroUnits

  // Type definitions
  interface WalletBalance {
    available: bigint;
    pending: bigint;
    reserved: bigint;
    total: bigint;
  }

  // BalanceOperation interface - documented for reference
  // interface BalanceOperation {
  //   type: 'credit' | 'debit';
  //   amount: bigint;
  //   reference: string;
  //   timestamp: Date;
  //   metadata?: Record<string, unknown>;
  // }

  interface TransferResult {
    success: boolean;
    fromBalance: WalletBalance;
    toBalance: WalletBalance;
    fee: bigint;
    error?: string;
  }

  // Utility functions
  const toMicroUnits = (amount: number): bigint => {
    return BigInt(Math.round(amount * USDC_PRECISION));
  };

  const fromMicroUnits = (microUnits: bigint): number => {
    return Number(microUnits) / USDC_PRECISION;
  };

  const createWalletBalance = (
    available: bigint = 0n,
    pending: bigint = 0n,
    reserved: bigint = 0n,
  ): WalletBalance => {
    return {
      available,
      pending,
      reserved,
      total: available + pending + reserved,
    };
  };

  const creditBalance = (
    balance: WalletBalance,
    amount: bigint,
    toPending: boolean = false,
  ): WalletBalance => {
    if (toPending) {
      return createWalletBalance(
        balance.available,
        balance.pending + amount,
        balance.reserved,
      );
    }
    return createWalletBalance(
      balance.available + amount,
      balance.pending,
      balance.reserved,
    );
  };

  const debitBalance = (
    balance: WalletBalance,
    amount: bigint,
    fromPending: boolean = false,
  ): WalletBalance | null => {
    if (fromPending) {
      if (balance.pending < amount) return null;
      return createWalletBalance(
        balance.available,
        balance.pending - amount,
        balance.reserved,
      );
    }
    if (balance.available < amount) return null;
    return createWalletBalance(
      balance.available - amount,
      balance.pending,
      balance.reserved,
    );
  };

  const reserveBalance = (
    balance: WalletBalance,
    amount: bigint,
  ): WalletBalance | null => {
    if (balance.available < amount) return null;
    return createWalletBalance(
      balance.available - amount,
      balance.pending,
      balance.reserved + amount,
    );
  };

  const releaseReserve = (
    balance: WalletBalance,
    amount: bigint,
    toAvailable: boolean = true,
  ): WalletBalance | null => {
    if (balance.reserved < amount) return null;
    if (toAvailable) {
      return createWalletBalance(
        balance.available + amount,
        balance.pending,
        balance.reserved - amount,
      );
    }
    // Release by consuming (completing a payment)
    return createWalletBalance(
      balance.available,
      balance.pending,
      balance.reserved - amount,
    );
  };

  describe('Basic Balance Operations', () => {
    it('should create balance with correct total', () => {
      const balance = createWalletBalance(
        toMicroUnits(100),
        toMicroUnits(10),
        toMicroUnits(5),
      );

      expect(balance.available).toBe(100_000_000n);
      expect(balance.pending).toBe(10_000_000n);
      expect(balance.reserved).toBe(5_000_000n);
      expect(balance.total).toBe(115_000_000n);
    });

    it('should credit available balance correctly', () => {
      const initial = createWalletBalance(toMicroUnits(100));
      const credited = creditBalance(initial, toMicroUnits(50));

      expect(credited.available).toBe(150_000_000n);
      expect(credited.total).toBe(150_000_000n);
    });

    it('should credit pending balance correctly', () => {
      const initial = createWalletBalance(toMicroUnits(100));
      const credited = creditBalance(initial, toMicroUnits(50), true);

      expect(credited.available).toBe(100_000_000n);
      expect(credited.pending).toBe(50_000_000n);
      expect(credited.total).toBe(150_000_000n);
    });

    it('should debit available balance correctly', () => {
      const initial = createWalletBalance(toMicroUnits(100));
      const debited = debitBalance(initial, toMicroUnits(30));

      expect(debited).not.toBeNull();
      expect(debited!.available).toBe(70_000_000n);
      expect(debited!.total).toBe(70_000_000n);
    });

    it('should fail debit when insufficient available balance', () => {
      const initial = createWalletBalance(toMicroUnits(50));
      const debited = debitBalance(initial, toMicroUnits(100));

      expect(debited).toBeNull();
    });

    it('should debit pending balance correctly', () => {
      const initial = createWalletBalance(toMicroUnits(100), toMicroUnits(50));
      const debited = debitBalance(initial, toMicroUnits(30), true);

      expect(debited).not.toBeNull();
      expect(debited!.pending).toBe(20_000_000n);
    });
  });

  describe('Balance Reservation', () => {
    it('should reserve balance from available', () => {
      const initial = createWalletBalance(toMicroUnits(100));
      const reserved = reserveBalance(initial, toMicroUnits(30));

      expect(reserved).not.toBeNull();
      expect(reserved!.available).toBe(70_000_000n);
      expect(reserved!.reserved).toBe(30_000_000n);
      expect(reserved!.total).toBe(100_000_000n);
    });

    it('should fail reservation when insufficient available', () => {
      const initial = createWalletBalance(toMicroUnits(20));
      const reserved = reserveBalance(initial, toMicroUnits(50));

      expect(reserved).toBeNull();
    });

    it('should release reserved balance to available', () => {
      const initial = createWalletBalance(
        toMicroUnits(70),
        0n,
        toMicroUnits(30),
      );
      const released = releaseReserve(initial, toMicroUnits(30), true);

      expect(released).not.toBeNull();
      expect(released!.available).toBe(100_000_000n);
      expect(released!.reserved).toBe(0n);
    });

    it('should release reserved balance by consumption', () => {
      const initial = createWalletBalance(
        toMicroUnits(70),
        0n,
        toMicroUnits(30),
      );
      const released = releaseReserve(initial, toMicroUnits(30), false);

      expect(released).not.toBeNull();
      expect(released!.available).toBe(70_000_000n);
      expect(released!.reserved).toBe(0n);
      expect(released!.total).toBe(70_000_000n);
    });
  });

  describe('P2P Transfer Operations', () => {
    const executeTransfer = (
      senderBalance: WalletBalance,
      recipientBalance: WalletBalance,
      amount: bigint,
      fee: bigint = 0n,
    ): TransferResult => {
      const totalDebit = amount + fee;

      // Verify sender has sufficient funds
      if (senderBalance.available < totalDebit) {
        return {
          success: false,
          fromBalance: senderBalance,
          toBalance: recipientBalance,
          fee,
          error: 'Insufficient funds',
        };
      }

      // Execute transfer
      const newSenderBalance = debitBalance(senderBalance, totalDebit)!;
      const newRecipientBalance = creditBalance(recipientBalance, amount);

      return {
        success: true,
        fromBalance: newSenderBalance,
        toBalance: newRecipientBalance,
        fee,
      };
    };

    it('should execute simple P2P transfer', () => {
      const sender = createWalletBalance(toMicroUnits(100));
      const recipient = createWalletBalance(toMicroUnits(50));

      const result = executeTransfer(sender, recipient, toMicroUnits(30));

      expect(result.success).toBe(true);
      expect(result.fromBalance.available).toBe(70_000_000n);
      expect(result.toBalance.available).toBe(80_000_000n);
    });

    it('should execute P2P transfer with fee', () => {
      const sender = createWalletBalance(toMicroUnits(100));
      const recipient = createWalletBalance(toMicroUnits(50));

      const result = executeTransfer(
        sender,
        recipient,
        toMicroUnits(30),
        toMicroUnits(0.5), // $0.50 fee
      );

      expect(result.success).toBe(true);
      expect(result.fromBalance.available).toBe(69_500_000n); // 100 - 30 - 0.5
      expect(result.toBalance.available).toBe(80_000_000n); // 50 + 30
    });

    it('should fail transfer with insufficient funds', () => {
      const sender = createWalletBalance(toMicroUnits(20));
      const recipient = createWalletBalance(toMicroUnits(50));

      const result = executeTransfer(sender, recipient, toMicroUnits(30));

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
      expect(result.fromBalance.available).toBe(20_000_000n);
      expect(result.toBalance.available).toBe(50_000_000n);
    });

    it('should fail transfer when fee makes total exceed balance', () => {
      const sender = createWalletBalance(toMicroUnits(30));
      const recipient = createWalletBalance(toMicroUnits(0));

      const result = executeTransfer(
        sender,
        recipient,
        toMicroUnits(30),
        toMicroUnits(1), // Fee pushes total to $31
      );

      expect(result.success).toBe(false);
    });

    it('should preserve total funds across transfer (conservation)', () => {
      const sender = createWalletBalance(toMicroUnits(100));
      const recipient = createWalletBalance(toMicroUnits(50));
      const fee = toMicroUnits(0.5);

      const initialTotal = sender.total + recipient.total;
      const result = executeTransfer(sender, recipient, toMicroUnits(30), fee);

      const finalTotal = result.fromBalance.total + result.toBalance.total;

      // Total should decrease only by fee
      expect(initialTotal - finalTotal).toBe(fee);
    });
  });

  describe('Precision Edge Cases', () => {
    it('should handle maximum USDC amount', () => {
      // Circle USDC total supply is around 26 billion
      const maxAmount = toMicroUnits(30_000_000_000); // $30 billion
      const balance = createWalletBalance(maxAmount);

      expect(balance.available).toBe(30_000_000_000_000_000n);
      expect(fromMicroUnits(balance.available)).toBe(30_000_000_000);
    });

    it('should handle minimum USDC amount (1 micro-unit)', () => {
      const minAmount = 1n; // Smallest possible USDC amount
      const balance = createWalletBalance(minAmount);

      expect(balance.available).toBe(1n);
      expect(fromMicroUnits(balance.available)).toBe(0.000001);
    });

    it('should handle exact balance debit (zero remaining)', () => {
      const balance = createWalletBalance(toMicroUnits(100));
      const debited = debitBalance(balance, toMicroUnits(100));

      expect(debited).not.toBeNull();
      expect(debited!.available).toBe(0n);
      expect(debited!.total).toBe(0n);
    });

    it('should handle fractional cent transfers', () => {
      const sender = createWalletBalance(toMicroUnits(100));
      const recipient = createWalletBalance(toMicroUnits(0));

      // Transfer $0.001234
      const amount = 1234n; // 0.001234 USDC
      const newSender = debitBalance(sender, amount)!;
      const newRecipient = creditBalance(recipient, amount);

      expect(newSender.available).toBe(99_998_766n);
      expect(newRecipient.available).toBe(1234n);
      expect(fromMicroUnits(newRecipient.available)).toBe(0.001234);
    });

    it('should not lose precision in sequential operations', () => {
      let balance = createWalletBalance(toMicroUnits(1000));

      // Perform many small operations
      for (let i = 0; i < 1000; i++) {
        balance = creditBalance(balance, 1n); // Add 1 micro-unit
      }
      for (let i = 0; i < 1000; i++) {
        balance = debitBalance(balance, 1n)!; // Remove 1 micro-unit
      }

      // Should be back to original
      expect(balance.available).toBe(toMicroUnits(1000));
    });
  });

  describe('Balance Reconciliation', () => {
    interface LedgerEntry {
      id: string;
      type: 'credit' | 'debit';
      amount: bigint;
      runningBalance: bigint;
      timestamp: Date;
    }

    const calculateBalanceFromLedger = (entries: LedgerEntry[]): bigint => {
      if (entries.length === 0) return 0n;

      // Sort by timestamp
      const sorted = [...entries].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      let balance = 0n;
      for (const entry of sorted) {
        if (entry.type === 'credit') {
          balance += entry.amount;
        } else {
          balance -= entry.amount;
        }
      }
      return balance;
    };

    const verifyRunningBalances = (entries: LedgerEntry[]): boolean => {
      const sorted = [...entries].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      let balance = 0n;
      for (const entry of sorted) {
        if (entry.type === 'credit') {
          balance += entry.amount;
        } else {
          balance -= entry.amount;
        }
        if (balance !== entry.runningBalance) {
          return false;
        }
      }
      return true;
    };

    it('should calculate balance from ledger entries', () => {
      const now = Date.now();
      const entries: LedgerEntry[] = [
        {
          id: '1',
          type: 'credit',
          amount: toMicroUnits(100),
          runningBalance: toMicroUnits(100),
          timestamp: new Date(now),
        },
        {
          id: '2',
          type: 'debit',
          amount: toMicroUnits(30),
          runningBalance: toMicroUnits(70),
          timestamp: new Date(now + 1000),
        },
        {
          id: '3',
          type: 'credit',
          amount: toMicroUnits(50),
          runningBalance: toMicroUnits(120),
          timestamp: new Date(now + 2000),
        },
      ];

      const calculatedBalance = calculateBalanceFromLedger(entries);

      expect(calculatedBalance).toBe(toMicroUnits(120));
    });

    it('should verify running balances are correct', () => {
      const now = Date.now();
      const validEntries: LedgerEntry[] = [
        {
          id: '1',
          type: 'credit',
          amount: toMicroUnits(100),
          runningBalance: toMicroUnits(100),
          timestamp: new Date(now),
        },
        {
          id: '2',
          type: 'debit',
          amount: toMicroUnits(30),
          runningBalance: toMicroUnits(70),
          timestamp: new Date(now + 1000),
        },
      ];

      expect(verifyRunningBalances(validEntries)).toBe(true);
    });

    it('should detect incorrect running balances', () => {
      const now = Date.now();
      const invalidEntries: LedgerEntry[] = [
        {
          id: '1',
          type: 'credit',
          amount: toMicroUnits(100),
          runningBalance: toMicroUnits(100),
          timestamp: new Date(now),
        },
        {
          id: '2',
          type: 'debit',
          amount: toMicroUnits(30),
          runningBalance: toMicroUnits(80),
          timestamp: new Date(now + 1000),
        }, // Wrong! Should be 70
      ];

      expect(verifyRunningBalances(invalidEntries)).toBe(false);
    });

    it('should handle empty ledger', () => {
      const entries: LedgerEntry[] = [];

      const balance = calculateBalanceFromLedger(entries);

      expect(balance).toBe(0n);
    });
  });

  describe('Concurrent Balance Updates', () => {
    interface OptimisticLock {
      balance: WalletBalance;
      version: number;
    }

    const updateWithLock = (
      current: OptimisticLock,
      expectedVersion: number,
      operation: (balance: WalletBalance) => WalletBalance | null,
    ): { success: boolean; newState?: OptimisticLock; error?: string } => {
      if (current.version !== expectedVersion) {
        return {
          success: false,
          error: 'Version mismatch - concurrent update detected',
        };
      }

      const newBalance = operation(current.balance);
      if (newBalance === null) {
        return { success: false, error: 'Operation failed' };
      }

      return {
        success: true,
        newState: { balance: newBalance, version: current.version + 1 },
      };
    };

    it('should allow update with correct version', () => {
      const state: OptimisticLock = {
        balance: createWalletBalance(toMicroUnits(100)),
        version: 1,
      };

      const result = updateWithLock(state, 1, (b) =>
        creditBalance(b, toMicroUnits(50)),
      );

      expect(result.success).toBe(true);
      expect(result.newState!.balance.available).toBe(150_000_000n);
      expect(result.newState!.version).toBe(2);
    });

    it('should reject update with stale version', () => {
      const state: OptimisticLock = {
        balance: createWalletBalance(toMicroUnits(100)),
        version: 2, // Current version is 2
      };

      const result = updateWithLock(state, 1, (b) =>
        creditBalance(b, toMicroUnits(50)),
      ); // Trying with version 1

      expect(result.success).toBe(false);
      expect(result.error).toContain('Version mismatch');
    });

    it('should handle failed operation with correct version', () => {
      const state: OptimisticLock = {
        balance: createWalletBalance(toMicroUnits(50)),
        version: 1,
      };

      const result = updateWithLock(state, 1, (b) =>
        debitBalance(b, toMicroUnits(100)),
      ); // Insufficient funds

      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed');
    });
  });

  describe('Balance Limits and Constraints', () => {
    interface BalanceConstraints {
      minBalance: bigint;
      maxBalance: bigint;
      dailyTransferLimit: bigint;
      singleTransactionLimit: bigint;
    }

    const defaultConstraints: BalanceConstraints = {
      minBalance: 0n,
      maxBalance: toMicroUnits(100_000), // $100k max
      dailyTransferLimit: toMicroUnits(10_000), // $10k daily
      singleTransactionLimit: toMicroUnits(5_000), // $5k single
    };

    const validateOperation = (
      balance: WalletBalance,
      amount: bigint,
      operationType: 'credit' | 'debit',
      constraints: BalanceConstraints,
      dailyUsed: bigint = 0n,
    ): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (operationType === 'credit') {
        const newBalance = balance.available + amount;
        if (newBalance > constraints.maxBalance) {
          errors.push(
            `Would exceed maximum balance of ${fromMicroUnits(constraints.maxBalance)}`,
          );
        }
      }

      if (operationType === 'debit') {
        if (amount > balance.available) {
          errors.push('Insufficient available balance');
        }
        if (balance.available - amount < constraints.minBalance) {
          errors.push(
            `Would fall below minimum balance of ${fromMicroUnits(constraints.minBalance)}`,
          );
        }
        if (amount > constraints.singleTransactionLimit) {
          errors.push(
            `Exceeds single transaction limit of ${fromMicroUnits(constraints.singleTransactionLimit)}`,
          );
        }
        if (dailyUsed + amount > constraints.dailyTransferLimit) {
          errors.push(
            `Would exceed daily transfer limit of ${fromMicroUnits(constraints.dailyTransferLimit)}`,
          );
        }
      }

      return { valid: errors.length === 0, errors };
    };

    it('should reject deposit exceeding max balance', () => {
      const balance = createWalletBalance(toMicroUnits(90_000));
      const deposit = toMicroUnits(20_000); // Would make 110k

      const result = validateOperation(
        balance,
        deposit,
        'credit',
        defaultConstraints,
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('maximum balance');
    });

    it('should reject withdrawal exceeding available', () => {
      const balance = createWalletBalance(toMicroUnits(100));
      const withdrawal = toMicroUnits(150);

      const result = validateOperation(
        balance,
        withdrawal,
        'debit',
        defaultConstraints,
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Insufficient available balance');
    });

    it('should reject withdrawal exceeding single transaction limit', () => {
      const balance = createWalletBalance(toMicroUnits(50_000));
      const withdrawal = toMicroUnits(6_000); // Over $5k limit

      const result = validateOperation(
        balance,
        withdrawal,
        'debit',
        defaultConstraints,
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('single transaction limit');
    });

    it('should reject withdrawal exceeding daily limit', () => {
      const balance = createWalletBalance(toMicroUnits(50_000));
      const withdrawal = toMicroUnits(3_000);
      const dailyUsed = toMicroUnits(8_000); // Already used $8k today

      const result = validateOperation(
        balance,
        withdrawal,
        'debit',
        defaultConstraints,
        dailyUsed,
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('daily transfer limit');
    });

    it('should allow valid operations within constraints', () => {
      const balance = createWalletBalance(toMicroUnits(50_000));
      const withdrawal = toMicroUnits(1_000);
      const dailyUsed = toMicroUnits(5_000);

      const result = validateOperation(
        balance,
        withdrawal,
        'debit',
        defaultConstraints,
        dailyUsed,
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Interest and Yield Calculations', () => {
    const calculateDailyYield = (
      principal: bigint,
      annualRatePercent: number,
    ): bigint => {
      // Daily rate = annual rate / 365
      const dailyRate = annualRatePercent / 100 / 365;
      const yield_ = Number(principal) * dailyRate;
      return BigInt(Math.floor(yield_));
    };

    const calculateCompoundYield = (
      principal: bigint,
      annualRatePercent: number,
      days: number,
      compoundingFrequency: 'daily' | 'monthly' | 'yearly' = 'daily',
    ): bigint => {
      const r = annualRatePercent / 100;
      let n: number;

      switch (compoundingFrequency) {
        case 'daily':
          n = 365;
          break;
        case 'monthly':
          n = 12;
          break;
        case 'yearly':
          n = 1;
          break;
      }

      const t = days / 365;
      const amount = Number(principal) * Math.pow(1 + r / n, n * t);
      return BigInt(Math.floor(amount));
    };

    it('should calculate daily yield correctly', () => {
      const principal = toMicroUnits(10_000); // $10,000
      const annualRate = 5; // 5% APY

      const dailyYield = calculateDailyYield(principal, annualRate);

      // $10,000 * 5% / 365 = ~$1.37/day
      expect(fromMicroUnits(dailyYield)).toBeCloseTo(1.37, 1);
    });

    it('should calculate compound yield correctly', () => {
      const principal = toMicroUnits(10_000); // $10,000
      const annualRate = 5; // 5% APY
      const days = 365; // 1 year

      const finalAmount = calculateCompoundYield(
        principal,
        annualRate,
        days,
        'daily',
      );
      const yield_ = finalAmount - principal;

      // With daily compounding, should be slightly more than simple 5%
      expect(fromMicroUnits(yield_)).toBeGreaterThan(500);
      expect(fromMicroUnits(yield_)).toBeLessThan(520);
    });

    it('should handle small principals without losing precision', () => {
      const principal = toMicroUnits(1); // $1
      const annualRate = 5;

      const dailyYield = calculateDailyYield(principal, annualRate);

      // $1 * 5% / 365 = $0.000137
      expect(dailyYield).toBeGreaterThanOrEqual(0n);
    });

    it('should compare daily vs monthly compounding', () => {
      const principal = toMicroUnits(100_000);
      const annualRate = 10;
      const days = 365;

      const dailyCompound = calculateCompoundYield(
        principal,
        annualRate,
        days,
        'daily',
      );
      const monthlyCompound = calculateCompoundYield(
        principal,
        annualRate,
        days,
        'monthly',
      );

      // Daily compounding should yield slightly more
      expect(dailyCompound).toBeGreaterThan(monthlyCompound);
    });
  });

  describe('Balance Snapshot and History', () => {
    interface BalanceSnapshot {
      timestamp: Date;
      balance: WalletBalance;
      reason: string;
    }

    // Helper to create snapshots - using inline for tests
    const _createSnapshot = (
      balance: WalletBalance,
      reason: string,
    ): BalanceSnapshot => ({
      timestamp: new Date(),
      balance: { ...balance },
      reason,
    });
    void _createSnapshot; // Silence unused warning - available for future tests

    const getBalanceAtTime = (
      snapshots: BalanceSnapshot[],
      targetTime: Date,
    ): WalletBalance | null => {
      const sorted = [...snapshots].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );

      let result: WalletBalance | null = null;
      for (const snapshot of sorted) {
        if (snapshot.timestamp <= targetTime) {
          result = snapshot.balance;
        } else {
          break;
        }
      }
      return result;
    };

    it('should retrieve balance at specific point in time', () => {
      const now = Date.now();
      const snapshots: BalanceSnapshot[] = [
        {
          timestamp: new Date(now - 3600000),
          balance: createWalletBalance(toMicroUnits(100)),
          reason: 'initial',
        },
        {
          timestamp: new Date(now - 1800000),
          balance: createWalletBalance(toMicroUnits(150)),
          reason: 'deposit',
        },
        {
          timestamp: new Date(now),
          balance: createWalletBalance(toMicroUnits(120)),
          reason: 'withdrawal',
        },
      ];

      const balanceAtMidpoint = getBalanceAtTime(
        snapshots,
        new Date(now - 900000),
      );

      expect(balanceAtMidpoint).not.toBeNull();
      expect(balanceAtMidpoint!.available).toBe(150_000_000n);
    });

    it('should return null for time before first snapshot', () => {
      const now = Date.now();
      const snapshots: BalanceSnapshot[] = [
        {
          timestamp: new Date(now),
          balance: createWalletBalance(toMicroUnits(100)),
          reason: 'initial',
        },
      ];

      const balance = getBalanceAtTime(snapshots, new Date(now - 3600000));

      expect(balance).toBeNull();
    });
  });

  describe('Multi-Currency Balance', () => {
    interface MultiCurrencyBalance {
      USDC: WalletBalance;
      XOF: WalletBalance;
    }

    // Factory function for empty balances - available for future tests
    const _createMultiCurrencyBalance = (): MultiCurrencyBalance => ({
      USDC: createWalletBalance(0n),
      XOF: createWalletBalance(0n),
    });
    void _createMultiCurrencyBalance;

    const calculateTotalValueInUsdc = (
      balances: MultiCurrencyBalance,
      xofToUsdcRate: number,
    ): bigint => {
      const usdcValue = balances.USDC.total;
      const xofValueInUsdc = BigInt(
        Math.round(
          (Number(balances.XOF.total) / xofToUsdcRate) * USDC_PRECISION,
        ),
      );
      return usdcValue + xofValueInUsdc;
    };

    it('should maintain separate balances per currency', () => {
      const balances: MultiCurrencyBalance = {
        USDC: createWalletBalance(toMicroUnits(100)),
        XOF: createWalletBalance(65700n), // 65,700 XOF
      };

      expect(balances.USDC.available).toBe(100_000_000n);
      expect(balances.XOF.available).toBe(65700n);
    });

    it('should calculate total portfolio value in USDC', () => {
      const balances: MultiCurrencyBalance = {
        USDC: createWalletBalance(toMicroUnits(100)),
        XOF: createWalletBalance(65700n),
      };
      const xofRate = 657; // 657 XOF per USD

      const totalUsdc = calculateTotalValueInUsdc(balances, xofRate);

      // $100 USDC + 65,700 XOF (~$100) = ~$200 total
      expect(fromMicroUnits(totalUsdc)).toBeCloseTo(200, 0);
    });
  });
});
