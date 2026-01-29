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
exports.LogoutAllResponse = exports.LogoutResponse = exports.OtpSentResponse = exports.RefreshResponse = exports.AuthResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
const user_response_1 = require("./user.response");
class AuthResponse {
}
exports.AuthResponse = AuthResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    __metadata("design:type", String)
], AuthResponse.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    __metadata("design:type", String)
], AuthResponse.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: user_response_1.UserResponse }),
    __metadata("design:type", user_response_1.UserResponse)
], AuthResponse.prototype, "user", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'documents_pending',
        description: 'Current KYC verification status. Wallet is created after KYC approval.',
    }),
    __metadata("design:type", String)
], AuthResponse.prototype, "kycStatus", void 0);
class RefreshResponse {
}
exports.RefreshResponse = RefreshResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    __metadata("design:type", String)
], RefreshResponse.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }),
    __metadata("design:type", String)
], RefreshResponse.prototype, "refreshToken", void 0);
class OtpSentResponse {
}
exports.OtpSentResponse = OtpSentResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], OtpSentResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'OTP sent successfully' }),
    __metadata("design:type", String)
], OtpSentResponse.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 300, description: 'OTP expiry in seconds' }),
    __metadata("design:type", Number)
], OtpSentResponse.prototype, "expiresIn", void 0);
class LogoutResponse {
}
exports.LogoutResponse = LogoutResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], LogoutResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Logged out successfully' }),
    __metadata("design:type", String)
], LogoutResponse.prototype, "message", void 0);
class LogoutAllResponse {
}
exports.LogoutAllResponse = LogoutAllResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], LogoutAllResponse.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'All devices logged out successfully' }),
    __metadata("design:type", String)
], LogoutAllResponse.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 5,
        description: 'Number of sessions invalidated (0 if not tracked)',
    }),
    __metadata("design:type", Number)
], LogoutAllResponse.prototype, "sessionsInvalidated", void 0);
//# sourceMappingURL=auth.response.js.map