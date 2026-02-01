import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BulkPaymentRepository } from '../../domain/repositories/bulk-payment.repository';
import { BulkPaymentEntity } from '../../domain/entities/bulk-payment.entity';
import {
  BulkPaymentOrmEntity,
  BulkPaymentItemOrmEntity,
} from '../orm-entities/bulk-payment.orm-entity';
import { BulkPaymentMapper } from '../mappers/bulk-payment.mapper';

@Injectable()
export class TypeOrmBulkPaymentRepository extends BulkPaymentRepository {
  constructor(
    @InjectRepository(BulkPaymentOrmEntity)
    private readonly bulkPaymentRepo: Repository<BulkPaymentOrmEntity>,
    @InjectRepository(BulkPaymentItemOrmEntity)
    private readonly bulkPaymentItemRepo: Repository<BulkPaymentItemOrmEntity>,
    private readonly mapper: BulkPaymentMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<BulkPaymentEntity | null> {
    const ormEntity = await this.bulkPaymentRepo.findOne({
      where: { id },
    });

    if (!ormEntity) {
      return null;
    }

    const items = await this.bulkPaymentItemRepo.find({
      where: { bulkPaymentId: id },
      order: { createdAt: 'ASC' },
    });

    return this.mapper.toDomain(ormEntity, items);
  }

  async findByWalletId(walletId: string): Promise<BulkPaymentEntity[]> {
    const ormEntities = await this.bulkPaymentRepo.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });

    const domainEntities: BulkPaymentEntity[] = [];

    for (const ormEntity of ormEntities) {
      const items = await this.bulkPaymentItemRepo.find({
        where: { bulkPaymentId: ormEntity.id },
        order: { createdAt: 'ASC' },
      });
      domainEntities.push(this.mapper.toDomain(ormEntity, items));
    }

    return domainEntities;
  }

  async save(bulkPayment: BulkPaymentEntity): Promise<BulkPaymentEntity> {
    // Save bulk payment
    const ormEntity = this.mapper.toOrmEntity(bulkPayment);
    const savedBulkPayment = await this.bulkPaymentRepo.save(ormEntity);

    // Save items
    const items = bulkPayment.getItems();
    const ormItems = items.map((item) => this.mapper.itemToOrmEntity(item));
    const savedItems = await this.bulkPaymentItemRepo.save(ormItems);

    return this.mapper.toDomain(savedBulkPayment, savedItems);
  }

  async update(bulkPayment: BulkPaymentEntity): Promise<BulkPaymentEntity> {
    // Update bulk payment
    const ormEntity = this.mapper.toOrmEntity(bulkPayment);
    await this.bulkPaymentRepo.save(ormEntity);

    // Update items
    const items = bulkPayment.getItems();
    const ormItems = items.map((item) => this.mapper.itemToOrmEntity(item));
    await this.bulkPaymentItemRepo.save(ormItems);

    // Fetch updated entity with items
    return this.findById(bulkPayment.id);
  }

  async delete(id: string): Promise<void> {
    await this.bulkPaymentRepo.delete(id);
  }
}
