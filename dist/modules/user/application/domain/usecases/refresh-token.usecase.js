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
var RefreshTokenUsecase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenUsecase = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const repositories_1 = require("../../../infrastructure/repositories");
let RefreshTokenUsecase = RefreshTokenUsecase_1 = class RefreshTokenUsecase {
    constructor(userRepository, jwtService, configService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(RefreshTokenUsecase_1.name);
        this.refreshSecret = this.configService.get('jwt.refreshSecret');
        if (!this.refreshSecret) {
            throw new Error('JWT_REFRESH_SECRET environment variable is required');
        }
        this.refreshExpiresIn = this.configService.get('jwt.refreshExpiresIn', '7d');
    }
    async execute(input) {
        try {
            const payload = this.jwtService.verify(input.refreshToken, {
                secret: this.refreshSecret,
            });
            if (payload.type !== 'refresh') {
                throw new common_1.UnauthorizedException('Invalid token type');
            }
            const user = await this.userRepository.findById(payload.sub);
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            if (!user.isActive) {
                throw new common_1.UnauthorizedException('User account is not active');
            }
            this.logger.log(`Refreshing tokens for user ${user.id}`);
            const accessToken = this.jwtService.sign({
                sub: user.id,
                phone: user.phone,
            });
            const refreshToken = this.jwtService.sign({
                sub: user.id,
                type: 'refresh',
            }, {
                secret: this.refreshSecret,
                expiresIn: this.refreshExpiresIn,
            });
            return {
                user,
                accessToken,
                refreshToken,
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.warn(`Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    generateRefreshToken(userId) {
        return this.jwtService.sign({
            sub: userId,
            type: 'refresh',
        }, {
            secret: this.refreshSecret,
            expiresIn: this.refreshExpiresIn,
        });
    }
};
exports.RefreshTokenUsecase = RefreshTokenUsecase;
exports.RefreshTokenUsecase = RefreshTokenUsecase = RefreshTokenUsecase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.UserRepository,
        jwt_1.JwtService,
        config_1.ConfigService])
], RefreshTokenUsecase);
//# sourceMappingURL=refresh-token.usecase.js.map