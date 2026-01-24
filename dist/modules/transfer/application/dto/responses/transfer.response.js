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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferListResponse = exports.TransferResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
class TransferResponse {
    static fromEntity(entity) {
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
exports.TransferResponse = TransferResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'INT-ABC123XYZ' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['internal', 'external'] }),
    __metadata("design:type", String)
], TransferResponse.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: [
            'pending',
            'processing',
            'completed',
            'failed',
            'cancelled',
            'refunded',
        ],
    }),
    __metadata("design:type", String)
], TransferResponse.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "senderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "senderWalletId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+2250701234567' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "senderPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "recipientId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "recipientWalletId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+2250701234567' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "recipientPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    }),
    __metadata("design:type", String)
], TransferResponse.prototype, "recipientAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'polygon' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "recipientBlockchain", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5000, description: 'Amount in cents' }),
    __metadata("design:type", Number)
], TransferResponse.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0, description: 'Fee in cents' }),
    __metadata("design:type", Number)
], TransferResponse.prototype, "fee", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 5000,
        description: 'Total amount including fee in cents',
    }),
    __metadata("design:type", Number)
], TransferResponse.prototype, "totalAmount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'USDC' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Payment for lunch' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "note", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'circle_transfer_123' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "providerTransferId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'circle' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "providerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '0x1234...abcd' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "txHash", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Insufficient balance' }),
    __metadata("design:type", String)
], TransferResponse.prototype, "errorMessage", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-23T10:00:00.000Z' }),
    __metadata("design:type", Date)
], TransferResponse.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-23T10:00:00.000Z' }),
    __metadata("design:type", Date)
], TransferResponse.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-01-23T10:05:00.000Z' }),
    __metadata("design:type", Date)
], TransferResponse.prototype, "completedAt", void 0);
class TransferListResponse {
    static fromEntities(entities, total, limit, offset) {
        const response = new TransferListResponse();
        response.transfers = entities.map((entity) => TransferResponse.fromEntity(entity));
        response.total = total;
        response.limit = limit;
        response.offset = offset;
        response.hasMore = offset + entities.length < total;
        return response;
    }
}
exports.TransferListResponse = TransferListResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [TransferResponse] }),
    __metadata("design:type", Array)
], TransferListResponse.prototype, "transfers", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 42 }),
    __metadata("design:type", Number)
], TransferListResponse.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 10 }),
    __metadata("design:type", Number)
], TransferListResponse.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0 }),
    __metadata("design:type", Number)
], TransferListResponse.prototype, "offset", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], TransferListResponse.prototype, "hasMore", void 0);
//# sourceMappingURL=transfer.response.js.map