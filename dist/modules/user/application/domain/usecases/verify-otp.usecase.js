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
var VerifyOtpUsecase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyOtpUsecase = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const repositories_1 = require("../../../infrastructure/repositories");
const services_1 = require("../services");
const usecases_1 = require("../../../../wallet/application/usecases");
let VerifyOtpUsecase = VerifyOtpUsecase_1 = class VerifyOtpUsecase {
    constructor(userRepository, otpService, jwtService, createWalletUseCase, configService) {
        this.userRepository = userRepository;
        this.otpService = otpService;
        this.jwtService = jwtService;
        this.createWalletUseCase = createWalletUseCase;
        this.configService = configService;
        this.logger = new common_1.Logger(VerifyOtpUsecase_1.name);
        this.refreshSecret = this.configService.get('JWT_REFRESH_SECRET', this.configService.get('JWT_SECRET', 'default-secret') + '-refresh');
    }
    async execute(input) {
        const isValid = await this.otpService.verifyOtp(input.phone, input.otp);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid or expired OTP');
        }
        const user = await this.userRepository.findByPhone(input.phone);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isFirstVerification = !user.isPhoneVerified;
        user.verifyPhone();
        const updatedUser = await this.userRepository.save(user);
        let walletCreated = false;
        if (isFirstVerification) {
            try {
                this.logger.log(`Auto-creating wallet for user ${updatedUser.id}`);
                await this.createWalletUseCase.execute({ userId: updatedUser.id });
                walletCreated = true;
                this.logger.log(`Wallet created successfully for user ${updatedUser.id}`);
            }
            catch (error) {
                this.logger.error(`Failed to auto-create wallet for user ${updatedUser.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        const accessToken = this.jwtService.sign({
            sub: updatedUser.id,
            phone: updatedUser.phone,
        });
        const refreshToken = this.jwtService.sign({
            sub: updatedUser.id,
            type: 'refresh',
        }, {
            secret: this.refreshSecret,
            expiresIn: '30d',
        });
        return {
            user: updatedUser,
            accessToken,
            refreshToken,
            walletCreated,
        };
    }
};
exports.VerifyOtpUsecase = VerifyOtpUsecase;
exports.VerifyOtpUsecase = VerifyOtpUsecase = VerifyOtpUsecase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.UserRepository,
        services_1.OtpService,
        jwt_1.JwtService,
        usecases_1.CreateWalletUseCase,
        config_1.ConfigService])
], VerifyOtpUsecase);
//# sourceMappingURL=verify-otp.usecase.js.map