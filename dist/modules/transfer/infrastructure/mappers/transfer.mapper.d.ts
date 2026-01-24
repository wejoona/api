import { TransferOrmEntity } from '../orm-entities/transfer.orm-entity';
import { TransferEntity } from '../../application/domain/entities/transfer.entity';
export declare class TransferMapper {
    toOrmEntity(domainEntity: TransferEntity): TransferOrmEntity;
    toDomainEntity(ormEntity: TransferOrmEntity): TransferEntity;
    toDomainEntities(ormEntities: TransferOrmEntity[]): TransferEntity[];
}
