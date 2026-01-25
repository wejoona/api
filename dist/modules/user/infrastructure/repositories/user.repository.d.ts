import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { User } from '../../application/domain/entities';
import { UserOrmEntity } from '../orm-entities';
export declare class UserRepository {
    private readonly ormRepository;
    private readonly cacheManager;
    private readonly CACHE_TTL;
    constructor(ormRepository: Repository<UserOrmEntity>, cacheManager: Cache);
    save(user: User): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByPhone(phone: string): Promise<User | null>;
    existsByPhone(phone: string): Promise<boolean>;
    findByUsername(username: string): Promise<User | null>;
    existsByUsername(username: string): Promise<boolean>;
    searchByUsername(query: string, limit?: number): Promise<User[]>;
    findAll(): Promise<User[]>;
    delete(id: string): Promise<void>;
    private invalidateUserCache;
}
