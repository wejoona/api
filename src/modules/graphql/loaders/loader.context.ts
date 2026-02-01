import { Injectable, Scope } from '@nestjs/common';
import { UserLoader } from './user.loader';
import { WalletLoader } from './wallet.loader';
import { TransactionLoader } from './transaction.loader';
import { BeneficiaryLoader } from './beneficiary.loader';

/**
 * Loader context that provides access to all DataLoaders
 * Scoped to REQUEST to ensure loaders are fresh per GraphQL request
 */
@Injectable({ scope: Scope.REQUEST })
export class LoaderContext {
  constructor(
    public readonly user: UserLoader,
    public readonly wallet: WalletLoader,
    public readonly transaction: TransactionLoader,
    public readonly beneficiary: BeneficiaryLoader,
  ) {}
}
