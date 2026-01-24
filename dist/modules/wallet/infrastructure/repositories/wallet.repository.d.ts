import { Repository } from 'typeorm';
import { WalletMapper } from '../mappers/wallet.mapper';
import { WalletOrmEntity } from '../orm-entities/wallet.orm-entity';
import { WalletEntity } from '../../domain/entities/wallet.entity';
import { IWalletRepository } from '../../domain/repositories/wallet.repository';
export declare class WalletRepository implements IWalletRepository {
    private readonly repository;
    private readonly mapper;
    constructor(repository: Repository<WalletOrmEntity>, mapper: WalletMapper);
    save(entity: WalletEntity): Promise<WalletEntity>;
    findById(id: string): Promise<WalletEntity | null>;
    findByUserId(userId: string): Promise<WalletEntity | null>;
    findByYellowCardWalletId(yellowCardWalletId: string): Promise<WalletEntity | null>;
    findByCircleWalletId(circleWalletId: string): Promise<WalletEntity | null>;
    findByProviderWalletId(providerWalletId: string): Promise<WalletEntity | null>;
    findAll(): Promise<WalletEntity[]>;
    delete(id: string): Promise<void>;
}
