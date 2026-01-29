import { SavingsPotEntity } from '../entities/savings-pot.entity';

export interface ISavingsPotRepository {
  save(savingsPot: SavingsPotEntity): Promise<SavingsPotEntity>;
  findById(id: string): Promise<SavingsPotEntity | null>;
  findByWalletId(walletId: string): Promise<SavingsPotEntity[]>;
  findActiveByWalletId(walletId: string): Promise<SavingsPotEntity[]>;
  findWithAutoDeposit(): Promise<SavingsPotEntity[]>;
  delete(id: string): Promise<void>;
}

export const SAVINGS_POT_REPOSITORY = Symbol('SAVINGS_POT_REPOSITORY');
