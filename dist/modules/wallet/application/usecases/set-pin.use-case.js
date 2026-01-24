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
exports.SetPinUseCase = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const repositories_1 = require("../../../user/infrastructure/repositories");
let SetPinUseCase = class SetPinUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
        this.SALT_ROUNDS = 10;
    }
    async execute(input) {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (input.pin !== input.confirmPin) {
            throw new common_1.BadRequestException('PINs do not match');
        }
        if (!/^\d{4,6}$/.test(input.pin)) {
            throw new common_1.BadRequestException('PIN must be 4-6 digits');
        }
        if (this.isWeakPin(input.pin)) {
            throw new common_1.BadRequestException('PIN is too weak. Avoid sequential or repeated digits.');
        }
        const pinHash = await bcrypt.hash(input.pin, this.SALT_ROUNDS);
        user.setPin(pinHash);
        await this.userRepository.save(user);
        return {
            success: true,
            message: user.pinSetAt ? 'PIN updated successfully' : 'PIN set successfully',
        };
    }
    isWeakPin(pin) {
        if (/^(\d)\1+$/.test(pin)) {
            return true;
        }
        const digits = pin.split('').map(Number);
        let isAscending = true;
        let isDescending = true;
        for (let i = 1; i < digits.length; i++) {
            if (digits[i] !== digits[i - 1] + 1) {
                isAscending = false;
            }
            if (digits[i] !== digits[i - 1] - 1) {
                isDescending = false;
            }
        }
        if (isAscending || isDescending) {
            return true;
        }
        return false;
    }
};
exports.SetPinUseCase = SetPinUseCase;
exports.SetPinUseCase = SetPinUseCase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.UserRepository])
], SetPinUseCase);
//# sourceMappingURL=set-pin.use-case.js.map