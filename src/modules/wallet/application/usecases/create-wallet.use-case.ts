import { Injectable, Inject, Logger } from '@nestjs/common';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { WalletRepository } from '../../infrastructure/repositories/wallet.repository';
import {
  IDENTITY_PROVIDER,
  IIdentityProvider,
  WALLET_PROVIDER,
  IWalletProvider,
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
 * Orchestrates wallet creation across all three systems:
 * 1. Circle - Create user and blockchain wallet
 * 2. Blnk - Create ledger balance for tracking
 * 3. PostgreSQL - Store wallet record with all provider IDs
 *
 * This ensures all systems stay in sync from the start.
 */
@Injectable()
export class CreateWalletUseCase {
  private readonly logger = new Logger(CreateWalletUseCase.name);

  constructor(
    private readonly repository: WalletRepository,
    @Inject(IDENTITY_PROVIDER)
    private readonly identityProvider: IIdentityProvider,
    @Inject(WALLET_PROVIDER)
    private readonly walletProvider: IWalletProvider,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
  ) {}

  async execute(input: CreateWalletInput): Promise<WalletEntity> {
    const { userId, userName, userEmail, userPhone, countryCode } = input;

    this.logger.log(`Creating wallet for user ${userId}`);

    // Check if user already has a wallet
    const existingWallet = await this.repository.findByUserId(userId);
    if (existingWallet) {
      this.logger.log(`User ${userId} already has a wallet`);
      return existingWallet;
    }

    let circleUserId: string | undefined;
    let circleWalletId: string | undefined;
    let circleWalletAddress: string | undefined;
    let blnkBalanceId: string | undefined;

    // Step 1: Create Circle user
    try {
      this.logger.log(`Creating Circle user for ${userId}`);
      const circleUser = await this.identityProvider.createUser({
        userId,
        email: userEmail,
        phone: userPhone,
        countryCode: countryCode || 'CI',
      });
      circleUserId = circleUser.providerId;
      this.logger.log(`Circle user created: ${circleUserId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to create Circle user: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      // Continue - Circle user creation is non-blocking
    }

    // Step 2: Create Circle wallet (requires Circle user)
    if (circleUserId) {
      try {
        this.logger.log(`Creating Circle wallet for user ${userId}`);
        const circleWallet = await this.walletProvider.createWallet({
          userId,
          userProviderId: circleUserId,
          name: userName || `User ${userId}`,
          metadata: {
            joonapayUserId: userId,
          },
        });
        circleWalletId = circleWallet.providerId;
        circleWalletAddress = circleWallet.address;
        this.logger.log(`Circle wallet created: ${circleWalletAddress}`);
      } catch (error) {
        this.logger.warn(
          `Failed to create Circle wallet: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
        // Continue - wallet creation can be retried
      }
    }

    // Step 3: Create Blnk ledger balance
    try {
      this.logger.log(`Creating Blnk balance for user ${userId}`);
      blnkBalanceId = await this.ledgerProvider.createUserBalance(
        userId,
        'USDC',
      );
      this.logger.log(`Blnk balance created: ${blnkBalanceId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to create Blnk balance: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      // Continue - Blnk balance creation can be retried
    }

    // Step 4: Create local wallet entity with all provider IDs
    const wallet = WalletEntity.create({
      userId,
      circleWalletId,
      circleWalletAddress,
      currency: 'USDC',
    });

    const savedWallet = await this.repository.save(wallet);
    this.logger.log(`Wallet created successfully for user ${userId}`);

    return savedWallet;
  }
}
