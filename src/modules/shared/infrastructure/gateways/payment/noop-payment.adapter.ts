import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentGateway,
  CreateSubwalletRequest,
  Subwallet,
  BalanceResponse,
  OnRampChannel,
  InitiateDepositRequest,
  DepositResponse,
  InternalTransferRequest,
  ExternalTransferRequest,
  TransferResponse,
  RateRequest,
  RateResponse,
  SubmitKycRequest,
  KycResponse,
  WebhookEvent,
} from '../../../domain/gateways/payment.gateway';

/**
 * No-op Payment Gateway Adapter
 *
 * Used when Yellow Card integration is disabled (YELLOW_CARD_ENABLED=false).
 * Transactional methods throw an error indicating the provider is disabled.
 * Discovery methods return empty results so mobile clients can render an
 * unavailable state without receiving a 500.
 */
@Injectable()
export class NoopPaymentAdapter implements IPaymentGateway {
  private readonly logger = new Logger(NoopPaymentAdapter.name);
  readonly providerName = 'noop (Yellow Card disabled)';

  private throwDisabled(method: string): never {
    const msg = `Payment gateway disabled (YELLOW_CARD_ENABLED=false). Cannot call ${method}.`;
    this.logger.warn(msg);
    throw new Error(msg);
  }

  async createSubwallet(_req: CreateSubwalletRequest): Promise<Subwallet> { this.throwDisabled('createSubwallet'); }
  async getBalance(_id: string): Promise<BalanceResponse> { this.throwDisabled('getBalance'); }
  async getOnRampChannels(
    country: string,
    currency?: string,
  ): Promise<OnRampChannel[]> {
    this.logger.warn(
      `Payment gateway disabled (YELLOW_CARD_ENABLED=false). Returning no on-ramp channels for ${country}${currency ? `/${currency}` : ''}.`,
    );
    return [];
  }
  async initiateDeposit(_req: InitiateDepositRequest): Promise<DepositResponse> { this.throwDisabled('initiateDeposit'); }
  async getDepositStatus(_id: string): Promise<DepositResponse> { this.throwDisabled('getDepositStatus'); }
  async internalTransfer(_req: InternalTransferRequest): Promise<TransferResponse> { this.throwDisabled('internalTransfer'); }
  async externalTransfer(_req: ExternalTransferRequest): Promise<TransferResponse> { this.throwDisabled('externalTransfer'); }
  async getTransferStatus(_id: string): Promise<TransferResponse> { this.throwDisabled('getTransferStatus'); }
  async getRate(_req: RateRequest): Promise<RateResponse> { this.throwDisabled('getRate'); }
  async submitKyc(_req: SubmitKycRequest): Promise<KycResponse> { this.throwDisabled('submitKyc'); }
  async getKycStatus(_id: string): Promise<KycResponse> { this.throwDisabled('getKycStatus'); }
  verifyWebhookSignature(_payload: string, _signature: string): boolean { this.throwDisabled('verifyWebhookSignature'); }
  parseWebhookEvent(_payload: Record<string, unknown>): WebhookEvent { this.throwDisabled('parseWebhookEvent'); }
}
