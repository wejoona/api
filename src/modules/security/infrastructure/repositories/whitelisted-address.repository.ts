import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhitelistedAddress } from '../../domain/entities';
import { WhitelistedAddressOrmEntity } from '../orm-entities';
import { WhitelistedAddressMapper } from '../mappers';

@Injectable()
export class WhitelistedAddressRepository {
  constructor(
    @InjectRepository(WhitelistedAddressOrmEntity)
    private readonly ormRepository: Repository<WhitelistedAddressOrmEntity>,
  ) {}

  async save(address: WhitelistedAddress): Promise<WhitelistedAddress> {
    const ormEntity = WhitelistedAddressMapper.toOrm(address);
    const saved = await this.ormRepository.save(ormEntity);
    return WhitelistedAddressMapper.toDomain(saved);
  }

  async findById(id: string): Promise<WhitelistedAddress | null> {
    const orm = await this.ormRepository.findOne({ where: { id } });
    return orm ? WhitelistedAddressMapper.toDomain(orm) : null;
  }

  async findByUserId(userId: string): Promise<WhitelistedAddress[]> {
    const orms = await this.ormRepository.find({
      where: { userId },
      order: { usageCount: 'DESC', createdAt: 'DESC' },
    });
    return orms.map(WhitelistedAddressMapper.toDomain);
  }

  async findActiveByUserId(userId: string): Promise<WhitelistedAddress[]> {
    const orms = await this.ormRepository.find({
      where: { userId, status: 'active' },
      order: { usageCount: 'DESC', createdAt: 'DESC' },
    });
    return orms.map(WhitelistedAddressMapper.toDomain);
  }

  async findByAddress(
    userId: string,
    address: string,
  ): Promise<WhitelistedAddress | null> {
    const orm = await this.ormRepository.findOne({
      where: { userId, address: address.toLowerCase() },
    });
    return orm ? WhitelistedAddressMapper.toDomain(orm) : null;
  }

  async findActiveByAddress(
    userId: string,
    address: string,
  ): Promise<WhitelistedAddress | null> {
    const orm = await this.ormRepository.findOne({
      where: { userId, address: address.toLowerCase(), status: 'active' },
    });
    return orm ? WhitelistedAddressMapper.toDomain(orm) : null;
  }

  async existsByAddress(userId: string, address: string): Promise<boolean> {
    const count = await this.ormRepository.count({
      where: { userId, address: address.toLowerCase() },
    });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete(id);
  }
}
