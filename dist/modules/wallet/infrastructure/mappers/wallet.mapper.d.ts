import { WalletOrmEntity } from '../orm-entities/wallet.orm-entity';
import { WalletEntity } from '../../domain/entities/wallet.entity';
export declare class WalletMapper {
    toOrmEntity(domainEntity: WalletEntity): WalletOrmEntity;
    toDomainEntity(ormEntity: WalletOrmEntity): WalletEntity;
}
