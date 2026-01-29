import { Injectable, Logger } from '@nestjs/common';
import { BillPaymentRepository } from '../../infrastructure/repositories';
import {
  GetPaymentHistoryQuery,
  PaginatedBillPaymentHistory,
  BillCategory,
  BillPaymentStatus,
} from '../../domain/types';

export interface GetPaymentHistoryInput {
  userId: string;
  page?: number;
  limit?: number;
  category?: BillCategory;
  status?: BillPaymentStatus;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class GetPaymentHistoryUseCase {
  private readonly logger = new Logger(GetPaymentHistoryUseCase.name);

  constructor(private readonly paymentRepository: BillPaymentRepository) {}

  async execute(
    input: GetPaymentHistoryInput,
  ): Promise<PaginatedBillPaymentHistory> {
    this.logger.debug(
      `Getting payment history: userId=${input.userId}, page=${input.page}, category=${input.category}`,
    );

    const query: GetPaymentHistoryQuery = {
      userId: input.userId,
      page: input.page || 1,
      limit: input.limit || 20,
      category: input.category,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
    };

    const result = await this.paymentRepository.getPaginatedHistory(query);

    this.logger.debug(
      `Found ${result.items.length} payments (total: ${result.pagination.total})`,
    );

    return result;
  }
}
