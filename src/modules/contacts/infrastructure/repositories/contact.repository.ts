import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from '../../domain/entities';
import { ContactOrmEntity } from '../orm-entities';
import { ContactMapper } from '../mappers';

@Injectable()
export class ContactRepository {
  constructor(
    @InjectRepository(ContactOrmEntity)
    private readonly ormRepository: Repository<ContactOrmEntity>,
  ) {}

  async save(contact: Contact): Promise<Contact> {
    const ormEntity = ContactMapper.toOrm(contact);
    const saved = await this.ormRepository.save(ormEntity);
    return ContactMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Contact | null> {
    const orm = await this.ormRepository.findOne({ where: { id } });
    return orm ? ContactMapper.toDomain(orm) : null;
  }

  async findByUserId(userId: string): Promise<Contact[]> {
    const orms = await this.ormRepository.find({
      where: { userId },
      order: { isFavorite: 'DESC', lastTransactionAt: 'DESC', name: 'ASC' },
    });
    return orms.map(ContactMapper.toDomain);
  }

  async findFavoritesByUserId(userId: string): Promise<Contact[]> {
    const orms = await this.ormRepository.find({
      where: { userId, isFavorite: true },
      order: { lastTransactionAt: 'DESC', name: 'ASC' },
    });
    return orms.map(ContactMapper.toDomain);
  }

  async findRecentsByUserId(userId: string, limit = 5): Promise<Contact[]> {
    const orms = await this.ormRepository.find({
      where: { userId },
      order: { lastTransactionAt: 'DESC' },
      take: limit,
    });
    return orms.map(ContactMapper.toDomain);
  }

  async findByPhone(userId: string, phone: string): Promise<Contact | null> {
    const orm = await this.ormRepository.findOne({
      where: { userId, phone },
    });
    return orm ? ContactMapper.toDomain(orm) : null;
  }

  async findByWalletAddress(
    userId: string,
    walletAddress: string,
  ): Promise<Contact | null> {
    const orm = await this.ormRepository.findOne({
      where: { userId, walletAddress },
    });
    return orm ? ContactMapper.toDomain(orm) : null;
  }

  async findByContactUserId(
    userId: string,
    contactUserId: string,
  ): Promise<Contact | null> {
    const orm = await this.ormRepository.findOne({
      where: { userId, contactUserId },
    });
    return orm ? ContactMapper.toDomain(orm) : null;
  }

  async searchByName(userId: string, query: string, limit = 10): Promise<Contact[]> {
    const orms = await this.ormRepository
      .createQueryBuilder('contact')
      .where('contact.user_id = :userId', { userId })
      .andWhere(
        '(LOWER(contact.name) LIKE :query OR LOWER(contact.username) LIKE :query)',
        { query: `%${query.toLowerCase()}%` },
      )
      .orderBy('contact.is_favorite', 'DESC')
      .addOrderBy('contact.transaction_count', 'DESC')
      .take(limit)
      .getMany();
    return orms.map(ContactMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.ormRepository.delete({ userId });
  }
}
