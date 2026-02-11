/**
 * Fee calculation utilities for transfers and deposits.
 * Centralized fee logic to ensure consistency across all endpoints.
 */

export interface FeeCalculation {
  amount: number;
  fee: number;
  total: number;
  feePercentage: number;
  currency: string;
}

/** Calculate internal transfer fee (P2P within Korido = free) */
export function calculateInternalTransferFee(amount: number, currency = 'USDC'): FeeCalculation {
  return { amount, fee: 0, total: amount, feePercentage: 0, currency };
}

/** Calculate external transfer fee (to outside wallets) */
export function calculateExternalTransferFee(amount: number, currency = 'USDC'): FeeCalculation {
  // 1% fee, minimum $0.50, maximum $25
  const feePercentage = 1.0;
  let fee = amount * (feePercentage / 100);
  fee = Math.max(fee, 0.50);
  fee = Math.min(fee, 25.0);
  fee = Math.round(fee * 100) / 100;
  return { amount, fee, total: amount + fee, feePercentage, currency };
}

/** Calculate deposit fee (mobile money → USDC) */
export function calculateDepositFee(amountXof: number): FeeCalculation {
  // 1.5% fee on XOF amount
  const feePercentage = 1.5;
  let fee = amountXof * (feePercentage / 100);
  fee = Math.round(fee);
  return { amount: amountXof, fee, total: amountXof + fee, feePercentage, currency: 'XOF' };
}

/** Calculate withdrawal fee (USDC → mobile money) */
export function calculateWithdrawalFee(amountUsdc: number): FeeCalculation {
  // 2% fee
  const feePercentage = 2.0;
  let fee = amountUsdc * (feePercentage / 100);
  fee = Math.round(fee * 100) / 100;
  return { amount: amountUsdc, fee, total: amountUsdc + fee, feePercentage, currency: 'USDC' };
}
