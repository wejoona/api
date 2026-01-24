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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const guards_1 = require("../../../../common/guards");
const requests_1 = require("../dto/requests");
const responses_1 = require("../dto/responses");
const usecases_1 = require("../domain/usecases");
let AuthController = class AuthController {
    constructor(registerUserUsecase, verifyOtpUsecase, loginUserUsecase, refreshTokenUsecase, logoutUsecase) {
        this.registerUserUsecase = registerUserUsecase;
        this.verifyOtpUsecase = verifyOtpUsecase;
        this.loginUserUsecase = loginUserUsecase;
        this.refreshTokenUsecase = refreshTokenUsecase;
        this.logoutUsecase = logoutUsecase;
    }
    async register(dto) {
        const result = await this.registerUserUsecase.execute({
            phone: dto.phone,
            countryCode: dto.countryCode,
        });
        return {
            success: true,
            message: 'OTP sent successfully. Please verify your phone number.',
            expiresIn: result.otpExpiresIn,
        };
    }
    async verifyOtp(dto) {
        const result = await this.verifyOtpUsecase.execute({
            phone: dto.phone,
            otp: dto.otp,
        });
        return {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: responses_1.UserResponse.fromDomain(result.user),
            walletCreated: result.walletCreated,
        };
    }
    async refreshToken(dto) {
        const result = await this.refreshTokenUsecase.execute({
            refreshToken: dto.refreshToken,
        });
        return {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        };
    }
    async login(dto) {
        const result = await this.loginUserUsecase.execute({
            phone: dto.phone,
        });
        return {
            success: result.success,
            message: 'OTP sent successfully',
            expiresIn: result.otpExpiresIn,
        };
    }
    async logout(req, dto) {
        const result = await this.logoutUsecase.execute({
            userId: req.user.id,
            refreshToken: dto.refreshToken,
        });
        return {
            success: result.success,
            message: result.message,
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: responses_1.OtpSentResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [requests_1.RegisterUserDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Verify OTP and get access token' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.AuthResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [requests_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.RefreshResponse }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired refresh token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [requests_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Request login OTP' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.OtpSentResponse }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [requests_1.LoginUserDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Logout and invalidate refresh token' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.LogoutResponse }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.LogoutDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [usecases_1.RegisterUserUsecase,
        usecases_1.VerifyOtpUsecase,
        usecases_1.LoginUserUsecase,
        usecases_1.RefreshTokenUsecase,
        usecases_1.LogoutUsecase])
], AuthController);
let UserController = class UserController {
    constructor(updateProfileUsecase) {
        this.updateProfileUsecase = updateProfileUsecase;
    }
    getProfile(req) {
        return Promise.resolve(responses_1.UserResponse.fromDomain(req.user));
    }
    async updateProfile(req, dto) {
        const user = await this.updateProfileUsecase.execute({
            userId: req.user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
        });
        return responses_1.UserResponse.fromDomain(user);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.UserResponse }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.UserResponse }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateProfile", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)('User'),
    (0, common_1.Controller)('user'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [usecases_1.UpdateProfileUsecase])
], UserController);
//# sourceMappingURL=user.controller.js.map