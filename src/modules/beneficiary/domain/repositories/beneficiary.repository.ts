import {
  Beneficiary,
  BeneficiaryAccountType,
} from '../entities/beneficiary.entity';

export abstract class BeneficiaryRepository {
  abstract findById(id: string): Promise<Beneficiary | null>;

  abstract findByWalletId(walletId: string): Promise<Beneficiary[]>;

  abstract findByWalletIdAndPhone(
    walletId: string,
    phoneE164: string,
  ): Promise<Beneficiary | null>;

  abstract findFavoritesByWalletId(walletId: string): Promise<Beneficiary[]>;

  abstract findByAccountType(
    walletId: string,
    accountType: BeneficiaryAccountType,
  ): Promise<Beneficiary[]>;

  abstract findRecentByWalletId(
    walletId: string,
    limit?: number,
  ): Promise<Beneficiary[]>;

  abstract save(beneficiary: Beneficiary): Promise<Beneficiary>;

  abstract delete(id: string): Promise<void>;

  abstract countByWalletId(walletId: string): Promise<number>;
}
