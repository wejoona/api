import { SubBusiness } from '../entities/sub-business.entity';

export abstract class SubBusinessRepository {
  abstract findById(id: string): Promise<SubBusiness | null>;
  abstract findByBusinessId(businessId: string): Promise<SubBusiness[]>;
  abstract findByWalletId(walletId: string): Promise<SubBusiness | null>;
  abstract save(subBusiness: SubBusiness): Promise<SubBusiness>;
  abstract delete(id: string): Promise<void>;
}
