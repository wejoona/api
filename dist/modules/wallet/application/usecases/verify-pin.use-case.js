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
exports.VerifyPinUseCase = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const repositories_1 = require("../../../user/infrastructure/repositories");
let VerifyPinUseCase = class VerifyPinUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(input) {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.hasPin) {
            throw new common_1.BadRequestException('PIN not set. Please set your PIN first.');
        }
        if (user.isPinLocked) {
            throw new common_1.ForbiddenException({
                message: 'PIN is locked due to too many failed attempts',
                lockedUntil: user.pinLockedUntil,
            });
        }
        const isValid = await bcrypt.compare(input.pin, user.pinHash);
        if (!isValid) {
            user.recordFailedPinAttempt();
            await this.userRepository.save(user);
            const remainingAttempts = Math.max(0, 5 - user.pinAttempts);
            if (user.isPinLocked) {
                throw new common_1.ForbiddenException({
                    message: 'PIN is locked due to too many failed attempts',
                    lockedUntil: user.pinLockedUntil,
                });
            }
            throw new common_1.BadRequestException({
                message: 'Invalid PIN',
                remainingAttempts,
            });
        }
        user.resetPinAttempts();
        await this.userRepository.save(user);
        return {
            valid: true,
            message: 'PIN verified successfully',
        };
    }
};
exports.VerifyPinUseCase = VerifyPinUseCase;
exports.VerifyPinUseCase = VerifyPinUseCase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.UserRepository])
], VerifyPinUseCase);
//# sourceMappingURL=verify-pin.use-case.js.map