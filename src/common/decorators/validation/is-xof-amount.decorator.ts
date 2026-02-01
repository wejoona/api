import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Configuration options for XOF amount validation
 */
export interface XOFAmountOptions {
  /** Minimum amount in XOF (default: 100) */
  min?: number;
  /** Maximum amount in XOF (default: 2,000,000) */
  max?: number;
  /** Allow zero amounts (default: false) */
  allowZero?: boolean;
  /** Allow negative amounts for refunds/adjustments (default: false) */
  allowNegative?: boolean;
  /** Validate against mobile money limits (default: false) */
  checkMobileMoneyLimits?: boolean;
}

/**
 * Validator constraint for XOF (CFA Franc) amounts.
 * Validates amount format, range, and business rules specific to West African mobile money.
 */
@ValidatorConstraint({ name: 'isXOFAmount', async: false })
export class IsXOFAmountConstraint implements ValidatorConstraintInterface {
  /**
   * XOF currency constraints
   * CFA Franc doesn't have subunits (no cents), so amounts must be whole numbers
   */
  private readonly XOF_CONSTRAINTS = {
    // Minimum transaction amount (100 XOF ≈ $0.16 USD)
    MIN_AMOUNT: 100,

    // Maximum single transaction for most mobile money providers (2M XOF ≈ $3,200 USD)
    MAX_AMOUNT: 2_000_000,

    // Mobile money specific limits
    MOBILE_MONEY: {
      // Typical daily limit for non-verified accounts
      DAILY_LIMIT_UNVERIFIED: 200_000, // 200K XOF ≈ $320 USD

      // Typical daily limit for verified accounts
      DAILY_LIMIT_VERIFIED: 1_000_000, // 1M XOF ≈ $1,600 USD

      // Single transaction limit for most providers
      SINGLE_TRANSACTION_LIMIT: 500_000, // 500K XOF ≈ $800 USD
    },
  };

  validate(amount: any, args: ValidationArguments): boolean {
    const options = this.parseOptions(args.constraints[0]);

    // Validate type
    if (typeof amount !== 'number' && typeof amount !== 'string') {
      return false;
    }

    const numericAmount =
      typeof amount === 'string' ? parseFloat(amount) : amount;

    // Check if valid number
    if (isNaN(numericAmount) || !isFinite(numericAmount)) {
      return false;
    }

    // Check for whole number (XOF has no subunits)
    if (numericAmount % 1 !== 0) {
      return false;
    }

    // Negative validation
    if (numericAmount < 0 && !options.allowNegative) {
      return false;
    }

    // Zero validation (must come after negative check)
    if (numericAmount === 0 && !options.allowZero) {
      return false;
    }

    // Skip range checks for zero or negative amounts
    if (numericAmount <= 0) {
      return true;
    }

    // Min/Max validation for positive amounts
    const minAmount = options.min ?? this.XOF_CONSTRAINTS.MIN_AMOUNT;
    const maxAmount = options.max ?? this.XOF_CONSTRAINTS.MAX_AMOUNT;

    if (numericAmount < minAmount || numericAmount > maxAmount) {
      return false;
    }

    // Mobile money limits check
    if (options.checkMobileMoneyLimits) {
      if (
        numericAmount >
        this.XOF_CONSTRAINTS.MOBILE_MONEY.SINGLE_TRANSACTION_LIMIT
      ) {
        return false;
      }
    }

    return true;
  }

  private parseOptions(
    constraints?: XOFAmountOptions,
  ): Required<XOFAmountOptions> {
    return {
      min: constraints?.min ?? this.XOF_CONSTRAINTS.MIN_AMOUNT,
      max: constraints?.max ?? this.XOF_CONSTRAINTS.MAX_AMOUNT,
      allowZero: constraints?.allowZero ?? false,
      allowNegative: constraints?.allowNegative ?? false,
      checkMobileMoneyLimits: constraints?.checkMobileMoneyLimits ?? false,
    };
  }

  defaultMessage(args: ValidationArguments): string {
    const options = this.parseOptions(args.constraints[0]);
    const minAmount = options.min.toLocaleString('fr-FR');
    const maxAmount = options.max.toLocaleString('fr-FR');

    let message = `${args.property} must be a valid XOF amount (whole number between ${minAmount} and ${maxAmount} XOF)`;

    if (options.checkMobileMoneyLimits) {
      const limit =
        this.XOF_CONSTRAINTS.MOBILE_MONEY.SINGLE_TRANSACTION_LIMIT.toLocaleString(
          'fr-FR',
        );
      message += `. Mobile money limit: ${limit} XOF per transaction`;
    }

    if (!options.allowZero) {
      message += '. Zero amounts not allowed';
    }

    return message;
  }
}

/**
 * Validates that a number is a valid XOF (CFA Franc) amount.
 *
 * XOF is the currency used in WAEMU countries (West African Economic and Monetary Union).
 * It has no subunits, so amounts must be whole numbers.
 *
 * @param options - Configuration options for validation
 * @param validationOptions - Additional validation options
 *
 * @example
 * // Basic validation (100 - 2,000,000 XOF)
 * class CreateTransferDto {
 *   @IsXOFAmount()
 *   amount: number; // Must be whole number, min 100, max 2,000,000
 * }
 *
 * @example
 * // Custom range
 * class CreateDepositDto {
 *   @IsXOFAmount({ min: 500, max: 100_000 })
 *   amount: number;
 * }
 *
 * @example
 * // Mobile money validation
 * class MobileMoneyTransferDto {
 *   @IsXOFAmount({ checkMobileMoneyLimits: true })
 *   amount: number; // Max 500,000 XOF for mobile money
 * }
 *
 * @example
 * // Allow refunds (negative amounts)
 * class RefundDto {
 *   @IsXOFAmount({ allowNegative: true })
 *   amount: number;
 * }
 */
export function IsXOFAmount(
  options?: XOFAmountOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: IsXOFAmountConstraint,
    });
  };
}
