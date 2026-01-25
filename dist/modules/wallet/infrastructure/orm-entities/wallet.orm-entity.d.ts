import { UserOrmEntity } from '../../../user/infrastructure/orm-entities';
export declare class WalletOrmEntity {
    id: string;
    userId: string;
    yellowCardWalletId: string | null;
    circleWalletId: string | null;
    circleWalletAddress: string | null;
    currency: string;
    balance: number;
    kycStatus: string;
    status: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    user?: UserOrmEntity;
}
