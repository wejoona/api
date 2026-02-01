/**
 * Custom validation decorators for West African context
 *
 * This module provides specialized validators for:
 * - Phone numbers (E.164 format with West African patterns)
 * - XOF amounts (CFA Franc currency validation)
 * - Mobile money providers (Orange Money, MTN, Wave, etc.)
 * - WAEMU country codes (West African Economic and Monetary Union)
 */

// Phone validation
export { IsPhoneE164, IsPhoneE164Constraint } from './is-phone-e164.decorator';

// XOF amount validation
export {
  IsXOFAmount,
  IsXOFAmountConstraint,
  XOFAmountOptions,
} from './is-xof-amount.decorator';

// Mobile money provider validation
export {
  IsMobileMoneyProvider,
  IsMobileMoneyProviderConstraint,
  MobileMoneyProvider,
  MobileMoneyProviderOptions,
} from './is-mobile-money-provider.decorator';

// WAEMU country validation
export {
  IsWAEMUCountry,
  IsWAEMUCountryConstraint,
  WAEMUCountry,
  WAEMUCountryOptions,
  getPhoneCodeForCountry,
  phoneMatchesCountry,
} from './is-waemu-country.decorator';
