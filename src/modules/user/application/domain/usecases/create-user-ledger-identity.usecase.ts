import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LEDGER_IDENTITY_PROVIDER,
  ILedgerIdentityProvider,
  LEDGER_PROVIDER,
  ILedgerProvider,
} from '@modules/providers/interfaces';

export interface CreateUserLedgerIdentityInput {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
}

export interface CreateUserLedgerIdentityOutput {
  identityId: string;
  balanceId: string;
  userId: string;
}

/**
 * Create User Ledger Identity Use Case
 *
 * Creates a user's identity in Blnk ledger and their USDC balance.
 * This links the JoonaPay user to their ledger balance for ownership tracking.
 *
 * Flow:
 * 1. Create identity in Blnk (links userId to ledger)
 * 2. Create USDC balance for the user
 * 3. Emit events for downstream processing (balance monitors, etc.)
 */
@Injectable()
export class CreateUserLedgerIdentityUseCase {
  private readonly logger = new Logger(CreateUserLedgerIdentityUseCase.name);

  constructor(
    @Inject(LEDGER_IDENTITY_PROVIDER)
    private readonly identityProvider: ILedgerIdentityProvider,
    @Inject(LEDGER_PROVIDER)
    private readonly ledgerProvider: ILedgerProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    input: CreateUserLedgerIdentityInput,
  ): Promise<CreateUserLedgerIdentityOutput> {
    this.logger.log(`Creating ledger identity for user: ${input.userId}`);

    // 1. Create identity in Blnk ledger
    const identity = await this.identityProvider.createLedgerIdentity({
      type: 'individual',
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      country: input.country,
      metadata: {
        joonapayUserId: input.userId,
        createdAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Created ledger identity: ${identity.identityId}`);

    // 2. Create USDC balance for user
    const balanceId = await this.ledgerProvider.createUserBalance(
      input.userId,
      'USDC',
    );

    this.logger.log(`Created USDC balance: ${balanceId}`);

    // 3. Emit event for downstream processing
    this.eventEmitter.emit('user.ledger-identity.created', {
      userId: input.userId,
      identityId: identity.identityId,
      balanceId,
      email: input.email,
      timestamp: new Date().toISOString(),
    });

    return {
      identityId: identity.identityId,
      balanceId,
      userId: input.userId,
    };
  }
}
