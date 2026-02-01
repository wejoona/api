import { validate } from 'class-validator';
import {
  IsWAEMUCountry,
  WAEMUCountry,
  getPhoneCodeForCountry,
  phoneMatchesCountry,
} from './is-waemu-country.decorator';

class TestDto {
  @IsWAEMUCountry()
  country: string;
}

class TestDtoCodesOnly {
  @IsWAEMUCountry({ acceptNames: false })
  country: string;
}

class TestDtoLimitedCountries {
  @IsWAEMUCountry({
    allowedCountries: [WAEMUCountry.COTE_IVOIRE, WAEMUCountry.SENEGAL],
  })
  country: string;
}

describe('IsWAEMUCountry Decorator', () => {
  describe('ISO country codes validation', () => {
    it('should validate Benin (BJ)', async () => {
      const dto = new TestDto();
      dto.country = 'BJ';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Burkina Faso (BF)', async () => {
      const dto = new TestDto();
      dto.country = 'BF';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate Côte d'Ivoire (CI)", async () => {
      const dto = new TestDto();
      dto.country = 'CI';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Guinea-Bissau (GW)', async () => {
      const dto = new TestDto();
      dto.country = 'GW';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Mali (ML)', async () => {
      const dto = new TestDto();
      dto.country = 'ML';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Niger (NE)', async () => {
      const dto = new TestDto();
      dto.country = 'NE';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Senegal (SN)', async () => {
      const dto = new TestDto();
      dto.country = 'SN';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Togo (TG)', async () => {
      const dto = new TestDto();
      dto.country = 'TG';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject non-WAEMU country code (FR)', async () => {
      const dto = new TestDto();
      dto.country = 'FR';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isWAEMUCountry');
    });

    it('should reject non-WAEMU country code (GH)', async () => {
      const dto = new TestDto();
      dto.country = 'GH'; // Ghana, not in WAEMU

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle lowercase ISO codes', async () => {
      const dto = new TestDto();
      dto.country = 'ci';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('Country names validation', () => {
    it('should validate "Benin"', async () => {
      const dto = new TestDto();
      dto.country = 'benin';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Burkina Faso"', async () => {
      const dto = new TestDto();
      dto.country = 'burkina faso';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Côte d\'Ivoire" with accent', async () => {
      const dto = new TestDto();
      dto.country = "côte d'ivoire";

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Cote d\'Ivoire" without accent', async () => {
      const dto = new TestDto();
      dto.country = "cote d'ivoire";

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Ivory Coast"', async () => {
      const dto = new TestDto();
      dto.country = 'ivory coast';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Mali"', async () => {
      const dto = new TestDto();
      dto.country = 'mali';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Niger"', async () => {
      const dto = new TestDto();
      dto.country = 'niger';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Senegal"', async () => {
      const dto = new TestDto();
      dto.country = 'senegal';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Sénégal" with accent', async () => {
      const dto = new TestDto();
      dto.country = 'sénégal';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Togo"', async () => {
      const dto = new TestDto();
      dto.country = 'togo';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate "Guinea-Bissau"', async () => {
      const dto = new TestDto();
      dto.country = 'guinea-bissau';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid country name', async () => {
      const dto = new TestDto();
      dto.country = 'france';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Codes only mode (acceptNames: false)', () => {
    it('should validate ISO codes', async () => {
      const dto = new TestDtoCodesOnly();
      dto.country = 'CI';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject country names when acceptNames is false', async () => {
      const dto = new TestDtoCodesOnly();
      dto.country = 'senegal';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject full names when acceptNames is false', async () => {
      const dto = new TestDtoCodesOnly();
      dto.country = 'ivory coast';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Limited countries list', () => {
    it('should validate allowed country (CI)', async () => {
      const dto = new TestDtoLimitedCountries();
      dto.country = 'CI';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate allowed country (SN)', async () => {
      const dto = new TestDtoLimitedCountries();
      dto.country = 'SN';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate allowed country by name (Senegal)', async () => {
      const dto = new TestDtoLimitedCountries();
      dto.country = 'senegal';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject non-allowed WAEMU country (ML)', async () => {
      const dto = new TestDtoLimitedCountries();
      dto.country = 'ML';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-allowed WAEMU country (BF)', async () => {
      const dto = new TestDtoLimitedCountries();
      dto.country = 'BF';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Helper functions', () => {
    describe('getPhoneCodeForCountry', () => {
      it("should return +225 for Côte d'Ivoire", () => {
        expect(getPhoneCodeForCountry(WAEMUCountry.COTE_IVOIRE)).toBe('+225');
      });

      it('should return +221 for Senegal', () => {
        expect(getPhoneCodeForCountry(WAEMUCountry.SENEGAL)).toBe('+221');
      });

      it('should return +223 for Mali', () => {
        expect(getPhoneCodeForCountry(WAEMUCountry.MALI)).toBe('+223');
      });

      it('should return +226 for Burkina Faso', () => {
        expect(getPhoneCodeForCountry(WAEMUCountry.BURKINA_FASO)).toBe('+226');
      });

      it('should return +227 for Niger', () => {
        expect(getPhoneCodeForCountry(WAEMUCountry.NIGER)).toBe('+227');
      });

      it('should return +228 for Togo', () => {
        expect(getPhoneCodeForCountry(WAEMUCountry.TOGO)).toBe('+228');
      });

      it('should return +229 for Benin', () => {
        expect(getPhoneCodeForCountry(WAEMUCountry.BENIN)).toBe('+229');
      });

      it('should return +245 for Guinea-Bissau', () => {
        expect(getPhoneCodeForCountry(WAEMUCountry.GUINEA_BISSAU)).toBe('+245');
      });
    });

    describe('phoneMatchesCountry', () => {
      it('should match CI phone with CI country', () => {
        expect(
          phoneMatchesCountry('+2250123456789', WAEMUCountry.COTE_IVOIRE),
        ).toBe(true);
      });

      it('should match SN phone with SN country', () => {
        expect(phoneMatchesCountry('+221771234567', WAEMUCountry.SENEGAL)).toBe(
          true,
        );
      });

      it('should not match CI phone with SN country', () => {
        expect(
          phoneMatchesCountry('+2250123456789', WAEMUCountry.SENEGAL),
        ).toBe(false);
      });

      it('should not match SN phone with CI country', () => {
        expect(
          phoneMatchesCountry('+221771234567', WAEMUCountry.COTE_IVOIRE),
        ).toBe(false);
      });

      it('should match ML phone with ML country', () => {
        expect(phoneMatchesCountry('+22376543210', WAEMUCountry.MALI)).toBe(
          true,
        );
      });
    });
  });

  describe('Edge cases', () => {
    it('should reject empty string', async () => {
      const dto = new TestDto();
      dto.country = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject null value', async () => {
      const dto = new TestDto();
      dto.country = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle whitespace in country names', async () => {
      const dto = new TestDto();
      dto.country = '  senegal  ';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should handle mixed case ISO codes', async () => {
      const dto = new TestDto();
      dto.country = 'Ci';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
