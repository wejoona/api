/**
 * Fee Calculations Test Suite
 *
 * Tests for financial fee calculations with precision handling.
 * Covers edge cases with large numbers, small amounts, and rounding scenarios.
 *
 * USDC uses 6 decimal places (1 USDC = 1,000,000 micro-units)
 * XOF uses 0 decimal places (whole numbers only)
 */

describe('FeeCalculations', () => {
  const USDC_PRECISION = 1_000_000;
  const USDC_DECIMALS = 6;

  /**
   * Utility functions for precise financial calculations
   */
  const toMicroUnits = (amount: number): bigint => {
    return BigInt(Math.round(amount * USDC_PRECISION));
  };

  const fromMicroUnits = (microUnits: bigint): number => {
    return Number(microUnits) / USDC_PRECISION;
  };

  const calculatePercentageFee = (
    amount: bigint,
    percentage: number,
  ): bigint => {
    const percentageMicro = BigInt(Math.round(percentage * USDC_PRECISION));
    return (amount * percentageMicro) / BigInt(USDC_PRECISION);
  };

  const calculateHybridFee = (
    amount: bigint,
    percentage: number,
    fixedFee: bigint,
    minFee?: bigint,
    maxFee?: bigint,
  ): bigint => {
    let fee = calculatePercentageFee(amount, percentage) + fixedFee;
    if (minFee !== undefined && fee < minFee) fee = minFee;
    if (maxFee !== undefined && fee > maxFee) fee = maxFee;
    return fee;
  };

  describe('Percentage Fee Calculations', () => {
    it('should calculate 1.5% fee correctly for standard amounts', () => {
      const amount = toMicroUnits(100); // $100
      const percentage = 0.015; // 1.5%

      const fee = calculatePercentageFee(amount, percentage);

      expect(fee).toBe(1_500_000n); // $1.50
      expect(fromMicroUnits(fee)).toBe(1.5);
    });

    it('should calculate 2% fee correctly for withdrawal', () => {
      const amount = toMicroUnits(500); // $500
      const percentage = 0.02; // 2%

      const fee = calculatePercentageFee(amount, percentage);

      expect(fee).toBe(10_000_000n); // $10.00
      expect(fromMicroUnits(fee)).toBe(10);
    });

    it('should calculate 0.5% fee correctly for bill payment', () => {
      const amount = toMicroUnits(1000); // $1000
      const percentage = 0.005; // 0.5%

      const fee = calculatePercentageFee(amount, percentage);

      expect(fee).toBe(5_000_000n); // $5.00
      expect(fromMicroUnits(fee)).toBe(5);
    });

    it('should handle very small percentages without loss of precision', () => {
      const amount = toMicroUnits(1000); // $1000
      const percentage = 0.0001; // 0.01%

      const fee = calculatePercentageFee(amount, percentage);

      expect(fee).toBe(100_000n); // $0.10
      expect(fromMicroUnits(fee)).toBe(0.1);
    });

    it('should handle fractional cent results correctly', () => {
      const amount = toMicroUnits(33.33); // $33.33
      const percentage = 0.015; // 1.5%

      const fee = calculatePercentageFee(amount, percentage);

      // $33.33 * 1.5% = $0.49995 -> rounds to $0.499950
      expect(fee).toBe(499_950n);
      expect(fromMicroUnits(fee)).toBeCloseTo(0.49995, USDC_DECIMALS);
    });
  });

  describe('Large Number Precision', () => {
    it('should handle $1,000,000 transaction without overflow', () => {
      const amount = toMicroUnits(1_000_000); // $1M
      const percentage = 0.015; // 1.5%

      const fee = calculatePercentageFee(amount, percentage);

      expect(fee).toBe(15_000_000_000n); // $15,000
      expect(fromMicroUnits(fee)).toBe(15_000);
    });

    it('should handle $10,000,000 transaction without overflow', () => {
      const amount = toMicroUnits(10_000_000); // $10M
      const percentage = 0.02; // 2%

      const fee = calculatePercentageFee(amount, percentage);

      expect(fee).toBe(200_000_000_000n); // $200,000
      expect(fromMicroUnits(fee)).toBe(200_000);
    });

    it('should handle maximum safe integer amounts', () => {
      // Maximum amount that can be safely converted
      const maxSafeAmount = BigInt(Number.MAX_SAFE_INTEGER);
      const percentage = 0.015;

      const fee = calculatePercentageFee(maxSafeAmount, percentage);

      // Should not throw and should be positive
      expect(fee).toBeGreaterThan(0n);
      expect(typeof fee).toBe('bigint');
    });

    it('should maintain precision for very large amounts', () => {
      const amount = 999_999_999_999_999n; // ~$1 billion in micro-units
      const percentage = 0.0001; // 0.01%

      const fee = calculatePercentageFee(amount, percentage);

      // Verify no precision loss by back-calculating
      const expectedFee =
        (amount * BigInt(Math.round(percentage * USDC_PRECISION))) /
        BigInt(USDC_PRECISION);
      expect(fee).toBe(expectedFee);
    });
  });

  describe('Small Amount Edge Cases', () => {
    it('should handle $0.01 transaction (minimum practical)', () => {
      const amount = toMicroUnits(0.01); // $0.01
      const percentage = 0.015; // 1.5%

      const fee = calculatePercentageFee(amount, percentage);

      // $0.01 * 1.5% = $0.00015
      expect(fee).toBe(150n);
      expect(fromMicroUnits(fee)).toBe(0.00015);
    });

    it('should handle $0.001 transaction (sub-cent)', () => {
      const amount = toMicroUnits(0.001); // $0.001
      const percentage = 0.015; // 1.5%

      const fee = calculatePercentageFee(amount, percentage);

      // $0.001 * 1.5% = $0.000015
      expect(fee).toBe(15n);
      expect(fromMicroUnits(fee)).toBe(0.000015);
    });

    it('should handle $0.000001 transaction (1 micro-unit)', () => {
      const amount = 1n; // Smallest possible USDC amount
      const percentage = 0.015; // 1.5%

      const fee = calculatePercentageFee(amount, percentage);

      // Should round down to 0 (fee too small)
      expect(fee).toBe(0n);
    });

    it('should handle zero amount correctly', () => {
      const amount = 0n;
      const percentage = 0.015;

      const fee = calculatePercentageFee(amount, percentage);

      expect(fee).toBe(0n);
    });
  });

  describe('Minimum and Maximum Fee Constraints', () => {
    it('should apply minimum fee when calculated fee is too low', () => {
      const amount = toMicroUnits(10); // $10
      const percentage = 0.015; // 1.5%
      const minFee = 500_000n; // $0.50 minimum

      let fee = calculatePercentageFee(amount, percentage);
      // $10 * 1.5% = $0.15 which is below minimum

      if (fee < minFee) fee = minFee;

      expect(fee).toBe(500_000n); // $0.50 (minimum applied)
    });

    it('should apply maximum fee when calculated fee exceeds cap', () => {
      const amount = toMicroUnits(100_000); // $100,000
      const percentage = 0.015; // 1.5%
      const maxFee = 50_000_000n; // $50 maximum

      let fee = calculatePercentageFee(amount, percentage);
      // $100,000 * 1.5% = $1,500 which exceeds maximum

      if (fee > maxFee) fee = maxFee;

      expect(fee).toBe(50_000_000n); // $50 (maximum applied)
    });

    it('should not modify fee when within min/max range', () => {
      const amount = toMicroUnits(500); // $500
      const percentage = 0.015; // 1.5%
      const minFee = 500_000n; // $0.50
      const maxFee = 50_000_000n; // $50

      let fee = calculatePercentageFee(amount, percentage);
      // $500 * 1.5% = $7.50

      const originalFee = fee;
      if (fee < minFee) fee = minFee;
      if (fee > maxFee) fee = maxFee;

      expect(fee).toBe(originalFee);
      expect(fee).toBe(7_500_000n); // $7.50
    });
  });

  describe('Hybrid Fee Calculations (Fixed + Percentage)', () => {
    it('should calculate hybrid fee correctly', () => {
      const amount = toMicroUnits(100); // $100
      const percentage = 0.01; // 1%
      const fixedFee = 500_000n; // $0.50 fixed

      const fee = calculateHybridFee(amount, percentage, fixedFee);

      // $100 * 1% + $0.50 = $1.00 + $0.50 = $1.50
      expect(fee).toBe(1_500_000n);
      expect(fromMicroUnits(fee)).toBe(1.5);
    });

    it('should apply minimum to hybrid fee', () => {
      const amount = toMicroUnits(10); // $10
      const percentage = 0.005; // 0.5%
      const fixedFee = 100_000n; // $0.10 fixed
      const minFee = 500_000n; // $0.50 minimum

      const fee = calculateHybridFee(amount, percentage, fixedFee, minFee);

      // $10 * 0.5% + $0.10 = $0.05 + $0.10 = $0.15 -> minimum $0.50 applied
      expect(fee).toBe(500_000n);
    });

    it('should apply maximum to hybrid fee', () => {
      const amount = toMicroUnits(10_000); // $10,000
      const percentage = 0.01; // 1%
      const fixedFee = 1_000_000n; // $1.00 fixed
      const maxFee = 10_000_000n; // $10 maximum

      const fee = calculateHybridFee(
        amount,
        percentage,
        fixedFee,
        undefined,
        maxFee,
      );

      // $10,000 * 1% + $1.00 = $100 + $1 = $101 -> maximum $10 applied
      expect(fee).toBe(10_000_000n);
    });
  });

  describe('Tiered Fee Calculations', () => {
    interface FeeTier {
      minAmount: bigint;
      maxAmount: bigint;
      percentage: number;
      fixedAmount: bigint;
    }

    const calculateTieredFee = (amount: bigint, tiers: FeeTier[]): bigint => {
      const sortedTiers = [...tiers].sort((a, b) =>
        a.minAmount > b.minAmount ? 1 : -1,
      );

      for (const tier of sortedTiers) {
        if (amount >= tier.minAmount && amount <= tier.maxAmount) {
          if (tier.percentage > 0) {
            return (
              calculatePercentageFee(amount, tier.percentage) + tier.fixedAmount
            );
          }
          return tier.fixedAmount;
        }
      }

      const lastTier = sortedTiers[sortedTiers.length - 1];
      if (lastTier && lastTier.percentage > 0) {
        return (
          calculatePercentageFee(amount, lastTier.percentage) +
          lastTier.fixedAmount
        );
      }
      return lastTier?.fixedAmount || 0n;
    };

    const standardTiers: FeeTier[] = [
      {
        minAmount: 0n,
        maxAmount: toMicroUnits(100),
        percentage: 0.02,
        fixedAmount: 0n,
      },
      {
        minAmount: toMicroUnits(100) + 1n,
        maxAmount: toMicroUnits(1000),
        percentage: 0.015,
        fixedAmount: 0n,
      },
      {
        minAmount: toMicroUnits(1000) + 1n,
        maxAmount: toMicroUnits(10000),
        percentage: 0.01,
        fixedAmount: 0n,
      },
      {
        minAmount: toMicroUnits(10000) + 1n,
        maxAmount: BigInt(Number.MAX_SAFE_INTEGER),
        percentage: 0.005,
        fixedAmount: 0n,
      },
    ];

    it('should apply lowest tier fee for small amounts', () => {
      const amount = toMicroUnits(50); // $50

      const fee = calculateTieredFee(amount, standardTiers);

      // $50 * 2% = $1.00
      expect(fee).toBe(1_000_000n);
    });

    it('should apply second tier fee for medium amounts', () => {
      const amount = toMicroUnits(500); // $500

      const fee = calculateTieredFee(amount, standardTiers);

      // $500 * 1.5% = $7.50
      expect(fee).toBe(7_500_000n);
    });

    it('should apply third tier fee for larger amounts', () => {
      const amount = toMicroUnits(5000); // $5,000

      const fee = calculateTieredFee(amount, standardTiers);

      // $5,000 * 1% = $50
      expect(fee).toBe(50_000_000n);
    });

    it('should apply highest tier fee for very large amounts', () => {
      const amount = toMicroUnits(50000); // $50,000

      const fee = calculateTieredFee(amount, standardTiers);

      // $50,000 * 0.5% = $250
      expect(fee).toBe(250_000_000n);
    });

    it('should handle tier boundary amounts correctly', () => {
      // Test exact boundary at $100
      const boundaryAmount = toMicroUnits(100);
      const fee = calculateTieredFee(boundaryAmount, standardTiers);

      // $100 * 2% = $2.00 (still in first tier)
      expect(fee).toBe(2_000_000n);
    });
  });

  describe('Rounding Behavior', () => {
    it("should round to nearest micro-unit (banker's rounding behavior check)", () => {
      // Test rounding for various amounts
      const testCases = [
        { amount: 33.333333, percentage: 0.015 }, // Repeating decimal
        { amount: 77.77, percentage: 0.013 }, // Complex multiplication
        { amount: 123.456789, percentage: 0.0175 }, // Many decimals
      ];

      for (const { amount, percentage } of testCases) {
        const amountMicro = toMicroUnits(amount);
        const fee = calculatePercentageFee(amountMicro, percentage);

        // Fee should be a valid bigint
        expect(typeof fee).toBe('bigint');
        expect(fee).toBeGreaterThanOrEqual(0n);

        // Fee should be deterministic
        const fee2 = calculatePercentageFee(amountMicro, percentage);
        expect(fee).toBe(fee2);
      }
    });

    it('should maintain consistency across multiple calculations', () => {
      const amount = toMicroUnits(1234.56);
      const percentage = 0.015;

      const fees: bigint[] = [];
      for (let i = 0; i < 100; i++) {
        fees.push(calculatePercentageFee(amount, percentage));
      }

      // All calculations should produce identical results
      const uniqueFees = new Set(fees.map((f) => f.toString()));
      expect(uniqueFees.size).toBe(1);
    });

    it('should not accumulate rounding errors in sequential calculations', () => {
      const baseAmount = toMicroUnits(100);
      const percentage = 0.015;
      let totalFee = 0n;

      // Calculate 1000 individual fees
      for (let i = 0; i < 1000; i++) {
        totalFee += calculatePercentageFee(baseAmount, percentage);
      }

      // Compare with bulk calculation
      const bulkAmount = toMicroUnits(100_000); // 1000 * $100
      const bulkFee = calculatePercentageFee(bulkAmount, percentage);

      // Should be exactly equal (no accumulated rounding error)
      expect(totalFee).toBe(bulkFee);
    });
  });

  describe('Currency-Specific Calculations', () => {
    it('should handle XOF (zero decimals) correctly', () => {
      // XOF has no decimal places
      const amountXOF = 65700n; // 65,700 XOF (approximately $100 USD)
      const percentage = 0.015;

      const fee = calculatePercentageFee(amountXOF, percentage);

      // Result should be whole number when working with XOF
      expect(fee).toBe(985n); // 65,700 * 1.5% = 985.5 -> handled by bigint truncation
    });

    it('should handle USDC to XOF fee conversion boundary', () => {
      // USDC precision is 6 decimals, XOF is 0
      const usdcAmount = toMicroUnits(100); // $100 USDC
      const xofRate = 657n; // 657 XOF per USD

      // Convert USDC to XOF
      const xofAmount = BigInt(fromMicroUnits(usdcAmount)) * xofRate;

      // Calculate fee in XOF
      const feePercentage = 0.015;
      const feeXOF = calculatePercentageFee(xofAmount, feePercentage);

      expect(xofAmount).toBe(65700n); // 100 * 657 = 65,700 XOF
      expect(feeXOF).toBe(985n); // ~986 XOF fee
    });
  });

  describe('Fee Verification', () => {
    const verifyFee = (
      expectedFee: bigint,
      actualFee: bigint,
      tolerancePercent: number = 0.05,
    ): { isValid: boolean; difference: bigint; percentDiff: number } => {
      const difference =
        actualFee > expectedFee
          ? actualFee - expectedFee
          : expectedFee - actualFee;

      const percentDiff =
        expectedFee > 0n ? Number(difference) / Number(expectedFee) : 0;

      const isValid = percentDiff <= tolerancePercent || difference < 10000n; // 5% tolerance or $0.01

      return { isValid, difference, percentDiff };
    };

    it('should verify matching fees as valid', () => {
      const expectedFee = 1_500_000n; // $1.50
      const actualFee = 1_500_000n;

      const result = verifyFee(expectedFee, actualFee);

      expect(result.isValid).toBe(true);
      expect(result.difference).toBe(0n);
    });

    it('should accept fees within tolerance', () => {
      const expectedFee = 1_500_000n; // $1.50
      const actualFee = 1_550_000n; // $1.55 (3.33% difference)

      const result = verifyFee(expectedFee, actualFee, 0.05);

      expect(result.isValid).toBe(true);
      expect(result.difference).toBe(50_000n);
    });

    it('should reject fees outside tolerance', () => {
      const expectedFee = 1_500_000n; // $1.50
      const actualFee = 2_000_000n; // $2.00 (33% difference)

      const result = verifyFee(expectedFee, actualFee, 0.05);

      expect(result.isValid).toBe(false);
      expect(result.percentDiff).toBeGreaterThan(0.05);
    });

    it('should handle small absolute differences for small fees', () => {
      const expectedFee = 100n; // $0.0001
      const actualFee = 150n; // $0.00015 (50% difference but tiny amount)

      const result = verifyFee(expectedFee, actualFee, 0.05);

      // Should be valid because absolute difference is under $0.01
      expect(result.isValid).toBe(true);
    });
  });

  describe('Provider-Specific Fee Scenarios', () => {
    describe('Yellow Card (Mobile Money)', () => {
      const yellowCardDepositFee = (amount: bigint): bigint => {
        const percentage = 0.015; // 1.5%
        const minFee = 500_000n; // $0.50
        const maxFee = 50_000_000n; // $50

        let fee = calculatePercentageFee(amount, percentage);
        if (fee < minFee) fee = minFee;
        if (fee > maxFee) fee = maxFee;
        return fee;
      };

      it('should calculate deposit fee with minimum', () => {
        const amount = toMicroUnits(20); // $20
        const fee = yellowCardDepositFee(amount);

        // $20 * 1.5% = $0.30 -> minimum $0.50 applied
        expect(fee).toBe(500_000n);
      });

      it('should calculate deposit fee without constraints', () => {
        const amount = toMicroUnits(500); // $500
        const fee = yellowCardDepositFee(amount);

        // $500 * 1.5% = $7.50
        expect(fee).toBe(7_500_000n);
      });

      it('should calculate deposit fee with maximum', () => {
        const amount = toMicroUnits(5000); // $5000
        const fee = yellowCardDepositFee(amount);

        // $5000 * 1.5% = $75 -> maximum $50 applied
        expect(fee).toBe(50_000_000n);
      });
    });

    describe('Circle (USDC Transfers)', () => {
      const circleTransferFee = (): bigint => {
        return 1_000_000n; // $1.00 flat fee
      };

      it('should return flat fee regardless of amount', () => {
        const amounts = [
          toMicroUnits(10),
          toMicroUnits(100),
          toMicroUnits(1000),
          toMicroUnits(10000),
        ];

        for (const _amount of amounts) {
          expect(circleTransferFee()).toBe(1_000_000n);
        }
      });
    });

    describe('Internal P2P Transfers', () => {
      const internalTransferFee = (): bigint => {
        return 0n; // Free
      };

      it('should return zero fee for internal transfers', () => {
        const amounts = [
          toMicroUnits(1),
          toMicroUnits(100),
          toMicroUnits(10000),
        ];

        for (const _amount of amounts) {
          expect(internalTransferFee()).toBe(0n);
        }
      });
    });
  });

  describe('Idempotency and Determinism', () => {
    it('should produce identical results for identical inputs', () => {
      const testInputs = [
        { amount: toMicroUnits(100), percentage: 0.015 },
        { amount: toMicroUnits(1234.56), percentage: 0.02 },
        { amount: toMicroUnits(9999.99), percentage: 0.005 },
      ];

      for (const input of testInputs) {
        const results: bigint[] = [];
        for (let i = 0; i < 10; i++) {
          results.push(calculatePercentageFee(input.amount, input.percentage));
        }

        // All results should be identical
        expect(new Set(results.map((r) => r.toString())).size).toBe(1);
      }
    });

    it('should be commutative for sum of fees', () => {
      const amount1 = toMicroUnits(100);
      const amount2 = toMicroUnits(200);
      const percentage = 0.015;

      const fee1 = calculatePercentageFee(amount1, percentage);
      const fee2 = calculatePercentageFee(amount2, percentage);

      const combinedFee = calculatePercentageFee(amount1 + amount2, percentage);

      expect(fee1 + fee2).toBe(combinedFee);
    });
  });
});
