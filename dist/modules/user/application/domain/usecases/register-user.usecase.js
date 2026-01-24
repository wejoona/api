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
exports.RegisterUserUsecase = void 0;
const common_1 = require("@nestjs/common");
const entities_1 = require("../entities");
const repositories_1 = require("../../../infrastructure/repositories");
const services_1 = require("../services");
let RegisterUserUsecase = class RegisterUserUsecase {
    constructor(userRepository, otpService) {
        this.userRepository = userRepository;
        this.otpService = otpService;
    }
    async execute(input) {
        const existingUser = await this.userRepository.findByPhone(input.phone);
        if (existingUser) {
            throw new common_1.ConflictException('Phone number already registered');
        }
        const user = entities_1.User.create({
            phone: input.phone,
            countryCode: input.countryCode,
        });
        const savedUser = await this.userRepository.save(user);
        await this.otpService.sendOtp(input.phone);
        return {
            user: savedUser,
            otpExpiresIn: 300,
        };
    }
};
exports.RegisterUserUsecase = RegisterUserUsecase;
exports.RegisterUserUsecase = RegisterUserUsecase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.UserRepository,
        services_1.OtpService])
], RegisterUserUsecase);
//# sourceMappingURL=register-user.usecase.js.map