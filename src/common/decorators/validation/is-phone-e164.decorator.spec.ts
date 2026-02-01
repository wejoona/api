import { validate } from 'class-validator';
import { IsPhoneE164 } from './is-phone-e164.decorator';

class TestDto {
  @IsPhoneE164()
  phone: string;
}

class TestDtoNonStrict {
  @IsPhoneE164(false)
  phone: string;
}

describe('IsPhoneE164 Decorator', () => {
  describe('West African phone numbers (strict mode)', () => {
    it("should validate Côte d'Ivoire phone numbers", async () => {
      const dto = new TestDto();
      dto.phone = '+2250123456789'; // 10 digits after +225

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Senegal phone numbers', async () => {
      const dto = new TestDto();
      dto.phone = '+221771234567'; // 9 digits after +221

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Mali phone numbers', async () => {
      const dto = new TestDto();
      dto.phone = '+22376543210'; // 8 digits after +223

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Burkina Faso phone numbers', async () => {
      const dto = new TestDto();
      dto.phone = '+22670123456'; // 8 digits after +226

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Niger phone numbers', async () => {
      const dto = new TestDto();
      dto.phone = '+22790123456'; // 8 digits after +227

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Togo phone numbers', async () => {
      const dto = new TestDto();
      dto.phone = '+22890123456'; // 8 digits after +228

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Benin phone numbers', async () => {
      const dto = new TestDto();
      dto.phone = '+22990123456'; // 8 digits after +229

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate Guinea-Bissau phone numbers', async () => {
      const dto = new TestDto();
      dto.phone = '+2459012345'; // 7 digits after +245

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject phone numbers without + prefix', async () => {
      const dto = new TestDto();
      dto.phone = '2250123456789';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isPhoneE164');
    });

    it("should reject phone numbers with incorrect digit count for Côte d'Ivoire", async () => {
      const dto = new TestDto();
      dto.phone = '+225012345678'; // Only 9 digits instead of 10

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-WAEMU phone numbers', async () => {
      const dto = new TestDto();
      dto.phone = '+33612345678'; // French number

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.isPhoneE164).toContain(
        'West African country',
      );
    });

    it('should reject phone numbers with letters', async () => {
      const dto = new TestDto();
      dto.phone = '+225ABC1234567';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject empty string', async () => {
      const dto = new TestDto();
      dto.phone = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject null value', async () => {
      const dto = new TestDto();
      dto.phone = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('General E.164 validation (non-strict mode)', () => {
    it('should accept any valid E.164 number', async () => {
      const dto = new TestDtoNonStrict();
      dto.phone = '+33612345678'; // French number

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept US phone numbers', async () => {
      const dto = new TestDtoNonStrict();
      dto.phone = '+14155551234';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept UK phone numbers', async () => {
      const dto = new TestDtoNonStrict();
      dto.phone = '+447911123456';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject numbers starting with 0', async () => {
      const dto = new TestDtoNonStrict();
      dto.phone = '+0123456789';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject numbers longer than 15 digits', async () => {
      const dto = new TestDtoNonStrict();
      dto.phone = '+12345678901234567'; // 16 digits

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject numbers shorter than 2 digits', async () => {
      const dto = new TestDtoNonStrict();
      dto.phone = '+1'; // Too short

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject numbers without + prefix', async () => {
      const dto = new TestDtoNonStrict();
      dto.phone = '14155551234';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should reject phone numbers with spaces', async () => {
      const dto = new TestDto();
      dto.phone = '+225 01 23 45 67 89';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject phone numbers with dashes', async () => {
      const dto = new TestDto();
      dto.phone = '+225-01-23-45-67-89';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject phone numbers with special characters', async () => {
      const dto = new TestDto();
      dto.phone = '+225(0)123456789';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
