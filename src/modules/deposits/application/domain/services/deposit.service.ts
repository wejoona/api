import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Deposit, DepositStatus, ProviderCode } from '../entities/deposit.entity';
import { DepositTokenService, DepositTokenPayload } from './deposit-token.service';
import { DEPOSIT_PROVIDER, IDepositProvider } from './deposit-provider.interface';
import { InitiateDepositDto } from '../../dto/requests/initiate-deposit.dto';
import { ConfirmDepositDto } from '../../dto/requests/confirm-deposit.dto';
import { DepositResponseDto, DepositProviderDto } from '../../dto/responses/deposit-response.dto';

const MOCK_EXCHANGE_RATE = 600; // 1 USDC = 600 XOF

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    @InjectRepository(Deposit) private readonly depositRepo: Repository<Deposit>,
    @Inject(DEPOSIT_PROVIDER) private readonly provider: IDepositProvider,
    private readonly tokenService: DepositTokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getProviders(): Promise<DepositProviderDto[]> {
    return this.provider.getSupportedProviders();
  }

  async initiate(userId: string, dto: InitiateDepositDto): Promise<DepositResponseDto> {
    const { amount, phoneNumber, provider } = dto;
    const exchangeRate = MOCK_EXCHANGE_RATE;
    const usdcAmount = +(amount / exchangeRate).toFixed(6);

    const providers = this.provider.getSupportedProviders();
    const providerInfo = providers.find((p) => p.code === provider);
    if (!providerInfo || !providerInfo.available) {
      throw new BadRequestException(`Provider ${provider} is not available`);
    }

    const deposit = this.depositRepo.create({
      userId, amount, usdcAmount, exchangeRate, provider, phoneNumber,
      paymentMethodType: providerInfo.paymentMethodType,
      status: DepositStatus.INITIATED,
    });
    await this.depositRepo.save(deposit);

    this.logger.log(`Deposit initiated: ${deposit.id}, ${amount} XOF → ${usdcAmount} USDC via ${provider}`);

    const result = await this.provider.initiate({ depositId: deposit.id, amount, phoneNumber, provider });

    deposit.providerReference = result.providerReference;
    deposit.status = DepositStatus.PENDING_CONFIRMATION;
    await this.depositRepo.save(deposit);

    const token = this.tokenService.encrypt({
      depositId: deposit.id, userId, amount, provider, phoneNumber, timestamp: Date.now(),
    });

    return {
      id: deposit.id, amount: deposit.amount, usdcAmount: deposit.usdcAmount,
      exchangeRate: deposit.exchangeRate, provider: deposit.provider,
      paymentMethodType: deposit.paymentMethodType, status: deposit.status,
      token, instructions: result.instructions, qrCodeData: result.qrCodeData,
      deepLinkUrl: result.deepLinkUrl, createdAt: deposit.createdAt,
    };
  }

  async confirm(userId: string, dto: ConfirmDepositDto): Promise<DepositResponseDto> {
    const payload = this.tokenService.decrypt(dto.token);
    if (!payload) throw new BadRequestException('Invalid or expired deposit token');
    if (payload.userId !== userId) throw new BadRequestException('Token does not belong to this user');

    const deposit = await this.depositRepo.findOne({ where: { id: payload.depositId, userId } });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== DepositStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(`Deposit cannot be confirmed in status: ${deposit.status}`);
    }

    deposit.status = DepositStatus.PROCESSING;
    await this.depositRepo.save(deposit);

    const result = await this.provider.confirm({
      depositId: deposit.id, providerReference: deposit.providerReference, otp: dto.otp,
    });

    if (result.success) {
      deposit.status = DepositStatus.COMPLETED;
      deposit.completedAt = new Date();
      await this.depositRepo.save(deposit);
      this.eventEmitter.emit('deposit.completed', {
        depositId: deposit.id, userId: deposit.userId, amount: deposit.amount,
        usdcAmount: deposit.usdcAmount, provider: deposit.provider,
        phoneNumber: deposit.phoneNumber, exchangeRate: deposit.exchangeRate,
      });
      this.logger.log(`Deposit completed: ${deposit.id}, credited ${deposit.usdcAmount} USDC`);
    } else {
      deposit.status = DepositStatus.FAILED;
      deposit.failureReason = result.failureReason;
      await this.depositRepo.save(deposit);
    }

    return this.toResponse(deposit);
  }

  async getStatus(userId: string, depositId: string): Promise<DepositResponseDto> {
    const deposit = await this.depositRepo.findOne({ where: { id: depositId, userId } });
    if (!deposit) throw new NotFoundException('Deposit not found');

    if (deposit.status === DepositStatus.PENDING_CONFIRMATION && deposit.providerReference) {
      const providerStatus = await this.provider.getStatus(deposit.providerReference);
      if (providerStatus === 'success') {
        deposit.status = DepositStatus.COMPLETED;
        deposit.completedAt = new Date();
        await this.depositRepo.save(deposit);
        this.eventEmitter.emit('deposit.completed', {
          depositId: deposit.id, userId: deposit.userId, amount: deposit.amount,
          usdcAmount: deposit.usdcAmount, provider: deposit.provider,
          phoneNumber: deposit.phoneNumber, exchangeRate: deposit.exchangeRate,
        });
      } else if (providerStatus === 'failed') {
        deposit.status = DepositStatus.FAILED;
        deposit.failureReason = 'Payment rejected by provider';
        await this.depositRepo.save(deposit);
      } else if (providerStatus === 'timeout') {
        deposit.status = DepositStatus.TIMEOUT;
        await this.depositRepo.save(deposit);
      }
    }

    return this.toResponse(deposit);
  }

  private toResponse(d: Deposit): DepositResponseDto {
    return {
      id: d.id, amount: d.amount, usdcAmount: d.usdcAmount, exchangeRate: d.exchangeRate,
      provider: d.provider, paymentMethodType: d.paymentMethodType, status: d.status,
      failureReason: d.failureReason, createdAt: d.createdAt,
    };
  }
}
