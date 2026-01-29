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
exports.InternalTransferDto = exports.WalletCurrency = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var WalletCurrency;
(function (WalletCurrency) {
    WalletCurrency["USD"] = "USD";
    WalletCurrency["USDC"] = "USDC";
})(WalletCurrency || (exports.WalletCurrency = WalletCurrency = {}));
class InternalTransferDto {
}
exports.InternalTransferDto = InternalTransferDto;
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
], InternalTransferDto.prototype, "toPhone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount in USD to transfer',
        example: 50,
        minimum: 0.01,
        maximum: 1000000,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01, { message: 'Amount must be at least $0.01' }),
    (0, class_validator_1.Max)(1000000, { message: 'Amount cannot exceed $1,000,000' }),
    __metadata("design:type", Number)
], InternalTransferDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Currency (defaults to USD)',
        example: 'USD',
        enum: WalletCurrency,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(WalletCurrency, {
        message: 'Currency must be USD or USDC',
    }),
    __metadata("design:type", String)
], InternalTransferDto.prototype, "currency", void 0);
//# sourceMappingURL=internal-transfer.dto.js.map