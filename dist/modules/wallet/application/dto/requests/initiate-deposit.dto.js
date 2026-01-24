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
exports.InitiateDepositDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class InitiateDepositDto {
}
exports.InitiateDepositDto = InitiateDepositDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount in source currency (e.g., XOF)',
        example: 10000,
        minimum: 500,
        maximum: 1000000,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(500),
    (0, class_validator_1.Max)(1000000),
    __metadata("design:type", Number)
], InitiateDepositDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Source currency code',
        example: 'XOF',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InitiateDepositDto.prototype, "sourceCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Payment channel ID (from /wallet/deposit/channels)',
        example: 'orange_money_ci',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], InitiateDepositDto.prototype, "channelId", void 0);
//# sourceMappingURL=initiate-deposit.dto.js.map