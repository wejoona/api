import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BlnkLedgerAdapter } from '../../../../providers/blnk/adapters/blnk-ledger.adapter';
import { NtmClientService } from '../../../../shared/infrastructure/services/ntm-client.service';

export interface DepositCompletedEvent {
  depositId: string;
  userId: string;
  amount: number;
  usdcAmount: number;
  provider: string;
  phoneNumber: string;
  exchangeRate: number;
}

@Injectable()
export class DepositCompletedListener {
  private readonly logger = new Logger(DepositCompletedListener.name);

  constructor(
    private readonly blnkAdapter: BlnkLedgerAdapter,
    private readonly ntmClient: NtmClientService,
  ) {}

  @OnEvent('deposit.completed')
  async handle(event: DepositCompletedEvent): Promise<void> {
    const { depositId, userId, amount, usdcAmount, provider, exchangeRate } = event;
    this.logger.log(`Processing deposit.completed: ${depositId}, ${usdcAmount} USDC for user ${userId}`);

    try {
      const amountBigint = BigInt(Math.round(usdcAmount * 1e6));
      await this.blnkAdapter.recordDeposit({
        userId, amount: amountBigint, currency: 'USDC',
        reference: `deposit_${depositId}`,
        description: `Mobile money deposit via ${provider}: ${amount} XOF → ${usdcAmount} USDC`,
        provider: 'mobile_money', externalId: depositId,
      });
      this.logger.log(`Blnk credit OK: deposit ${depositId}`);
    } catch (error) {
      this.logger.error(`Blnk credit FAILED: deposit ${depositId}: ${error.message}`);
    }

    try {
      await this.ntmClient.send({
        template: 'deposit.completed', channel: 'push',
        recipient: { userId },
        variables: { amount: amount.toLocaleString(), usdcAmount: usdcAmount.toFixed(2), provider, currency: 'XOF', exchangeRate },
      });
    } catch (error) {
      this.logger.error(`NTM notification FAILED: deposit ${depositId}: ${error.message}`);
    }
  }
}
