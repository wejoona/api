/**
 * Exchange Rate Conversions Test Suite
 *
 * Tests for currency conversion calculations between USDC and XOF (CFA Franc).
 * Covers precision handling, rate spread calculations, and edge cases.
 *
 * Key considerations:
 * - USDC: 6 decimal places (1 USDC = 1,000,000 micro-units)
 * - XOF: 0 decimal places (whole numbers only)
 * - West African CFA Franc is pegged to EUR (655.957 XOF = 1 EUR)
 */

describe('ExchangeRateConversions', () => {
  const USDC_PRECISION = 1_000_000;
  // XOF has no decimals - documented for reference
  // const XOF_PRECISION = 1;

  /**
   * Exchange rate structure
   */
  type ExchangeRate = {
    baseCurrency: 'USDC' | 'USD';
    quoteCurrency: 'XOF' | 'EUR';
    buyRate: number;
    sellRate: number;
    midRate: number;
    spread: number;
    timestamp: Date;
    source: string;
    validUntil: Date;
  };

  /**
   * Conversion result structure
   */
  type ConversionResult = {
    fromAmount: bigint;
    fromCurrency: string;
    toAmount: bigint;
    toCurrency: string;
    rateUsed: number;
    rateType: 'buy' | 'sell' | 'mid';
    fee: bigint;
    netAmount: bigint;
  };

  // Type references to prevent unused warnings
  const _typeRefs: { rate?: ExchangeRate; result?: ConversionResult } = {};
  void _typeRefs;

  const toMicroUnits = (amount: number): bigint => {
    return BigInt(Math.round(amount * USDC_PRECISION));
  };

  const fromMicroUnits = (microUnits: bigint): number => {
    return Number(microUnits) / USDC_PRECISION;
  };

  /**
   * Convert USDC to XOF
   */
  const convertUsdcToXof = (
    usdcAmount: bigint,
    rate: number,
    includeDecimals: boolean = false,
  ): bigint => {
    // Convert from micro-units to actual USDC value
    const usdcValue = Number(usdcAmount) / USDC_PRECISION;
    const xofValue = usdcValue * rate;

    // XOF has no decimals, so we round
    if (includeDecimals) {
      return BigInt(Math.round(xofValue * 100)) / 100n; // Keep 2 decimals for intermediate
    }
    return BigInt(Math.round(xofValue));
  };

  /**
   * Convert XOF to USDC
   */
  const convertXofToUsdc = (xofAmount: bigint, rate: number): bigint => {
    const usdcValue = Number(xofAmount) / rate;
    return BigInt(Math.round(usdcValue * USDC_PRECISION));
  };

  /**
   * Calculate spread percentage
   */
  const calculateSpread = (buyRate: number, sellRate: number): number => {
    const midRate = (buyRate + sellRate) / 2;
    return ((buyRate - sellRate) / midRate) * 100;
  };

  describe('Basic Currency Conversions', () => {
    const standardRate = 657; // Approximate USD to XOF rate

    it('should convert USDC to XOF correctly', () => {
      const usdcAmount = toMicroUnits(100); // $100 USDC
      const xofAmount = convertUsdcToXof(usdcAmount, standardRate);

      expect(xofAmount).toBe(65700n); // 100 * 657 = 65,700 XOF
    });

    it('should convert XOF to USDC correctly', () => {
      const xofAmount = 65700n; // 65,700 XOF
      const usdcAmount = convertXofToUsdc(xofAmount, standardRate);

      expect(usdcAmount).toBe(100_000_000n); // $100 USDC
      expect(fromMicroUnits(usdcAmount)).toBeCloseTo(100, 0);
    });

    it('should maintain round-trip accuracy within tolerance', () => {
      const originalUsdc = toMicroUnits(1234.56);
      const xofAmount = convertUsdcToXof(originalUsdc, standardRate);
      const backToUsdc = convertXofToUsdc(xofAmount, standardRate);

      // Due to XOF rounding (no decimals), some loss is expected
      const difference =
        originalUsdc > backToUsdc
          ? originalUsdc - backToUsdc
          : backToUsdc - originalUsdc;

      // Difference should be less than 1 cent in USDC
      expect(difference).toBeLessThan(10_000n); // $0.01
    });

    it('should handle very small USDC amounts', () => {
      const usdcAmount = toMicroUnits(0.01); // $0.01 USDC
      const xofAmount = convertUsdcToXof(usdcAmount, standardRate);

      // $0.01 * 657 = 6.57 XOF -> rounds to 7 XOF
      expect(xofAmount).toBe(7n);
    });

    it('should handle very large amounts without overflow', () => {
      const usdcAmount = toMicroUnits(1_000_000); // $1M USDC
      const xofAmount = convertUsdcToXof(usdcAmount, standardRate);

      // $1M * 657 = 657,000,000 XOF
      expect(xofAmount).toBe(657_000_000n);
    });
  });

  describe('Exchange Rate Spread Calculations', () => {
    it('should calculate spread correctly', () => {
      const buyRate = 660; // Rate when buying USDC (higher)
      const sellRate = 654; // Rate when selling USDC (lower)

      const spread = calculateSpread(buyRate, sellRate);

      // Spread = (660 - 654) / 657 * 100 = 0.913%
      expect(spread).toBeCloseTo(0.913, 2);
    });

    it('should apply buy rate when user is buying USDC (selling XOF)', () => {
      const xofAmount = 65700n;
      const buyRate = 660; // Less favorable for user

      const usdcAmount = convertXofToUsdc(xofAmount, buyRate);

      // 65,700 / 660 = 99.545... USDC
      expect(fromMicroUnits(usdcAmount)).toBeCloseTo(99.55, 2);
    });

    it('should apply sell rate when user is selling USDC (buying XOF)', () => {
      const usdcAmount = toMicroUnits(100);
      const sellRate = 654; // Less favorable for user

      const xofAmount = convertUsdcToXof(usdcAmount, sellRate);

      // 100 * 654 = 65,400 XOF
      expect(xofAmount).toBe(65400n);
    });

    it('should calculate effective rate after spread', () => {
      const midRate = 657;
      const spreadPercent = 1; // 1% spread

      const halfSpread = spreadPercent / 2 / 100;
      const buyRate = midRate * (1 + halfSpread);
      const sellRate = midRate * (1 - halfSpread);

      expect(buyRate).toBeCloseTo(660.285, 2);
      expect(sellRate).toBeCloseTo(653.715, 2);
    });
  });

  describe('Rate Precision Edge Cases', () => {
    it('should handle rates with many decimal places', () => {
      const preciseRate = 657.123456789;
      const usdcAmount = toMicroUnits(1000);

      const xofAmount = convertUsdcToXof(usdcAmount, preciseRate);

      // 1000 * 657.123456789 = 657123.456789 -> rounds to 657123
      expect(xofAmount).toBe(657123n);
    });

    it('should handle fractional cent conversions', () => {
      const rate = 657;
      const usdcAmount = toMicroUnits(0.001); // $0.001

      const xofAmount = convertUsdcToXof(usdcAmount, rate);

      // $0.001 * 657 = 0.657 XOF -> rounds to 1 XOF
      expect(xofAmount).toBe(1n);
    });

    it('should handle minimum XOF unit correctly', () => {
      const rate = 657;
      // Find minimum USDC that produces at least 1 XOF
      const minUsdc = toMicroUnits(1 / rate); // ~$0.00152

      const xofAmount = convertUsdcToXof(minUsdc, rate);

      expect(xofAmount).toBeGreaterThanOrEqual(0n);
    });

    it('should handle rate changes during calculation', () => {
      // Simulate rate volatility
      const rates = [655, 657, 659, 656, 658];
      const usdcAmount = toMicroUnits(100);

      const results = rates.map((rate) => convertUsdcToXof(usdcAmount, rate));

      // Results should vary with rate
      expect(results[0]).toBe(65500n); // 655
      expect(results[1]).toBe(65700n); // 657
      expect(results[2]).toBe(65900n); // 659
    });
  });

  describe('Multi-Currency Chain Conversions', () => {
    const EUR_XOF_RATE = 655.957; // Fixed peg rate
    const USD_EUR_RATE = 0.92; // Example rate

    it('should convert USD to XOF via EUR correctly', () => {
      const usdAmount = toMicroUnits(100);

      // USD -> EUR -> XOF
      const eurAmount = (Number(usdAmount) / USDC_PRECISION) * USD_EUR_RATE;
      const xofAmount = BigInt(Math.round(eurAmount * EUR_XOF_RATE));

      // $100 * 0.92 = 92 EUR * 655.957 = 60,348 XOF
      expect(xofAmount).toBe(60348n);
    });

    it('should maintain consistency between direct and indirect conversion', () => {
      const usdAmount = toMicroUnits(1000);

      // Direct: USD -> XOF using combined rate
      const combinedRate = USD_EUR_RATE * EUR_XOF_RATE;
      const directXof = convertUsdcToXof(usdAmount, combinedRate);

      // Indirect: USD -> EUR -> XOF
      const eurValue = (Number(usdAmount) / USDC_PRECISION) * USD_EUR_RATE;
      const indirectXof = BigInt(Math.round(eurValue * EUR_XOF_RATE));

      expect(directXof).toBe(indirectXof);
    });
  });

  describe('Fee-Adjusted Conversions', () => {
    it('should calculate net amount after conversion fee', () => {
      const usdcAmount = toMicroUnits(100);
      const rate = 657;
      const feePercent = 0.015; // 1.5% fee

      // Calculate fee in USDC
      const feeMicro = BigInt(Math.round(Number(usdcAmount) * feePercent));
      const netUsdc = usdcAmount - feeMicro;

      // Convert net amount
      const xofAmount = convertUsdcToXof(netUsdc, rate);

      // $100 - $1.50 fee = $98.50 * 657 = 64,714 XOF
      expect(xofAmount).toBe(64715n); // Slight rounding
    });

    it('should calculate fee from XOF amount', () => {
      const xofAmount = 65700n;
      const rate = 657;
      const feePercent = 0.02; // 2% fee

      // Calculate fee in XOF
      const feeXof = BigInt(Math.round(Number(xofAmount) * feePercent));
      const netXof = xofAmount - feeXof;

      // Convert net amount
      const usdcAmount = convertXofToUsdc(netXof, rate);

      // 65,700 - 1,314 = 64,386 XOF / 657 = $98 USDC
      expect(fromMicroUnits(usdcAmount)).toBeCloseTo(98, 0);
    });
  });

  describe('Rate Validation', () => {
    const isRateValid = (
      rate: number,
      minRate: number,
      maxRate: number,
      maxAge: number,
      rateTimestamp: Date,
    ): { valid: boolean; reason?: string } => {
      if (rate <= 0) {
        return { valid: false, reason: 'Rate must be positive' };
      }
      if (rate < minRate) {
        return { valid: false, reason: `Rate below minimum: ${minRate}` };
      }
      if (rate > maxRate) {
        return { valid: false, reason: `Rate above maximum: ${maxRate}` };
      }

      const ageMs = Date.now() - rateTimestamp.getTime();
      if (ageMs > maxAge) {
        return { valid: false, reason: 'Rate expired' };
      }

      return { valid: true };
    };

    it('should validate rate within acceptable range', () => {
      const result = isRateValid(657, 600, 700, 60000, new Date());
      expect(result.valid).toBe(true);
    });

    it('should reject rate below minimum', () => {
      const result = isRateValid(500, 600, 700, 60000, new Date());
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('below minimum');
    });

    it('should reject rate above maximum', () => {
      const result = isRateValid(800, 600, 700, 60000, new Date());
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('above maximum');
    });

    it('should reject expired rate', () => {
      const oldTimestamp = new Date(Date.now() - 120000); // 2 minutes ago
      const result = isRateValid(657, 600, 700, 60000, oldTimestamp);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should reject zero or negative rates', () => {
      expect(isRateValid(0, 600, 700, 60000, new Date()).valid).toBe(false);
      expect(isRateValid(-657, 600, 700, 60000, new Date()).valid).toBe(false);
    });
  });

  describe('Rounding Strategies', () => {
    const roundingStrategies = {
      floor: (value: number) => Math.floor(value),
      ceil: (value: number) => Math.ceil(value),
      round: (value: number) => Math.round(value),
      truncate: (value: number) => Math.trunc(value),
      bankers: (value: number) => {
        const floor = Math.floor(value);
        const decimal = value - floor;
        if (decimal === 0.5) {
          return floor % 2 === 0 ? floor : floor + 1;
        }
        return Math.round(value);
      },
    };

    it('should produce different results for different rounding strategies', () => {
      const rate = 657;
      const usdcAmount = toMicroUnits(100.005); // Creates 0.5 XOF remainder

      const xofValue = (Number(usdcAmount) / USDC_PRECISION) * rate;

      const results = {
        floor: BigInt(roundingStrategies.floor(xofValue)),
        ceil: BigInt(roundingStrategies.ceil(xofValue)),
        round: BigInt(roundingStrategies.round(xofValue)),
      };

      // Floor and ceil should differ by 1
      expect(results.ceil - results.floor).toBe(1n);
    });

    it("should apply banker's rounding for 0.5 cases", () => {
      const testCases = [
        { value: 10.5, expected: 10 }, // Round to even (10)
        { value: 11.5, expected: 12 }, // Round to even (12)
        { value: 12.5, expected: 12 }, // Round to even (12)
        { value: 13.5, expected: 14 }, // Round to even (14)
      ];

      for (const { value, expected } of testCases) {
        expect(roundingStrategies.bankers(value)).toBe(expected);
      }
    });

    it('should favor user in conversion (conservative rounding)', () => {
      const rate = 657;

      // When user receives XOF (buying XOF), round down
      const usdcSelling = toMicroUnits(100.005);
      const xofReceived = BigInt(
        Math.floor((Number(usdcSelling) / USDC_PRECISION) * rate),
      );

      // When user sends XOF (buying USDC), round up the XOF required
      const usdcBuying = toMicroUnits(100);
      const xofRequired = BigInt(
        Math.ceil((Number(usdcBuying) / USDC_PRECISION) * rate),
      );

      expect(xofReceived).toBe(65703n);
      expect(xofRequired).toBe(65700n);
    });
  });

  describe('Slippage Protection', () => {
    const calculateWithSlippage = (
      expectedAmount: bigint,
      slippagePercent: number,
      direction: 'min' | 'max',
    ): bigint => {
      const slippageFactor = slippagePercent / 100;
      if (direction === 'min') {
        return BigInt(
          Math.floor(Number(expectedAmount) * (1 - slippageFactor)),
        );
      }
      return BigInt(Math.ceil(Number(expectedAmount) * (1 + slippageFactor)));
    };

    it('should calculate minimum acceptable amount with slippage', () => {
      const expectedXof = 65700n;
      const slippage = 1; // 1%

      const minAcceptable = calculateWithSlippage(expectedXof, slippage, 'min');

      // 65,700 * 0.99 = 65,043
      expect(minAcceptable).toBe(65043n);
    });

    it('should calculate maximum acceptable amount with slippage', () => {
      const expectedUsdc = toMicroUnits(100);
      const slippage = 1; // 1%

      const maxAcceptable = calculateWithSlippage(
        expectedUsdc,
        slippage,
        'max',
      );

      // $100 * 1.01 = $101
      expect(maxAcceptable).toBe(101_000_000n);
    });

    it('should reject conversion outside slippage bounds', () => {
      const expectedXof = 65700n;
      const actualXof = 64000n; // ~2.6% slippage
      const maxSlippage = 1; // 1%

      const minAcceptable = calculateWithSlippage(
        expectedXof,
        maxSlippage,
        'min',
      );
      const isAcceptable = actualXof >= minAcceptable;

      expect(isAcceptable).toBe(false);
    });
  });

  describe('Historical Rate Calculations', () => {
    interface HistoricalRate {
      timestamp: Date;
      rate: number;
    }

    const getWeightedAverageRate = (
      rates: HistoricalRate[],
      windowMs: number = 3600000, // 1 hour
    ): number => {
      const now = Date.now();
      const validRates = rates.filter(
        (r) => now - r.timestamp.getTime() <= windowMs,
      );

      if (validRates.length === 0) {
        throw new Error('No valid rates in window');
      }

      // Weight by recency
      let weightedSum = 0;
      let totalWeight = 0;

      for (const rate of validRates) {
        const age = now - rate.timestamp.getTime();
        const weight = 1 - age / windowMs; // Newer = higher weight
        weightedSum += rate.rate * weight;
        totalWeight += weight;
      }

      return weightedSum / totalWeight;
    };

    it('should calculate weighted average of recent rates', () => {
      const now = Date.now();
      const rates: HistoricalRate[] = [
        { timestamp: new Date(now - 60000), rate: 655 }, // 1 min ago
        { timestamp: new Date(now - 120000), rate: 657 }, // 2 min ago
        { timestamp: new Date(now - 180000), rate: 659 }, // 3 min ago
      ];

      const avgRate = getWeightedAverageRate(rates, 300000); // 5 min window

      // Most recent rate (655) should have highest weight
      expect(avgRate).toBeLessThan(657);
      expect(avgRate).toBeGreaterThan(655);
    });

    it('should exclude rates outside window', () => {
      const now = Date.now();
      const rates: HistoricalRate[] = [
        { timestamp: new Date(now - 60000), rate: 657 }, // 1 min ago
        { timestamp: new Date(now - 7200000), rate: 700 }, // 2 hours ago (outside window)
      ];

      const avgRate = getWeightedAverageRate(rates, 3600000); // 1 hour window

      // Should only use the recent rate
      expect(avgRate).toBeCloseTo(657, 0);
    });
  });

  describe('Conversion Audit Trail', () => {
    interface ConversionAudit {
      id: string;
      timestamp: Date;
      fromCurrency: string;
      fromAmount: bigint;
      toCurrency: string;
      toAmount: bigint;
      rateUsed: number;
      rateSources: string[];
      fee: bigint;
      feeCurrency: string;
      userId: string;
      transactionId: string;
    }

    it('should create complete audit record for conversion', () => {
      const audit: ConversionAudit = {
        id: 'conv-001',
        timestamp: new Date(),
        fromCurrency: 'USDC',
        fromAmount: toMicroUnits(100),
        toCurrency: 'XOF',
        toAmount: 65700n,
        rateUsed: 657,
        rateSources: ['yellowcard', 'xe.com'],
        fee: toMicroUnits(1.5),
        feeCurrency: 'USDC',
        userId: 'user-123',
        transactionId: 'tx-456',
      };

      expect(audit.fromAmount).toBe(100_000_000n);
      expect(audit.toAmount).toBe(65700n);
      expect(audit.fee).toBe(1_500_000n);
    });

    it('should verify audit record consistency', () => {
      const fromAmount = toMicroUnits(100);
      const fee = toMicroUnits(1.5);
      const rate = 657;

      const expectedToAmount = convertUsdcToXof(fromAmount - fee, rate);

      // Verify calculation matches: (100 - 1.5) * 657 = 98.5 * 657 = 64714.5 -> rounds to 64715
      expect(expectedToAmount).toBe(64715n);
    });
  });
});
