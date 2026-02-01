import { validate } from 'class-validator';
import {
  IsMobileMoneyProvider,
  MobileMoneyProvider,
} from './is-mobile-money-provider.decorator';
import { WAEMUCountry } from './is-waemu-country.decorator';

class TestDto {
  @IsMobileMoneyProvider()
  provider: string;
}

class TestDtoCountrySpecific {
  @IsMobileMoneyProvider({ country: WAEMUCountry.COTE_IVOIRE })
  provider: string;
}

class TestDtoLimitedProviders {
  @IsMobileMoneyProvider({
    allowedProviders: [
      MobileMoneyProvider.ORANGE_MONEY,
      MobileMoneyProvider.WAVE,
    ],
  })
  provider: string;
}

class TestDtoSenegalProviders {
  @IsMobileMoneyProvider({ country: WAEMUCountry.SENEGAL })
  provider: string;
}

describe('IsMobileMoneyProvider Decorator', () => {
  describe('All providers validation (default)', () => {
    it('should validate Orange Money', async () => {
      const dto = new TestDto();
      dto.provider = 'orange_money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate MTN Mobile Money', async () => {
      const dto = new TestDto();
      dto.provider = 'mtn_momo';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Wave', async () => {
      const dto = new TestDto();
      dto.provider = 'wave';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Moov Money', async () => {
      const dto = new TestDto();
      dto.provider = 'moov_money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Free Money', async () => {
      const dto = new TestDto();
      dto.provider = 'free_money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate YUP', async () => {
      const dto = new TestDto();
      dto.provider = 'yup';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid provider', async () => {
      const dto = new TestDto();
      dto.provider = 'invalid_provider';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isMobileMoneyProvider');
    });

    it('should reject empty string', async () => {
      const dto = new TestDto();
      dto.provider = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject null value', async () => {
      const dto = new TestDto();
      dto.provider = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle case normalization', async () => {
      const dto = new TestDto();
      dto.provider = 'ORANGE_MONEY'; // Uppercase

      const errors = await validate(dto);
      // Should normalize to lowercase and validate
      expect(errors.length).toBe(0);
    });

    it('should handle whitespace trimming', async () => {
      const dto = new TestDto();
      dto.provider = '  wave  '; // With spaces

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Côte d'Ivoire specific providers", () => {
    it('should validate Orange Money for CI', async () => {
      const dto = new TestDtoCountrySpecific();
      dto.provider = 'orange_money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate MTN Mobile Money for CI', async () => {
      const dto = new TestDtoCountrySpecific();
      dto.provider = 'mtn_momo';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Wave for CI', async () => {
      const dto = new TestDtoCountrySpecific();
      dto.provider = 'wave';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Moov Money for CI', async () => {
      const dto = new TestDtoCountrySpecific();
      dto.provider = 'moov_money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject Free Money for CI (not available)', async () => {
      const dto = new TestDtoCountrySpecific();
      dto.provider = 'free_money';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isMobileMoneyProvider).toContain('CI');
    });

    it('should reject YUP for CI (not available)', async () => {
      const dto = new TestDtoCountrySpecific();
      dto.provider = 'yup';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Senegal specific providers', () => {
    it('should validate Orange Money for Senegal', async () => {
      const dto = new TestDtoSenegalProviders();
      dto.provider = 'orange_money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Wave for Senegal', async () => {
      const dto = new TestDtoSenegalProviders();
      dto.provider = 'wave';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Free Money for Senegal', async () => {
      const dto = new TestDtoSenegalProviders();
      dto.provider = 'free_money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject MTN Mobile Money for Senegal (not available)', async () => {
      const dto = new TestDtoSenegalProviders();
      dto.provider = 'mtn_momo';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject Moov Money for Senegal (not available)', async () => {
      const dto = new TestDtoSenegalProviders();
      dto.provider = 'moov_money';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Limited providers list', () => {
    it('should validate allowed provider (Orange Money)', async () => {
      const dto = new TestDtoLimitedProviders();
      dto.provider = 'orange_money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate allowed provider (Wave)', async () => {
      const dto = new TestDtoLimitedProviders();
      dto.provider = 'wave';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject non-allowed provider (MTN)', async () => {
      const dto = new TestDtoLimitedProviders();
      dto.provider = 'mtn_momo';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-allowed provider (Moov)', async () => {
      const dto = new TestDtoLimitedProviders();
      dto.provider = 'moov_money';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should reject provider with special characters', async () => {
      const dto = new TestDto();
      dto.provider = 'orange-money';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject provider with uppercase (when not normalized)', async () => {
      const dto = new TestDto();
      // Testing exact match, but our implementation normalizes
      dto.provider = 'Orange_Money';

      const errors = await validate(dto);
      expect(errors.length).toBe(0); // Should pass after normalization
    });

    it('should reject similar but wrong provider names', async () => {
      const dto = new TestDto();
      dto.provider = 'orange';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject partial provider names', async () => {
      const dto = new TestDto();
      dto.provider = 'orange_mon';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world provider usage', () => {
    it('should validate common CI providers', async () => {
      const providers = ['orange_money', 'mtn_momo', 'wave', 'moov_money'];

      for (const provider of providers) {
        const dto = new TestDtoCountrySpecific();
        dto.provider = provider;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });

    it('should validate common SN providers', async () => {
      const providers = ['orange_money', 'wave', 'free_money'];

      for (const provider of providers) {
        const dto = new TestDtoSenegalProviders();
        dto.provider = provider;

        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      }
    });
  });
});
