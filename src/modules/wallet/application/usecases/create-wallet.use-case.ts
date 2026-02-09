import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '../../../providers/interfaces';

export interface CreateWalletInput {
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  countryCode?: string;
}

/**
 * Create Wallet Use Case
 *
 * Omnibus pattern: Blnk ledger balance is the ONLY required step.
 * Circle/Stellar per-user wallets are NOT created here — they are lazy,
 * created on demand when needed (sweep, non-custodial export, etc.).
 *
 * Flow:
 * 1. Create Blnk ledger balance (source of truth)
 * 2. Create local wallet entity with blnkBalanceId
 * 3. Emit wallet.created event
 */
@Injectable()
export class CreateWalletUseCase {
  private readonly logger = new Logger(CreateWalletUseCase.name);

  constructor(
    private readonly repository: WalletRepository,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: CreateWalletInput): Promise<WalletEntity> {
    const { userId } = input;

    this.logger.log(`Creating wallet for user ${userId}`);

    // Check if user already has a wallet
    const existingWallet = await this.repository.findByUserId(userId);
    if (existingWallet) {
      this.logger.log(`User ${userId} already has a wallet`);

      // If existing wallet doesn't have a Blnk balance, create one (migration path)
      if (!existingWallet.blnkBalanceId) {
        try {
          const blnkBalanceId = await this.ledgerProvider.createUserBalance(
            userId,
            'USDC',
          );
          existingWallet.linkToBlnk(blnkBalanceId);
          await this.repository.save(existingWallet);
          this.logger.log(
            `Linked existing wallet to Blnk balance: ${blnkBalanceId}`,
          );
        } catch (error) {
          this.logger.warn(
            `Failed to create Blnk balance for existing wallet: ${error instanceof Error ? error.message : 'Unknown'}`,
          );
        }
      }

      return existingWallet;
    }

    // Step 1: Create Blnk ledger balance (required — source of truth)
    let blnkBalanceId: string | undefined;
    try {
      this.logger.log(`Creating Blnk balance for user ${userId}`);
      blnkBalanceId = await this.ledgerProvider.createUserBalance(
        userId,
        'USDC',
      );
      this.logger.log(`Blnk balance created: ${blnkBalanceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create Blnk balance for user ${userId}: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      // Blnk is the source of truth — if it fails, we still create the wallet
      // but log a critical warning. The balance can be created on next access.
    }

    // Step 2: Create local wallet entity with blnkBalanceId
    // Circle/Stellar per-user wallets are NOT created here (lazy / omnibus pattern)
    const wallet = WalletEntity.create({
      userId,
      blnkBalanceId,
      currency: 'USDC',
    });

    const savedWallet = await this.repository.save(wallet);
    this.logger.log(`Wallet created successfully for user ${userId}`);

    // Step 3: Emit event
    this.eventEmitter.emit('wallet.created', {
      userId,
      walletId: savedWallet.id,
      blnkBalanceId,
      currency: 'USDC',
      timestamp: new Date(),
    });

    return savedWallet;
  }
}
