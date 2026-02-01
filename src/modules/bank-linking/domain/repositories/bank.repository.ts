import { Bank } from '../entities/bank.entity';

export abstract class BankRepository {
  abstract findByCode(code: string): Promise<Bank | null>;
  abstract findAll(): Promise<Bank[]>;
  abstract findByCountry(country: string): Promise<Bank[]>;
  abstract findActive(): Promise<Bank[]>;
  abstract save(bank: Bank): Promise<Bank>;
}
