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
exports.SubmitKycDto = exports.AddressDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class AddressDto {
}
exports.AddressDto = AddressDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123 Main Street' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddressDto.prototype, "street", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Abidjan' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddressDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Lagunes' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AddressDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '01 BP 1234' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AddressDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CI' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddressDto.prototype, "country", void 0);
class SubmitKycDto {
}
exports.SubmitKycDto = SubmitKycDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Konan' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Yao' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '1990-05-15',
        description: 'Date of birth in YYYY-MM-DD format',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "dateOfBirth", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CI', description: 'ISO country code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ['passport', 'national_id', 'drivers_license'],
        example: 'national_id',
        description: 'Type of ID document',
    }),
    (0, class_validator_1.IsEnum)(['passport', 'national_id', 'drivers_license']),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "idType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CI123456789', description: 'ID document number' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "idNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: '2030-12-31',
        description: 'ID expiry date in YYYY-MM-DD format',
    }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "idExpiryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: AddressDto, description: 'User address' }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AddressDto),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", AddressDto)
], SubmitKycDto.prototype, "address", void 0);
//# sourceMappingURL=submit-kyc.dto.js.map