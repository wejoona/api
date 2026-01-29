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
exports.UserOrmEntity = void 0;
const typeorm_1 = require("typeorm");
let UserOrmEntity = class UserOrmEntity {
};
exports.UserOrmEntity = UserOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'phone_verified', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], UserOrmEntity.prototype, "phoneVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: true, unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_name', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_name', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'country_code', type: 'varchar', length: 3, default: 'CI' }),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "countryCode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'kyc_status',
        type: 'varchar',
        length: 20,
        default: 'pending',
    }),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "kycStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'kyc_provider_id',
        type: 'varchar',
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "kycProviderId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'circle_user_id',
        type: 'varchar',
        length: 100,
        nullable: true,
        unique: true,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "circleUserId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'circle_user_token', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "circleUserToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'user' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'active' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'suspended_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "suspendedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'suspended_reason', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "suspendedReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pin_hash', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "pinHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pin_set_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "pinSetAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pin_attempts', type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], UserOrmEntity.prototype, "pinAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pin_locked_until', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], UserOrmEntity.prototype, "pinLockedUntil", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], UserOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], UserOrmEntity.prototype, "updatedAt", void 0);
exports.UserOrmEntity = UserOrmEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'users', schema: 'auth' })
], UserOrmEntity);
//# sourceMappingURL=user.orm-entity.js.map