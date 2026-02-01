import { LinkedBankAccount } from '../entities/linked-bank-account.entity';

export abstract class LinkedBankAccountRepository {
  abstract findById(id: string): Promise<LinkedBankAccount | null>;
  abstract findByWalletId(walletId: string): Promise<LinkedBankAccount[]>;
  abstract findPrimaryByWalletId(
    walletId: string,
  ): Promise<LinkedBankAccount | null>;
  abstract findVerifiedByWalletId(
    walletId: string,
  ): Promise<LinkedBankAccount[]>;
  abstract countByWalletId(walletId: string): Promise<number>;
  abstract save(account: LinkedBankAccount): Promise<LinkedBankAccount>;
  abstract delete(id: string): Promise<void>;
  abstract unsetAllPrimaryForWallet(walletId: string): Promise<void>;
}
