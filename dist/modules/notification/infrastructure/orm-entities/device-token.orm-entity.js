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
exports.DeviceTokenOrmEntity = void 0;
const typeorm_1 = require("typeorm");
let DeviceTokenOrmEntity = class DeviceTokenOrmEntity {
};
exports.DeviceTokenOrmEntity = DeviceTokenOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DeviceTokenOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], DeviceTokenOrmEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500 }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], DeviceTokenOrmEntity.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['ios', 'android', 'web'],
    }),
    __metadata("design:type", String)
], DeviceTokenOrmEntity.prototype, "platform", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], DeviceTokenOrmEntity.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_name', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], DeviceTokenOrmEntity.prototype, "deviceName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], DeviceTokenOrmEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_used_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], DeviceTokenOrmEntity.prototype, "lastUsedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], DeviceTokenOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], DeviceTokenOrmEntity.prototype, "updatedAt", void 0);
exports.DeviceTokenOrmEntity = DeviceTokenOrmEntity = __decorate([
    (0, typeorm_1.Entity)('device_tokens')
], DeviceTokenOrmEntity);
//# sourceMappingURL=device-token.orm-entity.js.map