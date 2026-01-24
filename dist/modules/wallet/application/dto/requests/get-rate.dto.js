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
exports.GetRateDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class GetRateDto {
}
exports.GetRateDto = GetRateDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Source currency code',
        example: 'XOF',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GetRateDto.prototype, "sourceCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Target currency code',
        example: 'USD',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GetRateDto.prototype, "targetCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Amount in source currency',
        example: 10000,
        minimum: 1,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], GetRateDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Direction of the conversion',
        example: 'buy',
        required: false,
        enum: ['buy', 'sell'],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['buy', 'sell']),
    __metadata("design:type", String)
], GetRateDto.prototype, "direction", void 0);
//# sourceMappingURL=get-rate.dto.js.map