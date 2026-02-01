import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * WAEMU (West African Economic and Monetary Union) country codes
 * Also known as UEMOA (Union Économique et Monétaire Ouest Africaine)
 */
export enum WAEMUCountry {
  /** Benin */
  BENIN = 'BJ',

  /** Burkina Faso */
  BURKINA_FASO = 'BF',

  /** Côte d'Ivoire (Ivory Coast) */
  COTE_IVOIRE = 'CI',

  /** Guinea-Bissau */
  GUINEA_BISSAU = 'GW',

  /** Mali */
  MALI = 'ML',

  /** Niger */
  NIGER = 'NE',

  /** Senegal */
  SENEGAL = 'SN',

  /** Togo */
  TOGO = 'TG',
}

/**
 * Country validation options
 */
export interface WAEMUCountryOptions {
  /** Allowed countries (default: all WAEMU countries) */
  allowedCountries?: WAEMUCountry[];
  /** Accept both ISO codes and full names (default: true) */
  acceptNames?: boolean;
}

/**
 * Validator constraint for WAEMU country codes.
 * Validates country codes and names for West African Economic and Monetary Union countries.
 */
@ValidatorConstraint({ name: 'isWAEMUCountry', async: false })
export class IsWAEMUCountryConstraint implements ValidatorConstraintInterface {
  /**
   * Country code to name mapping
   */
  private readonly COUNTRY_NAMES: Record<WAEMUCountry, string[]> = {
    [WAEMUCountry.BENIN]: ['benin', 'bénin'],
    [WAEMUCountry.BURKINA_FASO]: ['burkina faso', 'burkina'],
    [WAEMUCountry.COTE_IVOIRE]: [
      "cote d'ivoire",
      "côte d'ivoire",
      'ivory coast',
    ],
    [WAEMUCountry.GUINEA_BISSAU]: [
      'guinea-bissau',
      'guinea bissau',
      'guinée-bissau',
    ],
    [WAEMUCountry.MALI]: ['mali'],
    [WAEMUCountry.NIGER]: ['niger'],
    [WAEMUCountry.SENEGAL]: ['senegal', 'sénégal'],
    [WAEMUCountry.TOGO]: ['togo'],
  };

  /**
   * All valid country codes
   */
  private readonly ALL_COUNTRIES = Object.values(WAEMUCountry);

  /**
   * Country metadata including phone codes and currencies
   */
  private readonly COUNTRY_METADATA: Record<
    WAEMUCountry,
    {
      phoneCode: string;
      capital: string;
      currency: string;
    }
  > = {
    [WAEMUCountry.BENIN]: {
      phoneCode: '+229',
      capital: 'Porto-Novo',
      currency: 'XOF',
    },
    [WAEMUCountry.BURKINA_FASO]: {
      phoneCode: '+226',
      capital: 'Ouagadougou',
      currency: 'XOF',
    },
    [WAEMUCountry.COTE_IVOIRE]: {
      phoneCode: '+225',
      capital: 'Yamoussoukro',
      currency: 'XOF',
    },
    [WAEMUCountry.GUINEA_BISSAU]: {
      phoneCode: '+245',
      capital: 'Bissau',
      currency: 'XOF',
    },
    [WAEMUCountry.MALI]: {
      phoneCode: '+223',
      capital: 'Bamako',
      currency: 'XOF',
    },
    [WAEMUCountry.NIGER]: {
      phoneCode: '+227',
      capital: 'Niamey',
      currency: 'XOF',
    },
    [WAEMUCountry.SENEGAL]: {
      phoneCode: '+221',
      capital: 'Dakar',
      currency: 'XOF',
    },
    [WAEMUCountry.TOGO]: {
      phoneCode: '+228',
      capital: 'Lomé',
      currency: 'XOF',
    },
  };

  validate(country: string, args: ValidationArguments): boolean {
    if (!country || typeof country !== 'string') {
      return false;
    }

    const options = this.parseOptions(args.constraints[0]);
    const normalizedInput = country.trim().toUpperCase();

    // Get allowed countries
    const allowedCountries = options.allowedCountries ?? this.ALL_COUNTRIES;

    // Check ISO code match
    if (allowedCountries.some((c) => c === normalizedInput)) {
      return true;
    }

    // Check country name match if enabled
    if (options.acceptNames) {
      const inputLower = country.trim().toLowerCase();

      for (const [code, names] of Object.entries(this.COUNTRY_NAMES)) {
        if (allowedCountries.includes(code as WAEMUCountry)) {
          if (names.some((name) => name === inputLower)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private parseOptions(
    constraints?: WAEMUCountryOptions,
  ): Required<WAEMUCountryOptions> {
    return {
      allowedCountries: constraints?.allowedCountries ?? this.ALL_COUNTRIES,
      acceptNames: constraints?.acceptNames ?? true,
    };
  }

  defaultMessage(args: ValidationArguments): string {
    const options = this.parseOptions(args.constraints[0]);
    const allowedCountries = options.allowedCountries ?? this.ALL_COUNTRIES;

    const countryList = allowedCountries
      .map((code) => `${code} (${this.COUNTRY_NAMES[code][0]})`)
      .join(', ');

    let message = `${args.property} must be a valid WAEMU country code. Allowed countries: ${countryList}`;

    if (options.acceptNames) {
      message +=
        ". Both ISO codes (BJ, CI, SN, etc.) and country names (Benin, Côte d'Ivoire, Senegal, etc.) are accepted";
    }

    return message;
  }

  /**
   * Get country metadata by code
   */
  getMetadata(code: WAEMUCountry) {
    return this.COUNTRY_METADATA[code];
  }
}

/**
 * Validates that a string is a valid WAEMU (West African Economic and Monetary Union) country code.
 *
 * WAEMU/UEMOA member countries use the CFA Franc (XOF) as their common currency.
 *
 * Supported countries:
 * - BJ: Benin
 * - BF: Burkina Faso
 * - CI: Côte d'Ivoire (Ivory Coast)
 * - GW: Guinea-Bissau
 * - ML: Mali
 * - NE: Niger
 * - SN: Senegal
 * - TG: Togo
 *
 * @param options - Configuration options for validation
 * @param validationOptions - Additional validation options
 *
 * @example
 * // Validate any WAEMU country
 * class CreateAccountDto {
 *   @IsWAEMUCountry()
 *   country: string; // 'CI', 'SN', 'Senegal', 'Côte d\'Ivoire', etc.
 * }
 *
 * @example
 * // Only ISO codes, no names
 * class RegistrationDto {
 *   @IsWAEMUCountry({ acceptNames: false })
 *   countryCode: string; // Only 'CI', 'SN', 'ML', etc.
 * }
 *
 * @example
 * // Limit to specific countries
 * class OnboardingDto {
 *   @IsWAEMUCountry({
 *     allowedCountries: [WAEMUCountry.COTE_IVOIRE, WAEMUCountry.SENEGAL]
 *   })
 *   country: string; // Only CI or SN
 * }
 *
 * @example
 * // Usage with phone validation
 * class UserProfileDto {
 *   @IsWAEMUCountry()
 *   country: string;
 *
 *   @IsPhoneE164()
 *   phone: string; // Must match country code
 * }
 */
export function IsWAEMUCountry(
  options?: WAEMUCountryOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsWAEMUCountryConstraint,
    });
  };
}

/**
 * Helper function to get phone code for a WAEMU country
 */
export function getPhoneCodeForCountry(country: WAEMUCountry): string {
  const constraint = new IsWAEMUCountryConstraint();
  return constraint.getMetadata(country).phoneCode;
}

/**
 * Helper function to validate phone number matches country
 */
export function phoneMatchesCountry(
  phone: string,
  country: WAEMUCountry,
): boolean {
  const phoneCode = getPhoneCodeForCountry(country);
  return phone.startsWith(phoneCode);
}
