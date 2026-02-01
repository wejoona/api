import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BulkPaymentRepository } from '../../domain/repositories/bulk-payment.repository';
import {
  BulkPaymentEntity,
  CreateBulkPaymentItemProps,
} from '../../domain/entities/bulk-payment.entity';
import { CreateBulkPaymentDto } from '../dto/create-bulk-payment.dto';
import {
  BulkPaymentResponseDto,
  BulkPaymentItemResponseDto,
  BulkPaymentListResponseDto,
  FailedReportResponseDto,
} from '../dto/bulk-payment-response.dto';

@Injectable()
export class BulkPaymentService {
  constructor(private readonly bulkPaymentRepository: BulkPaymentRepository) {}

  async createBatch(
    walletId: string,
    dto: CreateBulkPaymentDto,
  ): Promise<BulkPaymentResponseDto> {
    // Validate items
    if (!dto.payments || dto.payments.length === 0) {
      throw new BadRequestException('Batch must contain at least one payment');
    }

    // Create bulk payment entity
    const items: CreateBulkPaymentItemProps[] = dto.payments.map((payment) => ({
      recipientPhone: payment.phone,
      recipientName: payment.name,
      amount: payment.amount,
      description: payment.description,
    }));

    const bulkPayment = BulkPaymentEntity.create({
      walletId,
      name: dto.name,
      items,
    });

    // Submit for processing
    bulkPayment.submit();

    // Save to database
    const saved = await this.bulkPaymentRepository.save(bulkPayment);

    // TODO: Trigger async processing (via queue or event)
    // For now, we'll just return the created batch
    // In production, this should emit an event or queue a job

    return this.mapToResponseDto(saved);
  }

  async getBatches(walletId: string): Promise<BulkPaymentListResponseDto> {
    const bulkPayments =
      await this.bulkPaymentRepository.findByWalletId(walletId);

    return {
      batches: bulkPayments.map((bp) => this.mapToResponseDto(bp)),
    };
  }

  async getBatch(
    id: string,
    walletId: string,
  ): Promise<BulkPaymentResponseDto> {
    const bulkPayment = await this.bulkPaymentRepository.findById(id);

    if (!bulkPayment) {
      throw new NotFoundException('Batch not found');
    }

    if (bulkPayment.walletId !== walletId) {
      throw new NotFoundException('Batch not found');
    }

    return this.mapToResponseDto(bulkPayment);
  }

  async getFailedReport(
    id: string,
    walletId: string,
  ): Promise<FailedReportResponseDto> {
    const bulkPayment = await this.bulkPaymentRepository.findById(id);

    if (!bulkPayment) {
      throw new NotFoundException('Batch not found');
    }

    if (bulkPayment.walletId !== walletId) {
      throw new NotFoundException('Batch not found');
    }

    const failedItems = bulkPayment.failedItems;

    // Generate CSV
    const csv = this.generateFailedCsv(failedItems);

    return { csv };
  }

  private mapToResponseDto(
    bulkPayment: BulkPaymentEntity,
  ): BulkPaymentResponseDto {
    const items = bulkPayment.getItems();

    return {
      id: bulkPayment.id,
      name: bulkPayment.name,
      payments: items.map((item) => this.mapItemToResponseDto(item)),
      status: bulkPayment.status,
      createdAt: bulkPayment.createdAt.toISOString(),
      processedAt: bulkPayment.processedAt?.toISOString() || null,
      totalCount: bulkPayment.totalRecipients,
      successCount: bulkPayment.successCount,
      failedCount: bulkPayment.failedCount,
      totalAmount: bulkPayment.totalAmount,
    };
  }

  private mapItemToResponseDto(item: any): BulkPaymentItemResponseDto {
    return {
      id: item.id,
      phone: item.recipientPhone,
      amount: item.amount,
      description: item.description,
      isValid: item.status !== 'failed',
      error: item.errorMessage,
    };
  }

  private generateFailedCsv(failedItems: any[]): string {
    const lines = ['phone,amount,description,error'];

    for (const item of failedItems) {
      const phone = item.recipientPhone;
      const amount = item.amount;
      const description = item.description || '';
      const error = item.errorMessage || '';

      lines.push(`${phone},${amount},${description},${error}`);
    }

    return lines.join('\n');
  }
}
