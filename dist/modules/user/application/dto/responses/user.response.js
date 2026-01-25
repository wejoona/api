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
exports.UserResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
class UserResponse {
    static fromDomain(user) {
        const response = new UserResponse();
        response.id = user.id;
        response.phone = user.phone;
        response.phoneVerified = user.phoneVerified;
        response.username = user.username;
        response.firstName = user.firstName;
        response.lastName = user.lastName;
        response.email = user.email;
        response.countryCode = user.countryCode;
        response.kycStatus = user.kycStatus;
        response.canTransact = user.canTransact;
        response.canWithdraw = user.canWithdraw;
        response.createdAt = user.createdAt;
        return response;
    }
}
exports.UserResponse = UserResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    __metadata("design:type", String)
], UserResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+2250701234567' }),
    __metadata("design:type", String)
], UserResponse.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], UserResponse.prototype, "phoneVerified", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'amadou_diallo', nullable: true }),
    __metadata("design:type", String)
], UserResponse.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Amadou', nullable: true }),
    __metadata("design:type", String)
], UserResponse.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Diallo', nullable: true }),
    __metadata("design:type", String)
], UserResponse.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'amadou@example.com', nullable: true }),
    __metadata("design:type", String)
], UserResponse.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CI' }),
    __metadata("design:type", String)
], UserResponse.prototype, "countryCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'approved',
        enum: ['pending', 'submitted', 'approved', 'rejected'],
    }),
    __metadata("design:type", String)
], UserResponse.prototype, "kycStatus", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], UserResponse.prototype, "canTransact", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], UserResponse.prototype, "canWithdraw", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-01-18T12:00:00.000Z' }),
    __metadata("design:type", Date)
], UserResponse.prototype, "createdAt", void 0);
//# sourceMappingURL=user.response.js.map