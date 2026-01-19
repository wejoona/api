import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../application/domain/entities';
import { UserOrmEntity } from '../orm-entities';
import { UserMapper } from '../mappers';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly ormRepository: Repository<UserOrmEntity>,
  ) {}

  async save(user: User): Promise<User> {
    const ormEntity = UserMapper.toOrm(user);
    const saved = await this.ormRepository.save(ormEntity);
    return UserMapper.toDomain(saved);
  }

  async findById(id: string): Promise<User | null> {
    const orm = await this.ormRepository.findOne({ where: { id } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const orm = await this.ormRepository.findOne({ where: { phone } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { phone } });
    return count > 0;
  }

  async findAll(): Promise<User[]> {
    const orms = await this.ormRepository.find({
      order: { createdAt: 'DESC' },
    });
    return orms.map((orm) => UserMapper.toDomain(orm));
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete(id);
  }
}
