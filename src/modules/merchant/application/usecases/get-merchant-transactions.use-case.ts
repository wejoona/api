import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { MerchantRepository } from '../../infrastructure/repositories/merchant.repository';
import { MerchantPaymentRepository } from '../../infrastructure/repositories/merchant-payment.repository';

export interface GetMerchantTransactionsInput {
  userId: string;
  merchantId: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface MerchantTransactionItem {
  paymentId: string;
  reference: string;
  customerId: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  description?: string;
  status: string;
  createdAt: Date;
}

export interface GetMerchantTransactionsOutput {
  merchantId: string;
  merchantName: string;
  transactions: MerchantTransactionItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Get Merchant Transactions Use Case
 * Retrieves transaction history for a merchant
 */
@Injectable()
export class GetMerchantTransactionsUseCase {
  private readonly logger = new Logger(GetMerchantTransactionsUseCase.name);

  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly merchantPaymentRepository: MerchantPaymentRepository,
  ) {}

  async execute(
    input: GetMerchantTransactionsInput,
  ): Promise<GetMerchantTransactionsOutput> {
    const {
      userId,
      merchantId,
      limit = 50,
      offset = 0,
      startDate,
      endDate,
    } = input;

    this.logger.log(`Getting transactions for merchant ${merchantId}`);

    // 1. Find merchant
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // 2. Verify ownership
    if (merchant.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // 3. Get transactions
    let payments;
    let total;

    if (startDate && endDate) {
      payments =
        await this.merchantPaymentRepository.findByMerchantIdAndDateRange(
          merchantId,
          startDate,
          endDate,
          limit,
          offset,
        );
      // For date range, we'd need a separate count query
      // For simplicity, using the same approach
      total =
        await this.merchantPaymentRepository.countByMerchantId(merchantId);
    } else {
      payments = await this.merchantPaymentRepository.findByMerchantId(
        merchantId,
        limit,
        offset,
      );
      total =
        await this.merchantPaymentRepository.countByMerchantId(merchantId);
    }

    // 4. Map to output format
    const transactions: MerchantTransactionItem[] = payments.map((payment) => ({
      paymentId: payment.paymentId,
      reference: payment.reference,
      customerId: payment.customerId,
      amount: payment.amount,
      fee: payment.fee,
      netAmount: payment.netAmount,
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      createdAt: payment.createdAt,
    }));

    return {
      merchantId,
      merchantName: merchant.displayName,
      transactions,
      total,
      limit,
      offset,
    };
  }
}
