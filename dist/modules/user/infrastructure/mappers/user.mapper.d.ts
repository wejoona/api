import { User } from '../../application/domain/entities';
import { UserOrmEntity } from '../orm-entities';
export declare class UserMapper {
    static toDomain(orm: UserOrmEntity): User;
    static toOrm(domain: User): UserOrmEntity;
}
