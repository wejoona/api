import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { User } from '../../application/domain/entities';
import { UserOrmEntity } from '../orm-entities';
import { UserMapper } from '../mappers';

@Injectable()
export class UserRepository {
  private readonly CACHE_TTL = 600; // 10 minutes in seconds

  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly ormRepository: Repository<UserOrmEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async save(user: User): Promise<User> {
    const ormEntity = UserMapper.toOrm(user);
    const saved = await this.ormRepository.save(ormEntity);
    const domainUser = UserMapper.toDomain(saved);

    // Invalidate cache on save
    await this.invalidateUserCache(domainUser.id);

    return domainUser;
  }

  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;

    // Try to get from cache first
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    // Cache miss - fetch from database
    const orm = await this.ormRepository.findOne({ where: { id } });
    if (!orm) {
      return null;
    }

    const user = UserMapper.toDomain(orm);

    // Cache the result for 10 minutes
    await this.cacheManager.set(cacheKey, user, this.CACHE_TTL);

    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const orm = await this.ormRepository.findOne({ where: { phone } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async existsByPhone(phone: string): Promise<boolean> {
    const count = await this.ormRepository.count({ where: { phone } });
    return count > 0;
  }

  async findByUsername(username: string): Promise<User | null> {
    const normalizedUsername = username.toLowerCase().replace(/^@/, '');
    const orm = await this.ormRepository.findOne({
      where: { username: normalizedUsername },
    });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase().replace(/^@/, '');
    const count = await this.ormRepository.count({
      where: { username: normalizedUsername },
    });
    return count > 0;
  }

  async searchByUsername(query: string, limit = 10): Promise<User[]> {
    const normalizedQuery = query.toLowerCase().replace(/^@/, '');
    const orms = await this.ormRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) LIKE :query', {
        query: `${normalizedQuery}%`,
      })
      .take(limit)
      .getMany();
    return orms.map((orm) => UserMapper.toDomain(orm));
  }

  async findAll(): Promise<User[]> {
    const orms = await this.ormRepository.find({
      order: { createdAt: 'DESC' },
    });
    return orms.map((orm) => UserMapper.toDomain(orm));
  }

  async delete(id: string): Promise<void> {
    await this.ormRepository.delete(id);
    // Invalidate cache on delete
    await this.invalidateUserCache(id);
  }

  /**
   * Helper method to invalidate user cache
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    const cacheKey = `user:${userId}`;
    await this.cacheManager.del(cacheKey);
  }
}
