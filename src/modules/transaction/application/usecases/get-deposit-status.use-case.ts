import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { WalletRepository } from '../../../wallet/infrastructure/repositories/wallet.repository';
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../shared/domain/gateways';
import { TransactionStatus } from '../../domain/entities/transaction.entity';

export interface GetDepositStatusInput {
  userId: string;
  transactionId: string;
}

export interface GetDepositStatusOutput {
  transactionId: string;
  depositId: string;
  status: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  fee: number;
  createdAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class GetDepositStatusUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly walletRepository: WalletRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(input: GetDepositStatusInput): Promise<GetDepositStatusOutput> {
    const transaction = await this.transactionRepository.findById(
      input.transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify ownership
    const wallet = await this.walletRepository.findByUserId(input.userId);
    if (!wallet || wallet.id !== transaction.walletId) {
      throw new ForbiddenException('Not authorized to view this transaction');
    }

    // Only deposits can be queried for status
    if (transaction.type !== 'deposit') {
      throw new NotFoundException('Not a deposit transaction');
    }

    // Get live status from payment gateway if pending
    let status: string = transaction.status;
    if (transaction.isPending && transaction.yellowCardRef) {
      try {
        const depositStatus = await this.paymentGateway.getDepositStatus(
          transaction.yellowCardRef,
        );
        status = depositStatus.status;

        // Map provider status to transaction status and update if changed
        const mappedStatus = this.mapProviderStatus(depositStatus.status);
        if (mappedStatus !== transaction.status) {
          if (mappedStatus === 'completed') {
            transaction.complete();
          } else if (mappedStatus === 'failed') {
            transaction.fail('Payment failed');
          } else {
            transaction.updateStatus(mappedStatus);
          }
          await this.transactionRepository.save(transaction);
        }
      } catch {
        // If gateway fails, return local status
      }
    }

    const metadata = transaction.metadata || {};

    return {
      transactionId: transaction.id,
      depositId:
        (metadata.depositId as string) || transaction.yellowCardRef || '',
      status,
      amount: transaction.amount,
      sourceCurrency: (metadata.sourceCurrency as string) || 'XOF',
      targetCurrency: transaction.currency,
      rate: (metadata.rate as number) || 0,
      fee: (metadata.fee as number) || 0,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }

  private mapProviderStatus(providerStatus: string): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      pending: 'pending',
      processing: 'processing',
      completed: 'completed',
      failed: 'failed',
      expired: 'failed', // Map expired to failed
      cancelled: 'cancelled',
    };
    return statusMap[providerStatus] || 'pending';
  }
}
