import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validator constraint for E.164 phone numbers with focus on West African countries.
 * Validates format and country-specific patterns.
 */
@ValidatorConstraint({ name: 'isPhoneE164', async: false })
export class IsPhoneE164Constraint implements ValidatorConstraintInterface {
  /**
   * West African country phone patterns (WAEMU region)
   * Format: +[country_code][number]
   */
  private readonly WEST_AFRICAN_PATTERNS: Record<string, RegExp> = {
    // Côte d'Ivoire: +225 followed by 10 digits (new format since 2021)
    CI: /^\+225\d{10}$/,

    // Senegal: +221 followed by 9 digits
    SN: /^\+221\d{9}$/,

    // Mali: +223 followed by 8 digits
    ML: /^\+223\d{8}$/,

    // Burkina Faso: +226 followed by 8 digits
    BF: /^\+226\d{8}$/,

    // Niger: +227 followed by 8 digits
    NE: /^\+227\d{8}$/,

    // Togo: +228 followed by 8 digits
    TG: /^\+228\d{8}$/,

    // Benin: +229 followed by 8 digits
    BJ: /^\+229\d{8}$/,

    // Guinea-Bissau: +245 followed by 7 digits
    GW: /^\+245\d{7}$/,
  };

  /**
   * General E.164 pattern: + followed by 1-15 digits
   */
  private readonly E164_PATTERN = /^\+[1-9]\d{1,14}$/;

  validate(phoneNumber: string, args: ValidationArguments): boolean {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }

    // First check general E.164 format
    if (!this.E164_PATTERN.test(phoneNumber)) {
      return false;
    }

    // If strict mode is enabled (default), validate against West African patterns
    const strict = args.constraints[0] !== false;
    if (strict) {
      return this.validateWestAfricanNumber(phoneNumber);
    }

    return true;
  }

  /**
   * Validates phone number against West African country patterns
   */
  private validateWestAfricanNumber(phoneNumber: string): boolean {
    return Object.values(this.WEST_AFRICAN_PATTERNS).some((pattern) =>
      pattern.test(phoneNumber),
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const strict = args.constraints[0] !== false;

    if (strict) {
      return `${args.property} must be a valid E.164 phone number from a West African country (WAEMU region). Supported countries: Côte d'Ivoire (+225), Senegal (+221), Mali (+223), Burkina Faso (+226), Niger (+227), Togo (+228), Benin (+229), Guinea-Bissau (+245)`;
    }

    return `${args.property} must be a valid E.164 phone number (format: +[country_code][number])`;
  }
}

/**
 * Validates that a string is a valid E.164 phone number.
 *
 * By default, validates against West African country patterns (WAEMU region).
 * Set strict=false to validate against general E.164 format only.
 *
 * @param strict - If true (default), validates against West African patterns. If false, validates general E.164 format.
 * @param validationOptions - Additional validation options
 *
 * @example
 * // Strict validation (West African only)
 * class CreateTransferDto {
 *   @IsPhoneE164()
 *   recipientPhone: string; // Must be +225XXXXXXXXXX, +221XXXXXXXXX, etc.
 * }
 *
 * @example
 * // General E.164 validation
 * class CreateTransferDto {
 *   @IsPhoneE164(false)
 *   recipientPhone: string; // Any valid E.164 number
 * }
 */
export function IsPhoneE164(
  strict: boolean = true,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [strict],
      validator: IsPhoneE164Constraint,
    });
  };
}
