import { TransactionOrmEntity } from '../orm-entities/transaction.orm-entity';
import { TransactionEntity } from '../../domain/entities/transaction.entity';
export declare class TransactionMapper {
    toOrmEntity(domainEntity: TransactionEntity): TransactionOrmEntity;
    toDomainEntity(ormEntity: TransactionOrmEntity): TransactionEntity;
}
