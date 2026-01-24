import { TransferEntity } from '../../domain/entities/transfer.entity';
export declare class TransferResponse {
    id: string;
    reference: string;
    type: string;
    status: string;
    senderId: string;
    senderWalletId: string;
    senderPhone?: string;
    recipientId?: string;
    recipientWalletId?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    recipientBlockchain?: string;
    amount: number;
    fee: number;
    totalAmount: number;
    currency: string;
    note?: string;
    providerTransferId?: string;
    providerName?: string;
    txHash?: string;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    static fromEntity(entity: TransferEntity): TransferResponse;
}
export declare class TransferListResponse {
    transfers: TransferResponse[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    static fromEntities(entities: TransferEntity[], total: number, limit: number, offset: number): TransferListResponse;
}
