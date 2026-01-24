import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferOrmEntity } from '../orm-entities/transfer.orm-entity';
import { TransferMapper } from '../mappers/transfer.mapper';
import {
  TransferEntity,
  TransferStatus,
} from '../../application/domain/entities/transfer.entity';
import { ITransferRepository } from '../../domain/repositories/transfer.repository';

@Injectable()
export class TransferRepository implements ITransferRepository {
  constructor(
    @InjectRepository(TransferOrmEntity)
    private readonly repository: Repository<TransferOrmEntity>,
    private readonly mapper: TransferMapper,
  ) {}

  async save(entity: TransferEntity): Promise<TransferEntity> {
    const ormEntity = this.mapper.toOrmEntity(entity);
    const savedOrmEntity = await this.repository.save(ormEntity);
    return this.mapper.toDomainEntity(savedOrmEntity);
  }

  async findById(id: string): Promise<TransferEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { id },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByReference(reference: string): Promise<TransferEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { reference },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<TransferEntity[]> {
    const query = this.repository
      .createQueryBuilder('transfer')
      .where(
        'transfer.sender_id = :userId OR transfer.recipient_id = :userId',
        {
          userId,
        },
      )
      .orderBy('transfer.created_at', 'DESC');

    if (limit) {
      query.take(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    const ormEntities = await query.getMany();
    return this.mapper.toDomainEntities(ormEntities);
  }

  async findBySenderId(
    senderId: string,
    limit?: number,
    offset?: number,
  ): Promise<TransferEntity[]> {
    const query = this.repository
      .createQueryBuilder('transfer')
      .where('transfer.sender_id = :senderId', { senderId })
      .orderBy('transfer.created_at', 'DESC');

    if (limit) {
      query.take(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    const ormEntities = await query.getMany();
    return this.mapper.toDomainEntities(ormEntities);
  }

  async findByRecipientId(
    recipientId: string,
    limit?: number,
    offset?: number,
  ): Promise<TransferEntity[]> {
    const query = this.repository
      .createQueryBuilder('transfer')
      .where('transfer.recipient_id = :recipientId', { recipientId })
      .orderBy('transfer.created_at', 'DESC');

    if (limit) {
      query.take(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    const ormEntities = await query.getMany();
    return this.mapper.toDomainEntities(ormEntities);
  }

  async findByStatus(status: TransferStatus): Promise<TransferEntity[]> {
    const ormEntities = await this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
    return this.mapper.toDomainEntities(ormEntities);
  }

  async findByProviderTransferId(
    providerTransferId: string,
  ): Promise<TransferEntity | null> {
    const ormEntity = await this.repository.findOne({
      where: { providerTransferId },
    });
    if (!ormEntity) {
      return null;
    }
    return this.mapper.toDomainEntity(ormEntity);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('transfer')
      .where(
        'transfer.sender_id = :userId OR transfer.recipient_id = :userId',
        {
          userId,
        },
      )
      .getCount();
  }

  async findAll(limit?: number, offset?: number): Promise<TransferEntity[]> {
    const query = this.repository
      .createQueryBuilder('transfer')
      .orderBy('transfer.created_at', 'DESC');

    if (limit) {
      query.take(limit);
    }
    if (offset) {
      query.skip(offset);
    }

    const ormEntities = await query.getMany();
    return this.mapper.toDomainEntities(ormEntities);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
