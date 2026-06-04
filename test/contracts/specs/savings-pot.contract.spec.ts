import {
  SavingsPotTransactionListResponseSchema,
  SavingsPotTransactionSchema,
} from '../schemas/savings-pot.contract';
import { validateSchema } from '../validators/schema-validator';

describe('Savings Pot Contracts', () => {
  it('should validate an empty transaction history response', () => {
    const response = {
      transactions: [],
      items: [],
      total: 0,
    };

    const result = validateSchema(
      response,
      SavingsPotTransactionListResponseSchema,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate a savings pot transaction item for future ledger-backed history', () => {
    const transaction = {
      id: 'sptx_123',
      potId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'deposit',
      amount: 25,
      timestamp: '2026-06-04T10:30:00.000Z',
      note: 'Added to Vacation Fund',
    };

    const result = validateSchema(transaction, SavingsPotTransactionSchema);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject raw arrays because the backend must not 404 or hide metadata', () => {
    const result = validateSchema(
      [],
      SavingsPotTransactionListResponseSchema,
    );

    expect(result.valid).toBe(false);
  });
});
