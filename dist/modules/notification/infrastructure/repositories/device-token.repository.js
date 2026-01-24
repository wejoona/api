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
exports.DeviceTokenRepository = exports.DEVICE_TOKEN_REPOSITORY = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const device_token_orm_entity_1 = require("../orm-entities/device-token.orm-entity");
exports.DEVICE_TOKEN_REPOSITORY = Symbol('DEVICE_TOKEN_REPOSITORY');
let DeviceTokenRepository = class DeviceTokenRepository {
    constructor(repository) {
        this.repository = repository;
    }
    async findByUserId(userId) {
        return this.repository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
    async findActiveByUserId(userId) {
        return this.repository.find({
            where: { userId, isActive: true },
            order: { lastUsedAt: 'DESC' },
        });
    }
    async findByToken(token) {
        return this.repository.findOne({ where: { token } });
    }
    async save(deviceToken) {
        const entity = this.repository.create(deviceToken);
        return this.repository.save(entity);
    }
    async upsert(userId, token, platform, deviceId, deviceName) {
        const existing = await this.repository.findOne({
            where: { userId, token },
        });
        if (existing) {
            existing.isActive = true;
            existing.lastUsedAt = new Date();
            existing.platform = platform;
            if (deviceId)
                existing.deviceId = deviceId;
            if (deviceName)
                existing.deviceName = deviceName;
            return this.repository.save(existing);
        }
        return this.save({
            userId,
            token,
            platform,
            deviceId,
            deviceName,
            isActive: true,
            lastUsedAt: new Date(),
        });
    }
    async deactivateToken(token) {
        await this.repository.update({ token }, { isActive: false });
    }
    async updateLastUsed(token) {
        await this.repository.update({ token }, { lastUsedAt: new Date() });
    }
    async deactivateAllForUser(userId) {
        await this.repository.update({ userId }, { isActive: false });
    }
};
exports.DeviceTokenRepository = DeviceTokenRepository;
exports.DeviceTokenRepository = DeviceTokenRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(device_token_orm_entity_1.DeviceTokenOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], DeviceTokenRepository);
//# sourceMappingURL=device-token.repository.js.map