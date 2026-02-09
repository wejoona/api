import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CreateUserLedgerIdentityUseCase } from '../domain/usecases/create-user-ledger-identity.usecase';

/**
 * Listens for user.registered events and creates a Blnk ledger identity.
 * This is the first step in the wallet lifecycle — identity must exist
 * before a balance can be created.
 */
@Injectable()
export class UserRegisteredListener {
  private readonly logger = new Logger(UserRegisteredListener.name);

  constructor(
    private readonly createLedgerIdentity: CreateUserLedgerIdentityUseCase,
  ) {}

  @OnEvent('user.registered')
  async handleUserRegistered(payload: {
    userId: string;
    phone: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    country?: string;
  }) {
    this.logger.log(
      `Creating Blnk ledger identity for new user: ${payload.userId}`,
    );

    try {
      const result = await this.createLedgerIdentity.execute({
        userId: payload.userId,
        email: payload.email || `${payload.phone}@korido.app`,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        country: payload.country || 'CI',
      });

      this.logger.log(
        `Blnk identity created: ${result.identityId}, balance: ${result.balanceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create Blnk identity for user ${payload.userId}: ${
          error instanceof Error ? error.message : 'Unknown'
        }`,
      );
      // Non-blocking — identity can be created lazily during wallet creation
    }
  }
}
