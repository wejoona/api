import { Repository } from 'typeorm';
import { User } from '../../application/domain/entities';
import { UserOrmEntity } from '../orm-entities';
export declare class UserRepository {
    private readonly ormRepository;
    constructor(ormRepository: Repository<UserOrmEntity>);
    save(user: User): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByPhone(phone: string): Promise<User | null>;
    existsByPhone(phone: string): Promise<boolean>;
    findAll(): Promise<User[]>;
    delete(id: string): Promise<void>;
}
