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
exports.ExternalTransferDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ExternalTransferDto {
}
exports.ExternalTransferDto = ExternalTransferDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Recipient wallet address (Ethereum/EVM compatible)',
        example: '0x1234567890abcdef1234567890abcdef12345678',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^0x[a-fA-F0-9]{40}$/, {
        message: 'Must be a valid Ethereum address (0x followed by 40 hex characters)',
    }),
    __metadata("design:type", String)
], ExternalTransferDto.prototype, "toAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount in USD to transfer',
        example: 50,
        minimum: 1,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ExternalTransferDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Currency (defaults to USD)',
        example: 'USD',
        required: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExternalTransferDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Blockchain network (defaults to polygon)',
        example: 'polygon',
        required: false,
        enum: ['polygon', 'ethereum', 'base'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExternalTransferDto.prototype, "network", void 0);
//# sourceMappingURL=external-transfer.dto.js.map