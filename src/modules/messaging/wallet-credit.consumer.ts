import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { PulsarService } from './pulsar.service';
import { UserRepository } from '../user/infrastructure/repositories/user.repository';
import { ILedgerProvider } from '../providers/interfaces/ledger.interface';
import { v4 as uuid } from 'uuid';

/** Event shape from PaySwitch wallet.credit topic */
interface WalletCreditEvent {
  version: number;
  eventId: string;
  traceId: string;
  timestamp: string;
  source: string;
  type: 'wallet.credit';
  payload: {
    switchTransactionId: string;
    userId: string; // phone number
    amount: number;
    currency: string;
    reason: 'deposit' | 'refund' | 'settlement' | 'reversal';
    sourceReference: string;
    sourceSystem: string;
    idempotencyKey: string;
  };
}

const TOPIC_WALLET_CREDIT = 'persistent://korido/dev/wallet.credit';
const TOPIC_WALLET_CREDITED = 'persistent://korido/dev/wallet.credited';
const SUBSCRIPTION = 'korido-wallet-credit-sub';

@Injectable()
export class WalletCreditConsumer implements OnModuleInit {
  private readonly logger = new Logger(WalletCreditConsumer.name);

  constructor(
    private readonly pulsar: PulsarService,
    private readonly userRepository: UserRepository,
    @Inject('LEDGER_PROVIDER')
    private readonly ledger: ILedgerProvider,
  ) {}

  async onModuleInit() {
    if (!this.pulsar.isEnabled()) return;

    await this.pulsar.subscribe(
      TOPIC_WALLET_CREDIT,
      SUBSCRIPTION,
      this.handleWalletCredit.bind(this),
    );
    this.logger.log('Listening for wallet.credit events');
  }

  private async handleWalletCredit(
    event: WalletCreditEvent,
    ack: () => Promise<void>,
    nack: () => void,
  ): Promise<void> {
    const { payload } = event;
    const traceId = event.traceId;

    this.logger.log(
      `[${traceId}] wallet.credit: ${payload.amount} ${payload.currency} → ${payload.userId} (${payload.reason})`,
    );

    try {
      // 1. Find user by phone number
      const user = await this.userRepository.findByPhone(payload.userId);
      if (!user) {
        this.logger.error(`[${traceId}] User not found for phone: ${payload.userId}`);
        await ack(); // Don't retry — user doesn't exist
        return;
      }

      // 2. Credit via Blnk ledger using idempotency key as reference
      const result = await this.ledger.recordDeposit({
        userId: user.id,
        amount: BigInt(Math.round(payload.amount * 1_000_000)), // USDC precision (6 decimals)
        currency: payload.currency,
        reference: payload.idempotencyKey,
        description: `PaySwitch ${payload.reason}: stx=${payload.switchTransactionId}`,
        provider: payload.sourceSystem as any,
        externalId: payload.switchTransactionId,
      });

      this.logger.log(
        `[${traceId}] Wallet credited: ${payload.amount} ${payload.currency} → user ${user.id} (txn: ${result.transactionId})`,
      );

      // 3. Fetch post-credit balance
      let walletBalance = 0;
      try {
        const balanceInfo = await this.ledger.getUserBalance(
          user.id,
          payload.currency,
        );
        if (balanceInfo) {
          // Convert from bigint (6 decimal USDC precision) to number
          walletBalance = Number(balanceInfo.balance) / 1_000_000;
        }
      } catch (balanceErr) {
        this.logger.warn(
          `[${traceId}] Failed to fetch post-credit balance for user ${user.id}: ${balanceErr.message}`,
        );
      }

      // 4. Publish wallet.credited confirmation back to PaySwitch
      await this.pulsar.publish(TOPIC_WALLET_CREDITED, {
        version: 1,
        eventId: uuid(),
        traceId,
        timestamp: new Date().toISOString(),
        source: 'korido',
        type: 'wallet.credited',
        payload: {
          switchTransactionId: payload.switchTransactionId,
          userId: payload.userId,
          amount: payload.amount,
          currency: payload.currency,
          walletBalance,
          blnkTransactionId: result.transactionId,
          idempotencyKey: payload.idempotencyKey,
        },
      });

      await ack();
    } catch (err) {
      this.logger.error(
        `[${traceId}] Failed to process wallet.credit: ${err.message}`,
      );
      nack(); // Retry via Pulsar redelivery
    }
  }
}
