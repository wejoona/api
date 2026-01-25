"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const guards_1 = require("../../../../common/guards");
const interceptors_1 = require("../../../../common/interceptors");
const requests_1 = require("../dto/requests");
const responses_1 = require("../dto/responses");
const transfer_repository_1 = require("../../infrastructure/repositories/transfer.repository");
const internal_transfer_use_case_1 = require("../../../wallet/application/usecases/internal-transfer.use-case");
const external_transfer_use_case_1 = require("../../../wallet/application/usecases/external-transfer.use-case");
let TransferController = class TransferController {
    constructor(transferRepository, internalTransferUseCase, externalTransferUseCase) {
        this.transferRepository = transferRepository;
        this.internalTransferUseCase = internalTransferUseCase;
        this.externalTransferUseCase = externalTransferUseCase;
    }
    async createInternalTransfer(req, dto) {
        const result = await this.internalTransferUseCase.execute({
            fromUserId: req.user.id,
            toPhone: dto.recipientPhone,
            amount: dto.amount / 100,
            currency: dto.currency || 'USDC',
        });
        return {
            id: result.transactionId,
            reference: `INT-${result.transactionId.substring(0, 8).toUpperCase()}`,
            type: 'internal',
            status: result.status,
            senderId: req.user.id,
            senderWalletId: result.fromWalletId,
            recipientWalletId: result.toWalletId,
            recipientPhone: result.toPhone,
            amount: dto.amount,
            fee: result.fee * 100,
            totalAmount: dto.amount + result.fee * 100,
            currency: result.currency,
            note: dto.note,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: result.status === 'completed' ? new Date() : undefined,
        };
    }
    async createExternalTransfer(req, dto) {
        const result = await this.externalTransferUseCase.execute({
            userId: req.user.id,
            toAddress: dto.recipientAddress,
            amount: dto.amount / 100,
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
            amount: dto.amount,
            fee: result.fee * 100,
            totalAmount: dto.amount + result.fee * 100,
            currency: result.currency,
            note: dto.note,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async getTransfers(req, limit, offset) {
        const transfers = await this.transferRepository.findByUserId(req.user.id, limit, offset);
        const total = await this.transferRepository.countByUserId(req.user.id);
        return responses_1.TransferListResponse.fromEntities(transfers, total, limit, offset);
    }
    async getTransferById(req, id) {
        const transfer = await this.transferRepository.findById(id);
        if (!transfer) {
            throw new common_1.NotFoundException('Transfer not found');
        }
        if (transfer.senderId !== req.user.id &&
            transfer.recipientId !== req.user.id) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return responses_1.TransferResponse.fromEntity(transfer);
    }
};
exports.TransferController = TransferController;
__decorate([
    (0, common_1.Post)('internal'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(guards_1.PinVerificationGuard),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    (0, common_1.UseInterceptors)(interceptors_1.IdempotencyInterceptor),
    (0, swagger_1.ApiOperation)({ summary: 'Transfer to another user by phone number (P2P)' }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Pin-Token',
        description: 'PIN verification token from POST /wallet/pin/verify',
        required: true,
        example: 'abc123...',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Idempotency-Key',
        description: 'Unique key to prevent duplicate transfer requests (e.g., UUID)',
        required: false,
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Internal transfer initiated successfully',
        type: responses_1.TransferResponse,
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad request - invalid input, insufficient balance, or PIN verification required',
        schema: {
            example: {
                message: 'PIN verification required for this operation',
                code: 'PIN_REQUIRED',
                hint: 'Call POST /wallet/pin/verify first, then include the returned token in X-Pin-Token header',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Invalid or expired PIN verification',
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Recipient not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.CreateInternalTransferDto]),
    __metadata("design:returntype", Promise)
], TransferController.prototype, "createInternalTransfer", null);
__decorate([
    (0, common_1.Post)('external'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(guards_1.PinVerificationGuard),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    (0, common_1.UseInterceptors)(interceptors_1.IdempotencyInterceptor),
    (0, swagger_1.ApiOperation)({ summary: 'Send USDC to external blockchain address' }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Pin-Token',
        description: 'PIN verification token from POST /wallet/pin/verify',
        required: true,
        example: 'abc123...',
    }),
    (0, swagger_1.ApiHeader)({
        name: 'X-Idempotency-Key',
        description: 'Unique key to prevent duplicate transfer requests (e.g., UUID)',
        required: false,
        example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'External transfer initiated successfully',
        type: responses_1.TransferResponse,
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad request - invalid address, amount, or PIN verification required',
        schema: {
            example: {
                message: 'PIN verification required for this operation',
                code: 'PIN_REQUIRED',
                hint: 'Call POST /wallet/pin/verify first, then include the returned token in X-Pin-Token header',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Invalid or expired PIN verification',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.CreateExternalTransferDto]),
    __metadata("design:returntype", Promise)
], TransferController.prototype, "createExternalTransfer", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get user transfer history' }),
    (0, swagger_1.ApiQuery)({
        name: 'limit',
        required: false,
        type: Number,
        example: 20,
        description: 'Number of transfers to return',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'offset',
        required: false,
        type: Number,
        example: 0,
        description: 'Number of transfers to skip',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns user transfer history',
        type: responses_1.TransferListResponse,
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], TransferController.prototype, "getTransfers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transfer by ID' }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: 'Transfer ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns transfer details',
        type: responses_1.TransferResponse,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Transfer not found',
    }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TransferController.prototype, "getTransferById", null);
exports.TransferController = TransferController = __decorate([
    (0, swagger_1.ApiTags)('Transfers'),
    (0, common_1.Controller)('transfers'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [transfer_repository_1.TransferRepository,
        internal_transfer_use_case_1.InternalTransferUseCase,
        external_transfer_use_case_1.ExternalTransferUseCase])
], TransferController);
//# sourceMappingURL=transfer.controller.js.map