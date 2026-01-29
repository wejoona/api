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
const throttler_1 = require("@nestjs/throttler");
const guards_1 = require("../../../../common/guards");
const requests_1 = require("../dto/requests");
const responses_1 = require("../dto/responses");
const usecases_1 = require("../domain/usecases");
let AuthController = class AuthController {
    constructor(registerUserUsecase, verifyOtpUsecase, loginUserUsecase, refreshTokenUsecase, logoutUsecase, logoutAllUsecase) {
        this.registerUserUsecase = registerUserUsecase;
        this.verifyOtpUsecase = verifyOtpUsecase;
        this.loginUserUsecase = loginUserUsecase;
        this.refreshTokenUsecase = refreshTokenUsecase;
        this.logoutUsecase = logoutUsecase;
        this.logoutAllUsecase = logoutAllUsecase;
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
            kycStatus: result.kycStatus,
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
    async logoutAll(req, dto) {
        const result = await this.logoutAllUsecase.execute({
            userId: req.user.id,
            currentRefreshToken: dto.currentRefreshToken,
        });
        return {
            success: result.success,
            message: result.message,
            sessionsInvalidated: result.sessionsInvalidated,
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
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
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
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
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
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
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
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
__decorate([
    (0, common_1.Post)('logout-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 3 } }),
    (0, swagger_1.ApiOperation)({
        summary: 'Logout from all devices',
        description: 'Invalidate all refresh tokens for the user. Optionally preserve current session by providing currentRefreshToken.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.LogoutAllResponse }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.LogoutAllDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Authentication'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [usecases_1.RegisterUserUsecase,
        usecases_1.VerifyOtpUsecase,
        usecases_1.LoginUserUsecase,
        usecases_1.RefreshTokenUsecase,
        usecases_1.LogoutUsecase,
        usecases_1.LogoutAllUsecase])
], AuthController);
let UserController = class UserController {
    constructor(updateProfileUsecase, usernameUsecase, getUserLimitsUseCase) {
        this.updateProfileUsecase = updateProfileUsecase;
        this.usernameUsecase = usernameUsecase;
        this.getUserLimitsUseCase = getUserLimitsUseCase;
    }
    getProfile(req) {
        return Promise.resolve(responses_1.UserResponse.fromDomain(req.user));
    }
    async updateProfile(req, dto) {
        const user = await this.updateProfileUsecase.execute({
            userId: req.user.id,
            username: dto.username,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
        });
        return responses_1.UserResponse.fromDomain(user);
    }
    async checkUsername(username) {
        return this.usernameUsecase.checkAvailability({ username });
    }
    async searchUsername(dto) {
        const users = await this.usernameUsecase.search({
            query: dto.query,
            limit: dto.limit,
        });
        return {
            users,
            count: users.length,
        };
    }
    async findByUsername(username) {
        const user = await this.usernameUsecase.findByUsername({ username });
        return responses_1.UserResponse.fromDomain(user);
    }
    async getLimits(req) {
        return this.getUserLimitsUseCase.execute({
            userId: req.user.id,
        });
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
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Username already taken' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, requests_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('username/check/:username'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if username is available' }),
    (0, swagger_1.ApiParam)({ name: 'username', description: 'Username to check' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.CheckUsernameResponse }),
    __param(0, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "checkUsername", null);
__decorate([
    (0, common_1.Get)('username/search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search users by username' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.SearchUsernameResponse }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [requests_1.SearchUsernameDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "searchUsername", null);
__decorate([
    (0, common_1.Get)('by-username/:username'),
    (0, swagger_1.ApiOperation)({ summary: 'Find user by username' }),
    (0, swagger_1.ApiParam)({
        name: 'username',
        description: 'Username to find (with or without @)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.UserResponse }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findByUsername", null);
__decorate([
    (0, common_1.Get)('limits'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user transaction limits based on KYC status' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: responses_1.UserLimitsResponse }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User or wallet not found' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getLimits", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)('User'),
    (0, common_1.Controller)('user'),
    (0, common_1.UseGuards)(guards_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [usecases_1.UpdateProfileUsecase,
        usecases_1.UsernameUsecase,
        usecases_1.GetUserLimitsUseCase])
], UserController);
//# sourceMappingURL=user.controller.js.map