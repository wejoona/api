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
exports.CreateExternalTransferDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateExternalTransferDto {
}
exports.CreateExternalTransferDto = CreateExternalTransferDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Recipient blockchain wallet address',
        example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^0x[a-fA-F0-9]{40}$/, {
        message: 'Address must be a valid Ethereum/EVM address',
    }),
    __metadata("design:type", String)
], CreateExternalTransferDto.prototype, "recipientAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount in USDC to transfer (in cents, e.g., 5000 = $50.00)',
        example: 5000,
        minimum: 100,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(100, { message: 'Minimum transfer amount is $1.00' }),
    __metadata("design:type", Number)
], CreateExternalTransferDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Blockchain network (defaults to polygon)',
        example: 'polygon',
        enum: ['polygon', 'ethereum', 'avalanche', 'solana'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExternalTransferDto.prototype, "network", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Currency (defaults to USDC)',
        example: 'USDC',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExternalTransferDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Optional note for the transfer',
        example: 'Withdrawal to personal wallet',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExternalTransferDto.prototype, "note", void 0);
//# sourceMappingURL=create-external-transfer.dto.js.map