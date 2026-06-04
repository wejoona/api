const DEFAULT_DECIMAL_SCALE = 2;

const currencyScales: Record<string, number> = {
  XOF: 0,
  USD: 2,
  USDC: 6,
};

export function formatDecimalAmount(
  value: unknown,
  currency?: string,
  fallbackScale = DEFAULT_DECIMAL_SCALE,
): string {
  const numeric = Number(value);
  const scale = currency ? (currencyScales[currency] ?? fallbackScale) : fallbackScale;

  if (!Number.isFinite(numeric)) {
    return (0).toFixed(scale);
  }

  return numeric.toFixed(scale);
}

export function formatRateDecimal(value: unknown): string {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return '0.00000000';
  }

  return numeric.toFixed(8);
}

export function addAmountDecimal<T extends Record<string, unknown>>(
  payload: T,
  field: keyof T,
  currency?: string,
  decimalField?: string,
): T & Record<string, string> {
  return {
    ...payload,
    [decimalField ?? `${String(field)}Decimal`]: formatDecimalAmount(
      payload[field],
      currency,
    ),
  };
}

export function addMoneyDecimals<T extends Record<string, unknown>>(
  payload: T,
  currency?: string,
  fields: Array<keyof T> = ['amount' as keyof T, 'fee' as keyof T],
): T & Record<string, string> {
  return fields.reduce<Record<string, unknown>>(
    (acc, field) => {
      if (field in payload) {
        acc[`${String(field)}Decimal`] = formatDecimalAmount(
          payload[field],
          currency,
        );
      }
      return acc;
    },
    { ...payload },
  ) as T & Record<string, string>;
}
