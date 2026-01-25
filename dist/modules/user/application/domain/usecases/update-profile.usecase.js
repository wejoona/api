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
exports.UpdateProfileUsecase = void 0;
const common_1 = require("@nestjs/common");
const repositories_1 = require("../../../infrastructure/repositories");
const services_1 = require("../../../../shared/infrastructure/services");
let UpdateProfileUsecase = class UpdateProfileUsecase {
    constructor(userRepository, cacheInvalidationService) {
        this.userRepository = userRepository;
        this.cacheInvalidationService = cacheInvalidationService;
    }
    async execute(input) {
        const user = await this.userRepository.findById(input.userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (input.username !== undefined && input.username !== user.username) {
            const existingUser = await this.userRepository.findByUsername(input.username);
            if (existingUser && existingUser.id !== user.id) {
                throw new common_1.ConflictException('Username is already taken');
            }
        }
        user.updateProfile({
            username: input.username,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
        });
        const updatedUser = await this.userRepository.save(user);
        await this.cacheInvalidationService.invalidateUserProfile(input.userId);
        return updatedUser;
    }
};
exports.UpdateProfileUsecase = UpdateProfileUsecase;
exports.UpdateProfileUsecase = UpdateProfileUsecase = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.UserRepository,
        services_1.CacheInvalidationService])
], UpdateProfileUsecase);
//# sourceMappingURL=update-profile.usecase.js.map