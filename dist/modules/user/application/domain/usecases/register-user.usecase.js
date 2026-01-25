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
var RegisterUserUsecase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterUserUsecase = void 0;
const common_1 = require("@nestjs/common");
const entities_1 = require("../entities");
const repositories_1 = require("../../../infrastructure/repositories");
const services_1 = require("../services");
let RegisterUserUsecase = RegisterUserUsecase_1 = class RegisterUserUsecase {
    constructor(userRepository, otpService) {
        this.userRepository = userRepository;
        this.otpService = otpService;
        this.logger = new common_1.Logger(RegisterUserUsecase_1.name);
    }
    async execute(input) {
        const existingUser = await this.userRepository.findByPhone(input.phone);
        if (existingUser) {
            this.logger.debug(`Phone ${input.phone} already registered, sending login OTP`);
            await this.otpService.sendOtp(input.phone);
            return {
                message: 'Verification code sent to your phone',
                otpExpiresIn: 300,
            };
        }
        const user = entities_1.User.create({
            phone: input.phone,
            countryCode: input.countryCode,
        });
        await this.userRepository.save(user);
        await this.otpService.sendOtp(input.phone);
        this.logger.log(`New user registered: ${input.phone}`);
        return {
            message: 'Verification code sent to your phone',
            otpExpiresIn: 300,
        };
    }
};
exports.RegisterUserUsecase = RegisterUserUsecase;
exports.RegisterUserUsecase = RegisterUserUsecase = RegisterUserUsecase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.UserRepository,
        services_1.OtpService])
], RegisterUserUsecase);
//# sourceMappingURL=register-user.usecase.js.map