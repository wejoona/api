import { formatDecimalAmount, formatRateDecimal } from './money-response.util';

describe('money-response.util', () => {
  it('formats known currencies with stable scales', () => {
    expect(formatDecimalAmount(1000, 'XOF')).toBe('1000');
    expect(formatDecimalAmount(16.45, 'USD')).toBe('16.45');
    expect(formatDecimalAmount(16.45, 'USDC')).toBe('16.450000');
  });

  it('uses a two-decimal fallback for unknown currencies and invalid numbers', () => {
    expect(formatDecimalAmount(12.3, 'EUR')).toBe('12.30');
    expect(formatDecimalAmount(Number.NaN, 'USDC')).toBe('0.000000');
  });

  it('formats rates with eight decimals', () => {
    expect(formatRateDecimal(0.00166)).toBe('0.00166000');
    expect(formatRateDecimal(Number.NaN)).toBe('0.00000000');
  });
});
