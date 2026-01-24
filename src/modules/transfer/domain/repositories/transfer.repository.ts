import {
  TransferEntity,
  TransferStatus,
} from '../../application/domain/entities/transfer.entity';

export interface ITransferRepository {
  save(transfer: TransferEntity): Promise<TransferEntity>;
  findById(id: string): Promise<TransferEntity | null>;
  findByReference(reference: string): Promise<TransferEntity | null>;
  findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<TransferEntity[]>;
  findBySenderId(
    senderId: string,
    limit?: number,
    offset?: number,
  ): Promise<TransferEntity[]>;
  findByRecipientId(
    recipientId: string,
    limit?: number,
    offset?: number,
  ): Promise<TransferEntity[]>;
  findByStatus(status: TransferStatus): Promise<TransferEntity[]>;
  findByProviderTransferId(
    providerTransferId: string,
  ): Promise<TransferEntity | null>;
  countByUserId(userId: string): Promise<number>;
  findAll(limit?: number, offset?: number): Promise<TransferEntity[]>;
  delete(id: string): Promise<void>;
}

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');
