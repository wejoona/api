import { BulkPaymentEntity } from '../entities/bulk-payment.entity';

export abstract class BulkPaymentRepository {
  abstract findById(id: string): Promise<BulkPaymentEntity | null>;
  abstract findByWalletId(walletId: string): Promise<BulkPaymentEntity[]>;
  abstract save(bulkPayment: BulkPaymentEntity): Promise<BulkPaymentEntity>;
  abstract update(bulkPayment: BulkPaymentEntity): Promise<BulkPaymentEntity>;
  abstract delete(id: string): Promise<void>;
}
