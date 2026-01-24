import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransferEntity } from '../../domain/entities/transfer.entity';

export class TransferResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'INT-ABC123XYZ' })
  reference: string;

  @ApiProperty({ enum: ['internal', 'external'] })
  type: string;

  @ApiProperty({
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
    ],
  })
  status: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  senderId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  senderWalletId: string;

  @ApiPropertyOptional({ example: '+2250701234567' })
  senderPhone?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  recipientId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  recipientWalletId?: string;

  @ApiPropertyOptional({ example: '+2250701234567' })
  recipientPhone?: string;

  @ApiPropertyOptional({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  })
  recipientAddress?: string;

  @ApiPropertyOptional({ example: 'polygon' })
  recipientBlockchain?: string;

  @ApiProperty({ example: 5000, description: 'Amount in cents' })
  amount: number;

  @ApiProperty({ example: 0, description: 'Fee in cents' })
  fee: number;

  @ApiProperty({
    example: 5000,
    description: 'Total amount including fee in cents',
  })
  totalAmount: number;

  @ApiProperty({ example: 'USDC' })
  currency: string;

  @ApiPropertyOptional({ example: 'Payment for lunch' })
  note?: string;

  @ApiPropertyOptional({ example: 'circle_transfer_123' })
  providerTransferId?: string;

  @ApiPropertyOptional({ example: 'circle' })
  providerName?: string;

  @ApiPropertyOptional({ example: '0x1234...abcd' })
  txHash?: string;

  @ApiPropertyOptional({ example: 'Insufficient balance' })
  errorMessage?: string;

  @ApiProperty({ example: '2026-01-23T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-23T10:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: '2026-01-23T10:05:00.000Z' })
  completedAt?: Date;

  static fromEntity(entity: TransferEntity): TransferResponse {
    const response = new TransferResponse();
    response.id = entity.id;
    response.reference = entity.reference;
    response.type = entity.type;
    response.status = entity.status;
    response.senderId = entity.senderId;
    response.senderWalletId = entity.senderWalletId;
    response.senderPhone = entity.senderPhone || undefined;
    response.recipientId = entity.recipientId || undefined;
    response.recipientWalletId = entity.recipientWalletId || undefined;
    response.recipientPhone = entity.recipientPhone || undefined;
    response.recipientAddress = entity.recipientAddress || undefined;
    response.recipientBlockchain = entity.recipientBlockchain || undefined;
    response.amount = entity.amount;
    response.fee = entity.fee;
    response.totalAmount = entity.totalAmount;
    response.currency = entity.currency;
    response.note = entity.note || undefined;
    response.providerTransferId = entity.providerTransferId || undefined;
    response.providerName = entity.providerName || undefined;
    response.txHash = entity.txHash || undefined;
    response.errorMessage = entity.errorMessage || undefined;
    response.createdAt = entity.createdAt;
    response.updatedAt = entity.updatedAt;
    response.completedAt = entity.completedAt || undefined;
    return response;
  }
}

export class TransferListResponse {
  @ApiProperty({ type: [TransferResponse] })
  transfers: TransferResponse[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;

  @ApiProperty({ example: true })
  hasMore: boolean;

  static fromEntities(
    entities: TransferEntity[],
    total: number,
    limit: number,
    offset: number,
  ): TransferListResponse {
    const response = new TransferListResponse();
    response.transfers = entities.map((entity) =>
      TransferResponse.fromEntity(entity),
    );
    response.total = total;
    response.limit = limit;
    response.offset = offset;
    response.hasMore = offset + entities.length < total;
    return response;
  }
}
