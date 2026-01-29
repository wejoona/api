import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentLinkRepository } from '../../domain/repositories/payment-link.repository';
import {
  PaymentLink,
  PaymentLinkStatus,
} from '../../domain/entities/payment-link.entity';
import { PaymentLinkOrmEntity } from '../orm-entities/payment-link.orm-entity';
import { PaymentLinkMapper } from '../mappers/payment-link.mapper';

@Injectable()
export class TypeOrmPaymentLinkRepository extends PaymentLinkRepository {
  constructor(
    @InjectRepository(PaymentLinkOrmEntity)
    private readonly repo: Repository<PaymentLinkOrmEntity>,
    private readonly mapper: PaymentLinkMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<PaymentLink | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<PaymentLink | null> {
    const entity = await this.repo.findOne({ where: { code } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<PaymentLink[]> {
    const entities = await this.repo.find({
      where!: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findActiveByUserId(userId: string): Promise<PaymentLink[]> {
    const entities = await this.repo.find({
      where!: { userId, status: PaymentLinkStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(paymentLink: PaymentLink): Promise<PaymentLink> {
    const entity = this.mapper.toOrmEntity(paymentLink);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
