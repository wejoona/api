import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  JwtAuthGuard,
  AuthenticatedRequest,
  PinVerificationGuard,
} from '../../../../common/guards';
import { Idempotent, IdempotencyGuard } from '../../../../common/middleware/idempotency';
import {
  CreateInternalTransferDto,
  CreateExternalTransferDto,
} from '../dto/requests';
import { TransferResponse, TransferListResponse } from '../dto/responses';
import { TransferRepository } from '../../infrastructure/repositories/transfer.repository';
import { InternalTransferUseCase } from '../../../wallet/application/usecases/internal-transfer.use-case';
import { ExternalTransferUseCase } from '../../../wallet/application/usecases/external-transfer.use-case';

@ApiTags('Transfers')
@Controller('transfers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransferController {
  constructor(
    private readonly transferRepository: TransferRepository,
    private readonly internalTransferUseCase: InternalTransferUseCase,
    private readonly externalTransferUseCase: ExternalTransferUseCase,
  ) {}

  @Post('internal')
  @HttpCode(HttpStatus.OK)
  // SECURITY: Require PIN verification before transfer
  @UseGuards(PinVerificationGuard)
  // SECURITY: Rate limit transfers to prevent abuse (10 per minute per user)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(IdempotencyGuard)
  @Idempotent({ required: true })
  @ApiOperation({ summary: 'Transfer to another user by phone number (P2P)' })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /wallet/pin/verify',
    required: true,
    example: 'abc123...',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description:
      'Unique key to prevent duplicate transfer requests (e.g., UUID)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Internal transfer initiated successfully',
    type: TransferResponse,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reference: 'INT-ABC123XYZ',
        type: 'internal',
        status: 'completed',
        senderId: '123e4567-e89b-12d3-a456-426614174001',
        senderWalletId: '123e4567-e89b-12d3-a456-426614174002',
        recipientId: '123e4567-e89b-12d3-a456-426614174003',
        recipientWalletId: '123e4567-e89b-12d3-a456-426614174004',
        recipientPhone: '+2250701234567',
        amount: 5000,
        fee: 0,
        totalAmount: 5000,
        currency: 'USDC',
        note: 'Payment for lunch',
        createdAt: '2026-01-23T10:00:00.000Z',
        updatedAt: '2026-01-23T10:00:00.000Z',
        completedAt: '2026-01-23T10:00:01.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid input, insufficient balance, or PIN verification required',
    schema: {
      example: {
        message: 'PIN verification required for this operation',
        code: 'PIN_REQUIRED',
        hint: 'Call POST /wallet/pin/verify first, then include the returned token in X-Pin-Token header',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid or expired PIN verification',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipient not found',
  })
  async createInternalTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateInternalTransferDto,
  ): Promise<TransferResponse> {
    // Execute the transfer using the wallet use case
    // DTO amount is in dollars (e.g., 50.00), use case expects dollars
    const result = await this.internalTransferUseCase.execute({
      fromUserId: req.user.id,
      toPhone: dto.recipientPhone,
      amount: dto.amount,
      currency: dto.currency || 'USDC',
    });

    // Construct transfer response from use case result
    return {
      id: result.transactionId,
      reference: `INT-${result.transactionId.substring(0, 8).toUpperCase()}`,
      type: 'internal',
      status: result.status,
      senderId: req.user.id,
      senderWalletId: result.fromWalletId,
      recipientWalletId: result.toWalletId,
      recipientPhone: result.toPhone,
      amount: result.amount,
      fee: result.fee,
      totalAmount: result.amount + result.fee,
      currency: result.currency,
      note: dto.note,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: result.status === 'completed' ? new Date() : undefined,
    } as TransferResponse;
  }

  @Post('external')
  @HttpCode(HttpStatus.OK)
  // SECURITY: Require PIN verification before transfer
  @UseGuards(PinVerificationGuard)
  // SECURITY: Stricter rate limit for external transfers (5 per minute per user)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseGuards(IdempotencyGuard)
  @Idempotent({ required: true })
  @ApiOperation({ summary: 'Send USDC to external blockchain address' })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /wallet/pin/verify',
    required: true,
    example: 'abc123...',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description:
      'Unique key to prevent duplicate transfer requests (e.g., UUID)',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'External transfer initiated successfully',
    type: TransferResponse,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        reference: 'EXT-XYZ789ABC',
        type: 'external',
        status: 'processing',
        senderId: '123e4567-e89b-12d3-a456-426614174001',
        senderWalletId: '123e4567-e89b-12d3-a456-426614174002',
        recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        recipientBlockchain: 'polygon',
        amount: 5000,
        fee: 100,
        totalAmount: 5100,
        currency: 'USDC',
        note: 'Withdrawal to personal wallet',
        createdAt: '2026-01-23T10:00:00.000Z',
        updatedAt: '2026-01-23T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - invalid address, amount, or PIN verification required',
    schema: {
      example: {
        message: 'PIN verification required for this operation',
        code: 'PIN_REQUIRED',
        hint: 'Call POST /wallet/pin/verify first, then include the returned token in X-Pin-Token header',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid or expired PIN verification',
  })
  async createExternalTransfer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateExternalTransferDto,
  ): Promise<TransferResponse> {
    // Execute the transfer using the wallet use case
    // DTO amount is in dollars (e.g., 50.00), use case expects dollars
    const result = await this.externalTransferUseCase.execute({
      userId: req.user.id,
      toAddress: dto.recipientAddress,
      amount: dto.amount,
      currency: dto.currency || 'USDC',
      network: dto.network || 'polygon',
    });

    return {
      id: result.transactionId,
      reference: `EXT-${result.transactionId.substring(0, 8).toUpperCase()}`,
      type: 'external',
      status: result.status,
      senderId: req.user.id,
      senderWalletId: result.walletId,
      recipientAddress: result.toAddress,
      recipientBlockchain: dto.network || 'polygon',
      amount: result.amount,
      fee: result.fee,
      totalAmount: result.amount + result.fee,
      currency: result.currency,
      note: dto.note,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TransferResponse;
  }

  @Get()
  @ApiOperation({ summary: 'Get user transfer history' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Number of transfers to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
    description: 'Number of transfers to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user transfer history',
    type: TransferListResponse,
  })
  async getTransfers(
    @Request() req: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<TransferListResponse> {
    const transfers = await this.transferRepository.findByUserId(
      req.user.id,
      limit,
      offset,
    );
    const total = await this.transferRepository.countByUserId(req.user.id);

    return TransferListResponse.fromEntities(transfers, total, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer by ID' })
  @ApiParam({
    name: 'id',
    description: 'Transfer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns transfer details',
    type: TransferResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Transfer not found',
  })
  async getTransferById(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<TransferResponse> {
    const transfer = await this.transferRepository.findById(id);

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    // Verify the user has access to this transfer
    if (
      transfer.senderId !== req.user.id &&
      transfer.recipientId !== req.user.id
    ) {
      throw new ForbiddenException('Access denied');
    }

    return TransferResponse.fromEntity(transfer);
  }
}
