# Repository Extensions for DataLoader Support

This document describes the batch query methods that need to be added to existing repositories to support DataLoader batching.

## Required Extensions

### 1. UserRepository

**File**: `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/user/application/domain/repositories/user.repository.ts`

Add these abstract methods:

```typescript
/**
 * Find multiple users by IDs (for DataLoader batching)
 */
abstract findByIds(ids: string[]): Promise<User[]>;

/**
 * Find multiple users by phone numbers (for DataLoader batching)
 */
abstract findByPhones(phones: string[]): Promise<User[]>;

/**
 * Find multiple users by usernames (for DataLoader batching)
 */
abstract findByUsernames(usernames: string[]): Promise<User[]>;
```

**Implementation**: Add to TypeORM repository implementation:

```typescript
async findByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const entities = await this.repo.find({
    where: { id: In(ids) },
  });
  return entities.map(e => this.toDomain(e));
}

async findByPhones(phones: string[]): Promise<User[]> {
  if (phones.length === 0) return [];
  const entities = await this.repo.find({
    where: { phone: In(phones) },
  });
  return entities.map(e => this.toDomain(e));
}

async findByUsernames(usernames: string[]): Promise<User[]> {
  if (usernames.length === 0) return [];
  const entities = await this.repo.find({
    where: { username: In(usernames.filter(u => u !== null)) },
  });
  return entities.map(e => this.toDomain(e));
}
```

---

### 2. WalletRepository

**File**: `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/wallet/domain/repositories/wallet.repository.ts`

Add these abstract methods:

```typescript
/**
 * Find multiple wallets by IDs (for DataLoader batching)
 */
abstract findByIds(ids: string[]): Promise<WalletEntity[]>;

/**
 * Find multiple wallets by user IDs (for DataLoader batching)
 */
abstract findByUserIds(userIds: string[]): Promise<WalletEntity[]>;

/**
 * Find multiple wallets by Circle wallet IDs (for DataLoader batching)
 */
abstract findByCircleWalletIds(circleWalletIds: string[]): Promise<WalletEntity[]>;
```

**Implementation**: Add to TypeORM repository implementation:

```typescript
async findByIds(ids: string[]): Promise<WalletEntity[]> {
  if (ids.length === 0) return [];
  const entities = await this.repo.find({
    where: { id: In(ids) },
  });
  return entities.map(e => this.toDomain(e));
}

async findByUserIds(userIds: string[]): Promise<WalletEntity[]> {
  if (userIds.length === 0) return [];
  const entities = await this.repo.find({
    where: { userId: In(userIds) },
  });
  return entities.map(e => this.toDomain(e));
}

async findByCircleWalletIds(circleWalletIds: string[]): Promise<WalletEntity[]> {
  if (circleWalletIds.length === 0) return [];
  const entities = await this.repo.find({
    where: { circleWalletId: In(circleWalletIds.filter(id => id !== null)) },
  });
  return entities.map(e => this.toDomain(e));
}
```

---

### 3. TransactionRepository

**File**: `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/transaction/domain/repositories/transaction.repository.ts`

Add these abstract methods:

```typescript
/**
 * Find multiple transactions by IDs (for DataLoader batching)
 */
abstract findByIds(ids: string[]): Promise<TransactionEntity[]>;

/**
 * Find all transactions for multiple wallet IDs (for DataLoader batching)
 */
abstract findByWalletIds(walletIds: string[]): Promise<TransactionEntity[]>;

/**
 * Find all transactions by recipient wallet IDs (for DataLoader batching)
 */
abstract findByRecipientWalletIds(recipientWalletIds: string[]): Promise<TransactionEntity[]>;

/**
 * Find transactions by wallet ID with pagination
 */
abstract findByWalletId(
  walletId: string,
  options?: { limit?: number; offset?: number },
): Promise<TransactionEntity[]>;
```

**Implementation**: Add to TypeORM repository implementation:

```typescript
async findByIds(ids: string[]): Promise<TransactionEntity[]> {
  if (ids.length === 0) return [];
  const entities = await this.repo.find({
    where: { id: In(ids) },
  });
  return entities.map(e => this.toDomain(e));
}

async findByWalletIds(walletIds: string[]): Promise<TransactionEntity[]> {
  if (walletIds.length === 0) return [];
  const entities = await this.repo.find({
    where: { walletId: In(walletIds) },
    order: { createdAt: 'DESC' },
    take: 100, // Limit per wallet to prevent over-fetching
  });
  return entities.map(e => this.toDomain(e));
}

async findByRecipientWalletIds(recipientWalletIds: string[]): Promise<TransactionEntity[]> {
  if (recipientWalletIds.length === 0) return [];
  const entities = await this.repo.find({
    where: { recipientWalletId: In(recipientWalletIds.filter(id => id !== null)) },
    order: { createdAt: 'DESC' },
    take: 100,
  });
  return entities.map(e => this.toDomain(e));
}

async findByWalletId(
  walletId: string,
  options?: { limit?: number; offset?: number },
): Promise<TransactionEntity[]> {
  const entities = await this.repo.find({
    where: { walletId },
    order: { createdAt: 'DESC' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
  return entities.map(e => this.toDomain(e));
}
```

---

### 4. BeneficiaryRepository

**File**: `/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/beneficiary/domain/repositories/beneficiary.repository.ts`

Add these abstract methods:

```typescript
/**
 * Find multiple beneficiaries by IDs (for DataLoader batching)
 */
abstract findByIds(ids: string[]): Promise<Beneficiary[]>;

/**
 * Find all beneficiaries for multiple wallet IDs (for DataLoader batching)
 */
abstract findByWalletIds(walletIds: string[]): Promise<Beneficiary[]>;

/**
 * Find beneficiaries by beneficiary user IDs (for DataLoader batching)
 */
abstract findByBeneficiaryUserIds(beneficiaryUserIds: string[]): Promise<Beneficiary[]>;

/**
 * Find favorite beneficiaries for a wallet
 */
abstract findFavoritesByWalletId(walletId: string): Promise<Beneficiary[]>;
```

**Implementation**: Add to TypeORM repository implementation:

```typescript
async findByIds(ids: string[]): Promise<Beneficiary[]> {
  if (ids.length === 0) return [];
  const entities = await this.repo.find({
    where: { id: In(ids) },
  });
  return entities.map(e => this.toDomain(e));
}

async findByWalletIds(walletIds: string[]): Promise<Beneficiary[]> {
  if (walletIds.length === 0) return [];
  const entities = await this.repo.find({
    where: { walletId: In(walletIds) },
    order: { isFavorite: 'DESC', name: 'ASC' },
  });
  return entities.map(e => this.toDomain(e));
}

async findByBeneficiaryUserIds(beneficiaryUserIds: string[]): Promise<Beneficiary[]> {
  if (beneficiaryUserIds.length === 0) return [];
  const entities = await this.repo.find({
    where: { beneficiaryUserId: In(beneficiaryUserIds.filter(id => id !== null)) },
  });
  return entities.map(e => this.toDomain(e));
}

async findFavoritesByWalletId(walletId: string): Promise<Beneficiary[]> {
  const entities = await this.repo.find({
    where: { walletId, isFavorite: true },
    order: { lastTransferAt: 'DESC', name: 'ASC' },
  });
  return entities.map(e => this.toDomain(e));
}
```

---

## Import Required

Don't forget to import `In` from TypeORM:

```typescript
import { In } from 'typeorm';
```

## Testing Batch Methods

Example test for batch methods:

```typescript
describe('findByIds', () => {
  it('should find multiple users by IDs', async () => {
    const user1 = await repository.save(User.create({ phone: '+1234' }));
    const user2 = await repository.save(User.create({ phone: '+5678' }));

    const users = await repository.findByIds([user1.id, user2.id]);

    expect(users).toHaveLength(2);
    expect(users.map(u => u.id)).toContain(user1.id);
    expect(users.map(u => u.id)).toContain(user2.id);
  });

  it('should return empty array for empty IDs', async () => {
    const users = await repository.findByIds([]);
    expect(users).toEqual([]);
  });
});
```

## Performance Considerations

1. **Batch Size Limits**: Consider adding a maximum batch size (e.g., 100 IDs) to prevent overloading the database
2. **Indexing**: Ensure database indexes exist on frequently queried fields (userId, walletId, etc.)
3. **Result Limits**: For one-to-many relations (e.g., transactions), limit results per parent to prevent over-fetching
4. **Caching**: DataLoader provides in-request caching, but consider adding Redis caching for frequently accessed data

## Next Steps

1. Add the abstract methods to each repository interface
2. Implement the methods in the TypeORM repository implementations
3. Add unit tests for each batch method
4. Test the GraphQL queries with complex nested relations
5. Monitor query performance and adjust limits as needed
