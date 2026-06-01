import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { IUser, User } from '../../application/domain/entities';
import { UserOrmEntity } from '../orm-entities';
import { UserMapper } from '../mappers';
import { escapeLikePattern } from '../../../../common/utils/sql-utils';

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
      return this.rehydrateCachedUser(cachedUser);
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
    // SECURITY: Escape LIKE wildcards to prevent pattern injection
    const escapedQuery = escapeLikePattern(normalizedQuery);
    const orms = await this.ormRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) LIKE :query', {
        query: `${escapedQuery}%`,
      })
      .take(limit)
      .getMany();
    return orms.map((orm) => UserMapper.toDomain(orm));
  }

  /**
   * Search users by phone, username, or name using DB query (not in-memory).
   * Returns max 20 results. Phone is partial-matched, names are prefix-matched.
   */
  async search(query: string, limit = 20): Promise<User[]> {
    const escaped = escapeLikePattern(query.toLowerCase());
    const orms = await this.ormRepository
      .createQueryBuilder('user')
      .where('user.phone LIKE :phone', { phone: `%${escaped}%` })
      .orWhere('LOWER(user.username) LIKE :name', { name: `${escaped}%` })
      .orWhere('LOWER(user.firstName) LIKE :name', { name: `${escaped}%` })
      .orWhere('LOWER(user.lastName) LIKE :name', { name: `${escaped}%` })
      .take(limit)
      .getMany();
    return orms.map((orm) => UserMapper.toDomain(orm));
  }

  async findByPhones(phones: string[]): Promise<User[]> {
    if (phones.length === 0) return [];
    const orms = await this.ormRepository
      .createQueryBuilder('user')
      .where('user.phone IN (:...phones)', { phones })
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

  private rehydrateCachedUser(user: User | IUser): User {
    if (user instanceof User) {
      return user;
    }

    return User.reconstitute({
      ...user,
      suspendedAt: this.toNullableDate(user.suspendedAt),
      pinSetAt: this.toNullableDate(user.pinSetAt),
      pinLockedUntil: this.toNullableDate(user.pinLockedUntil),
      emailVerificationExpiresAt: this.toNullableDate(
        user.emailVerificationExpiresAt,
      ),
      createdAt: this.toDate(user.createdAt),
      updatedAt: this.toDate(user.updatedAt),
    });
  }

  private toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private toNullableDate(value: Date | string | null): Date | null {
    if (!value) return null;
    return this.toDate(value);
  }
}
