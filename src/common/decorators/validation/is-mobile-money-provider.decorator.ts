import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Supported mobile money providers in West Africa
 */
export enum MobileMoneyProvider {
  ORANGE_MONEY = 'orange_money',
  MTN_MOBILE_MONEY = 'mtn_momo',
  WAVE = 'wave',
  MOOV_MONEY = 'moov_money',
  FREE_MONEY = 'free_money',
  YUP = 'yup',
}

/**
 * Provider configuration options
 */
export interface MobileMoneyProviderOptions {
  /** Allowed providers (default: all supported providers) */
  allowedProviders?: MobileMoneyProvider[];
  /** Country-specific filtering (default: null - all countries) */
  country?: WAEMUCountry;
}

/**
 * WAEMU country codes
 */
export enum WAEMUCountry {
  COTE_IVOIRE = 'CI',
  SENEGAL = 'SN',
  MALI = 'ML',
  BURKINA_FASO = 'BF',
  NIGER = 'NE',
  TOGO = 'TG',
  BENIN = 'BJ',
  GUINEA_BISSAU = 'GW',
}

/**
 * Validator constraint for mobile money providers.
 * Validates provider names and country availability.
 */
@ValidatorConstraint({ name: 'isMobileMoneyProvider', async: false })
export class IsMobileMoneyProviderConstraint implements ValidatorConstraintInterface {
  /**
   * Provider availability by country
   * Maps WAEMU countries to available mobile money providers
   */
  private readonly PROVIDER_AVAILABILITY: Record<
    WAEMUCountry,
    MobileMoneyProvider[]
  > = {
    [WAEMUCountry.COTE_IVOIRE]: [
      MobileMoneyProvider.ORANGE_MONEY,
      MobileMoneyProvider.MTN_MOBILE_MONEY,
      MobileMoneyProvider.WAVE,
      MobileMoneyProvider.MOOV_MONEY,
    ],
    [WAEMUCountry.SENEGAL]: [
      MobileMoneyProvider.ORANGE_MONEY,
      MobileMoneyProvider.WAVE,
      MobileMoneyProvider.FREE_MONEY,
    ],
    [WAEMUCountry.MALI]: [
      MobileMoneyProvider.ORANGE_MONEY,
      MobileMoneyProvider.MOOV_MONEY,
    ],
    [WAEMUCountry.BURKINA_FASO]: [
      MobileMoneyProvider.ORANGE_MONEY,
      MobileMoneyProvider.MOOV_MONEY,
    ],
    [WAEMUCountry.NIGER]: [
      MobileMoneyProvider.ORANGE_MONEY,
      MobileMoneyProvider.MOOV_MONEY,
    ],
    [WAEMUCountry.TOGO]: [
      MobileMoneyProvider.MOOV_MONEY,
      MobileMoneyProvider.YUP,
    ],
    [WAEMUCountry.BENIN]: [
      MobileMoneyProvider.MTN_MOBILE_MONEY,
      MobileMoneyProvider.MOOV_MONEY,
    ],
    [WAEMUCountry.GUINEA_BISSAU]: [MobileMoneyProvider.ORANGE_MONEY],
  };

  /**
   * All supported providers across WAEMU region
   */
  private readonly ALL_PROVIDERS = Object.values(MobileMoneyProvider);

  validate(provider: string, args: ValidationArguments): boolean {
    if (!provider || typeof provider !== 'string') {
      return false;
    }

    const options = this.parseOptions(args.constraints[0]);

    // Normalize input
    const normalizedProvider = provider.toLowerCase().trim();

    // Get allowed providers list
    const allowedProviders = options.allowedProviders ?? this.ALL_PROVIDERS;

    // If country is specified, filter by country availability
    if (options.country) {
      const countryProviders = this.PROVIDER_AVAILABILITY[options.country];
      const validProviders = allowedProviders.filter((p) =>
        countryProviders.includes(p),
      );
      return validProviders.some((p) => (p as string) === normalizedProvider);
    }

    // Check against allowed providers
    return allowedProviders.some((p) => (p as string) === normalizedProvider);
  }

  private parseOptions(
    constraints?: MobileMoneyProviderOptions,
  ): MobileMoneyProviderOptions {
    return {
      allowedProviders: constraints?.allowedProviders ?? this.ALL_PROVIDERS,
      country: constraints?.country,
    };
  }

  defaultMessage(args: ValidationArguments): string {
    const options = this.parseOptions(args.constraints[0]);

    if (options.country) {
      const countryProviders = this.PROVIDER_AVAILABILITY[options.country];
      const allowedProviders = (options.allowedProviders ?? this.ALL_PROVIDERS)
        .filter((p) => countryProviders.includes(p))
        .map((p) => p.toString())
        .join(', ');

      return `${args.property} must be a valid mobile money provider for ${options.country}. Allowed providers: ${allowedProviders}`;
    }

    const allowedProviders = (options.allowedProviders ?? this.ALL_PROVIDERS)
      .map((p) => p.toString())
      .join(', ');

    return `${args.property} must be a valid mobile money provider. Allowed providers: ${allowedProviders}`;
  }
}

/**
 * Validates that a string is a valid mobile money provider.
 *
 * Supports major mobile money providers in the WAEMU region:
 * - Orange Money (CI, SN, ML, BF, NE, GW)
 * - MTN Mobile Money (CI, BJ)
 * - Wave (CI, SN)
 * - Moov Money (CI, ML, BF, NE, TG, BJ)
 * - Free Money (SN)
 * - YUP (TG)
 *
 * @param options - Configuration options for validation
 * @param validationOptions - Additional validation options
 *
 * @example
 * // Validate any supported provider
 * class CreateWithdrawalDto {
 *   @IsMobileMoneyProvider()
 *   provider: string; // 'orange_money', 'mtn_momo', 'wave', etc.
 * }
 *
 * @example
 * // Country-specific validation
 * class CreateDepositDto {
 *   @IsMobileMoneyProvider({ country: WAEMUCountry.COTE_IVOIRE })
 *   provider: string; // Only Orange Money, MTN, Wave, Moov for CI
 * }
 *
 * @example
 * // Limit to specific providers
 * class QuickTransferDto {
 *   @IsMobileMoneyProvider({
 *     allowedProviders: [MobileMoneyProvider.ORANGE_MONEY, MobileMoneyProvider.WAVE]
 *   })
 *   provider: string;
 * }
 */
export function IsMobileMoneyProvider(
  options?: MobileMoneyProviderOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsMobileMoneyProviderConstraint,
    });
  };
}
