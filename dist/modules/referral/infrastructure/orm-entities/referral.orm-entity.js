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
exports.ReferralOrmEntity = void 0;
const typeorm_1 = require("typeorm");
let ReferralOrmEntity = class ReferralOrmEntity {
};
exports.ReferralOrmEntity = ReferralOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReferralOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'referrer_id', type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ReferralOrmEntity.prototype, "referrerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'referred_id', type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ReferralOrmEntity.prototype, "referredId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'referral_code', type: 'varchar', length: 20, unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ReferralOrmEntity.prototype, "referralCode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['pending', 'completed', 'expired', 'rewarded'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], ReferralOrmEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'referrer_reward', type: 'bigint', default: 0 }),
    __metadata("design:type", BigInt)
], ReferralOrmEntity.prototype, "referrerReward", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'referred_reward', type: 'bigint', default: 0 }),
    __metadata("design:type", BigInt)
], ReferralOrmEntity.prototype, "referredReward", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'reward_currency',
        type: 'varchar',
        length: 10,
        default: 'USDC',
    }),
    __metadata("design:type", String)
], ReferralOrmEntity.prototype, "rewardCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rewarded_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ReferralOrmEntity.prototype, "rewardedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ReferralOrmEntity.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ReferralOrmEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: '{}' }),
    __metadata("design:type", Object)
], ReferralOrmEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ReferralOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ReferralOrmEntity.prototype, "updatedAt", void 0);
exports.ReferralOrmEntity = ReferralOrmEntity = __decorate([
    (0, typeorm_1.Entity)('referrals')
], ReferralOrmEntity);
//# sourceMappingURL=referral.orm-entity.js.map