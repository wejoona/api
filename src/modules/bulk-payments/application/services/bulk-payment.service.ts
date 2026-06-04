import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { AppException } from '../../../../common/exceptions';
import { ERROR_CODES } from '../../../../common/constants/error-codes';

@Injectable()
export class BulkPaymentService {
  constructor(
    private readonly bulkPaymentRepository: BulkPaymentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async createBatch(
    walletId: string,
    dto: CreateBulkPaymentDto,
  ): Promise<BulkPaymentResponseDto> {
    this.assertBulkPaymentsAvailable();

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

    // Emit event for async processing
    this.eventEmitter.emit('bulk-payment.submitted', {
      bulkPaymentId: saved.id,
      walletId,
      itemCount: items.length,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
    });

    return this.mapToResponseDto(saved);
  }

  async getBatches(walletId: string): Promise<BulkPaymentListResponseDto> {
    if (!this.isBulkPaymentsEnabled()) {
      return {
        batches: [],
        data: [],
        available: false,
        status: 'unavailable',
        reason: 'bulk_payments_unavailable',
      };
    }

    const bulkPayments =
      await this.bulkPaymentRepository.findByWalletId(walletId);
    const batches = bulkPayments.map((bp) => this.mapToResponseDto(bp));

    return {
      batches,
      data: batches,
      available: true,
      status: 'available',
      reason: null,
    };
  }

  isBulkPaymentsEnabled(): boolean {
    return this.configService.get<boolean>('bulkPayments.enabled') === true;
  }

  private assertBulkPaymentsAvailable(): void {
    if (this.isBulkPaymentsEnabled()) {
      return;
    }

    throw AppException.badRequest(
      ERROR_CODES.BULK_PAYMENTS_UNAVAILABLE,
      'Bulk payments are not available yet',
    );
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
