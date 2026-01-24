import { WalletOrmEntity } from '../../../wallet/infrastructure/orm-entities';
export declare class TransactionOrmEntity {
    id: string;
    walletId: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    yellowCardRef: string | null;
    recipientAddress: string | null;
    recipientPhone: string | null;
    recipientWalletId: string | null;
    metadata: Record<string, unknown> | null;
    failureReason: string | null;
    createdAt: Date;
    completedAt: Date | null;
    wallet?: WalletOrmEntity;
}
