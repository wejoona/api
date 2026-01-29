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
exports.CreateInternalTransferDto = exports.InternalTransferCurrency = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var InternalTransferCurrency;
(function (InternalTransferCurrency) {
    InternalTransferCurrency["USDC"] = "USDC";
    InternalTransferCurrency["USD"] = "USD";
})(InternalTransferCurrency || (exports.InternalTransferCurrency = InternalTransferCurrency = {}));
class CreateInternalTransferDto {
}
exports.CreateInternalTransferDto = CreateInternalTransferDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Recipient phone number in international format',
        example: '+2250701234567',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/^\+[1-9]\d{6,14}$/, {
        message: 'Phone must be in international format (e.g., +2250701234567)',
    }),
    __metadata("design:type", String)
], CreateInternalTransferDto.prototype, "recipientPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount in USDC to transfer (in cents, e.g., 5000 = $50.00)',
        example: 5000,
        minimum: 1,
        maximum: 100000000,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1, { message: 'Amount must be at least 1 cent' }),
    (0, class_validator_1.Max)(100000000, { message: 'Amount cannot exceed $1,000,000' }),
    __metadata("design:type", Number)
], CreateInternalTransferDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Currency (defaults to USDC)',
        example: 'USDC',
        enum: InternalTransferCurrency,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(InternalTransferCurrency, {
        message: 'Currency must be USDC or USD',
    }),
    __metadata("design:type", String)
], CreateInternalTransferDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Optional note/message for the transfer',
        example: 'Payment for lunch',
        maxLength: 500,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500, { message: 'Note cannot exceed 500 characters' }),
    (0, class_validator_1.Matches)(/^[^<>]*$/, {
        message: 'Note cannot contain HTML tags',
    }),
    __metadata("design:type", String)
], CreateInternalTransferDto.prototype, "note", void 0);
//# sourceMappingURL=create-internal-transfer.dto.js.map