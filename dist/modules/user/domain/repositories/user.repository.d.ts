import { User } from '../../application/domain/entities';
export interface IUserRepository {
    save(user: User): Promise<User>;
    findById(id: string): Promise<User | null>;
    findByPhone(phone: string): Promise<User | null>;
    existsByPhone(phone: string): Promise<boolean>;
    findAll(): Promise<User[]>;
    delete(id: string): Promise<void>;
}
export declare const USER_REPOSITORY: unique symbol;
