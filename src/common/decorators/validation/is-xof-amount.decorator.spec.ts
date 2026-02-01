import { validate } from 'class-validator';
import { IsXOFAmount } from './is-xof-amount.decorator';

class TestDto {
  @IsXOFAmount()
  amount: number;
}

class TestDtoCustomRange {
  @IsXOFAmount({ min: 500, max: 100_000 })
  amount: number;
}

class TestDtoMobileMoneyLimits {
  @IsXOFAmount({ checkMobileMoneyLimits: true })
  amount: number;
}

class TestDtoAllowZero {
  @IsXOFAmount({ allowZero: true })
  amount: number;
}

class TestDtoAllowNegative {
  @IsXOFAmount({ allowNegative: true })
  amount: number;
}

describe('IsXOFAmount Decorator', () => {
  describe('Default validation (100 - 2,000,000 XOF)', () => {
    it('should validate minimum amount (100 XOF)', async () => {
      const dto = new TestDto();
      dto.amount = 100;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate maximum amount (2,000,000 XOF)', async () => {
      const dto = new TestDto();
      dto.amount = 2_000_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate mid-range amount (50,000 XOF)', async () => {
      const dto = new TestDto();
      dto.amount = 50_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject amounts below minimum', async () => {
      const dto = new TestDto();
      dto.amount = 99;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isXOFAmount');
    });

    it('should reject amounts above maximum', async () => {
      const dto = new TestDto();
      dto.amount = 2_000_001;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject zero by default', async () => {
      const dto = new TestDto();
      dto.amount = 0;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject negative amounts by default', async () => {
      const dto = new TestDto();
      dto.amount = -1000;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject decimal amounts (XOF has no subunits)', async () => {
      const dto = new TestDto();
      dto.amount = 100.5;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isXOFAmount).toContain('whole number');
    });

    it('should reject invalid number types', async () => {
      const dto = new TestDto();
      dto.amount = {} as any; // Object instead of number

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject NaN', async () => {
      const dto = new TestDto();
      dto.amount = NaN;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject Infinity', async () => {
      const dto = new TestDto();
      dto.amount = Infinity;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Custom range validation', () => {
    it('should validate amount within custom range', async () => {
      const dto = new TestDtoCustomRange();
      dto.amount = 5000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject amount below custom minimum', async () => {
      const dto = new TestDtoCustomRange();
      dto.amount = 499;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject amount above custom maximum', async () => {
      const dto = new TestDtoCustomRange();
      dto.amount = 100_001;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate custom minimum edge', async () => {
      const dto = new TestDtoCustomRange();
      dto.amount = 500;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate custom maximum edge', async () => {
      const dto = new TestDtoCustomRange();
      dto.amount = 100_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Mobile money limits validation', () => {
    it('should validate amount within mobile money limit (500K XOF)', async () => {
      const dto = new TestDtoMobileMoneyLimits();
      dto.amount = 250_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate exactly at mobile money limit', async () => {
      const dto = new TestDtoMobileMoneyLimits();
      dto.amount = 500_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject amounts above mobile money limit', async () => {
      const dto = new TestDtoMobileMoneyLimits();
      dto.amount = 500_001;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isXOFAmount).toContain('Mobile money');
    });

    it('should still enforce minimum amount with mobile money limits', async () => {
      const dto = new TestDtoMobileMoneyLimits();
      dto.amount = 50;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Allow zero option', () => {
    it('should accept zero when allowZero is true', async () => {
      const dto = new TestDtoAllowZero();
      dto.amount = 0;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should still validate positive amounts', async () => {
      const dto = new TestDtoAllowZero();
      dto.amount = 1000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should still reject negative amounts by default', async () => {
      const dto = new TestDtoAllowZero();
      dto.amount = -100;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Allow negative option (for refunds)', () => {
    it('should accept negative amounts when allowNegative is true', async () => {
      const dto = new TestDtoAllowNegative();
      dto.amount = -1000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should still validate positive amounts', async () => {
      const dto = new TestDtoAllowNegative();
      dto.amount = 1000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept large negative amounts (no max check for negatives)', async () => {
      const dto = new TestDtoAllowNegative();
      dto.amount = -5_000_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should still reject decimal negative amounts', async () => {
      const dto = new TestDtoAllowNegative();
      dto.amount = -100.5;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should validate typical mobile money transfer (5,000 XOF)', async () => {
      const dto = new TestDto();
      dto.amount = 5_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate typical bill payment (25,000 XOF)', async () => {
      const dto = new TestDto();
      dto.amount = 25_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate salary transfer (250,000 XOF)', async () => {
      const dto = new TestDto();
      dto.amount = 250_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate large business transaction (1,500,000 XOF)', async () => {
      const dto = new TestDto();
      dto.amount = 1_500_000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
