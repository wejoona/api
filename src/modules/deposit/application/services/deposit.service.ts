import { Injectable, Logger, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ILedgerProvider } from '../../../providers/interfaces';
import { DepositRepository, CreateDepositParams, UpdateDepositParams, ListDepositsParams } from '../../infrastructure/repositories/deposit.repository';
import { PaymentProviderFactory } from '../../infrastructure/providers/payment-provider.factory';
import { DepositTokenService } from './deposit-token.service';
import { DepositEntity } from '../../domain/entities/deposit.entity';
import { DepositStatus } from '../../domain/enums/deposit-status.enum';
import { PaymentMethodType } from '../../domain/enums/payment-method-type.enum';
import { DepositInitiatedEvent, DepositCompletedEvent, DepositFailedEvent } from '../../domain/events/deposit.events';
import { InitiateDepositDto } from '../dto/initiate-deposit.dto';
import { ConfirmDepositDto } from '../dto/confirm-deposit.dto';
import { InitiateDepositResponseDto, DepositStatusResponseDto, ProviderInfoDto } from '../dto/deposit-response.dto';

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);
  private readonly usdcXofRate: number;

  constructor(
    private readonly depositRepository: DepositRepository,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly tokenService: DepositTokenService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('LEDGER_PROVIDER')
    private readonly ledgerProvider: ILedgerProvider,
  ) {
    this.usdcXofRate = this.configService.get<number>('USDC_XOF_RATE', 600);
  }

  async initiateDeposit(
    userId: string,
    dto: InitiateDepositDto,
    userPhoneNumber?: string,
  ): Promise<InitiateDepositResponseDto> {
    this.logger.log(`Initiating deposit for user ${userId}: ${dto.amount} ${dto.currency}`);

    try {
      const provider = this.providerFactory.getProvider(dto.providerCode);
      const phoneNumber = dto.phoneNumber || userPhoneNumber;

      if (!phoneNumber) {
        throw new BadRequestException('Phone number is required');
      }

      // Create deposit record
      const depositParams: CreateDepositParams = {
        userId,
        amount: BigInt(dto.amount),
        currency: dto.currency,
        providerCode: dto.providerCode,
        paymentMethodType: provider.getPaymentMethodType(),
        phoneNumber,
        metadata: {
          initiatedAt: Date.now(),
          userAgent: 'JoonaPay Mobile App', // Could be passed from request
        },
      };

      const deposit = await this.depositRepository.create(depositParams);

      // Initiate charge with provider
      const chargeResult = await provider.initiateCharge({
        amount: dto.amount,
        currency: dto.currency,
        phoneNumber,
        userId,
        transactionId: deposit.id,
        metadata: {
          depositId: deposit.id,
          userId,
        },
      });

      // Update deposit with provider transaction ID and expiration
      await this.depositRepository.update(deposit.id, {
        providerTransactionId: chargeResult.providerTransactionId,
        expiresAt: chargeResult.expiresAt,
        status: chargeResult.paymentMethodType === PaymentMethodType.OTP 
          ? DepositStatus.PENDING_OTP 
          : DepositStatus.PENDING_CONFIRMATION,
      });

      // Generate encrypted token
      const token = this.tokenService.generateToken(
        deposit.id,
        dto.amount,
        dto.currency,
        phoneNumber,
        dto.providerCode,
        chargeResult.providerTransactionId,
        chargeResult.paymentMethodType,
        userId,
      );

      // Emit event
      this.eventEmitter.emit('deposit.initiated', new DepositInitiatedEvent(
        deposit.id,
        userId,
        BigInt(dto.amount),
        dto.currency,
        dto.providerCode,
        chargeResult.paymentMethodType,
        phoneNumber,
      ));

      return {
        depositId: deposit.id,
        token,
        paymentMethodType: chargeResult.paymentMethodType,
        instructions: chargeResult.instructions,
        qrCodeData: chargeResult.qrCodeData,
        deepLinkUrl: chargeResult.deepLinkUrl,
        expiresAt: chargeResult.expiresAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to initiate deposit for user ${userId}:`, error);
      throw error instanceof BadRequestException ? error : 
        new BadRequestException('Failed to initiate deposit');
    }
  }

  async confirmDeposit(dto: ConfirmDepositDto): Promise<DepositStatusResponseDto> {
    this.logger.log(`Confirming deposit with token`);

    try {
      // Decrypt token
      const tokenPayload = this.tokenService.decryptToken(dto.token);

      // Get deposit
      const deposit = await this.depositRepository.findByIdAndUserId(
        tokenPayload.depositId,
        tokenPayload.userId,
      );

      if (!deposit) {
        throw new NotFoundException('Deposit not found');
      }

      if (deposit.status === DepositStatus.COMPLETED) {
        throw new ConflictException('Deposit already completed');
      }

      if (deposit.status === DepositStatus.FAILED || deposit.status === DepositStatus.EXPIRED) {
        throw new ConflictException('Deposit cannot be confirmed');
      }

      // Get provider and confirm charge
      const provider = this.providerFactory.getProvider(deposit.providerCode);
      const confirmResult = await provider.confirmCharge({
        providerTransactionId: tokenPayload.providerTransactionId,
        otp: dto.otp,
      });

      // Update deposit based on confirmation result
      if (confirmResult.status === 'success') {
        await this.completeDeposit(deposit, confirmResult.providerReference);
      } else if (confirmResult.status === 'failed') {
        await this.failDeposit(deposit, confirmResult.failureReason || 'Payment failed');
      }
      // For 'pending', we keep polling or wait for webhook

      // Return updated deposit
      const updatedDeposit = await this.depositRepository.findById(deposit.id);
      return this.mapToStatusResponse(updatedDeposit!);
    } catch (error) {
      this.logger.error('Failed to confirm deposit:', error);
      throw error instanceof NotFoundException || error instanceof ConflictException
        ? error 
        : new BadRequestException('Failed to confirm deposit');
    }
  }

  async getDeposit(depositId: string, userId: string): Promise<DepositStatusResponseDto> {
    const deposit = await this.depositRepository.findByIdAndUserId(depositId, userId);

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    return this.mapToStatusResponse(deposit);
  }

  async listDeposits(params: ListDepositsParams): Promise<{ deposits: DepositStatusResponseDto[]; total: number; hasMore: boolean }> {
    const { deposits, total } = await this.depositRepository.listByUser(params);

    return {
      deposits: deposits.map(d => this.mapToStatusResponse(d)),
      total,
      hasMore: (params.offset || 0) + deposits.length < total,
    };
  }

  async handleWebhook(providerCode: string, payload: any): Promise<void> {
    this.logger.log(`Handling webhook from ${providerCode}:`, payload);

    // Implementation depends on provider webhook format
    // For now, this is a placeholder
    this.logger.warn('Webhook handling not implemented yet');
  }

  async getProviders(): Promise<ProviderInfoDto[]> {
    return this.providerFactory.getProviderInfo();
  }

  private async completeDeposit(deposit: DepositEntity, providerReference?: string): Promise<void> {
    this.logger.log(`Completing deposit ${deposit.id}`);

    try {
      // Calculate USDC amount
      const xofAmount = Number(deposit.amount);
      const usdcAmount = BigInt(Math.round((xofAmount / this.usdcXofRate) * 1000000)); // Convert to micro-USDC

      // Record in ledger
      const ledgerResult = await this.ledgerProvider.recordDeposit({
        userId: deposit.userId,
        amount: usdcAmount,
        currency: 'USD',
        reference: `deposit-${deposit.id}`,
        description: `Mobile money deposit via ${deposit.providerCode}`,
        provider: 'yellowcard', // For now, using yellowcard as default
        externalId: deposit.providerTransactionId,
        fee: BigInt(0), // No fee for deposits in MVP
        metadata: {
          depositId: deposit.id,
          sourceAmount: deposit.amount.toString(),
          sourceCurrency: deposit.currency,
          rate: this.usdcXofRate,
          provider: deposit.providerCode,
        },
      });

      // Update deposit status
      await this.depositRepository.update(deposit.id, {
        status: DepositStatus.COMPLETED,
        providerReference,
        blnkTransactionId: ledgerResult.transactionId,
        completedAt: new Date(),
      });

      // Emit completion event
      this.eventEmitter.emit('deposit.completed', new DepositCompletedEvent(
        deposit.id,
        deposit.userId,
        deposit.amount,
        deposit.currency,
        deposit.providerCode,
        providerReference,
        ledgerResult.transactionId,
      ));

      this.logger.log(`Deposit ${deposit.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to complete deposit ${deposit.id}:`, error);
      await this.failDeposit(deposit, 'Failed to credit account');
    }
  }

  private async failDeposit(deposit: DepositEntity, reason: string): Promise<void> {
    this.logger.log(`Failing deposit ${deposit.id}: ${reason}`);

    await this.depositRepository.update(deposit.id, {
      status: DepositStatus.FAILED,
      failureReason: reason,
    });

    // Emit failure event
    this.eventEmitter.emit('deposit.failed', new DepositFailedEvent(
      deposit.id,
      deposit.userId,
      deposit.amount,
      deposit.currency,
      reason,
      deposit.providerCode,
    ));
  }

  private mapToStatusResponse(deposit: DepositEntity): DepositStatusResponseDto {
    return {
      id: deposit.id,
      status: deposit.status,
      amount: Number(deposit.amount),
      currency: deposit.currency,
      providerCode: deposit.providerCode,
      paymentMethodType: deposit.paymentMethodType,
      providerReference: deposit.providerReference,
      failureReason: deposit.failureReason,
      createdAt: deposit.createdAt,
      completedAt: deposit.completedAt,
    };
  }
}