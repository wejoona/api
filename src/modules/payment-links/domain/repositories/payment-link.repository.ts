import { PaymentLink } from '../entities/payment-link.entity';

export abstract class PaymentLinkRepository {
  abstract findById(id: string): Promise<PaymentLink | null>;
  abstract findByCode(code: string): Promise<PaymentLink | null>;
  abstract findByUserId(userId: string): Promise<PaymentLink[]>;
  abstract findActiveByUserId(userId: string): Promise<PaymentLink[]>;
  abstract save(paymentLink: PaymentLink): Promise<PaymentLink>;
  abstract delete(id: string): Promise<void>;
}
