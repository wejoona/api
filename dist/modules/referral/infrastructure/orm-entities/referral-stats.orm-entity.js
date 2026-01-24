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
exports.ReferralStatsOrmEntity = void 0;
const typeorm_1 = require("typeorm");
let ReferralStatsOrmEntity = class ReferralStatsOrmEntity {
};
exports.ReferralStatsOrmEntity = ReferralStatsOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ReferralStatsOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ReferralStatsOrmEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'referral_code', type: 'varchar', length: 20, unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], ReferralStatsOrmEntity.prototype, "referralCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_referrals', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ReferralStatsOrmEntity.prototype, "totalReferrals", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_referrals', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ReferralStatsOrmEntity.prototype, "completedReferrals", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pending_referrals', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ReferralStatsOrmEntity.prototype, "pendingReferrals", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_earnings', type: 'bigint', default: 0 }),
    __metadata("design:type", BigInt)
], ReferralStatsOrmEntity.prototype, "totalEarnings", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pending_earnings', type: 'bigint', default: 0 }),
    __metadata("design:type", BigInt)
], ReferralStatsOrmEntity.prototype, "pendingEarnings", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'earnings_currency',
        type: 'varchar',
        length: 10,
        default: 'USDC',
    }),
    __metadata("design:type", String)
], ReferralStatsOrmEntity.prototype, "earningsCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tier', type: 'varchar', length: 20, default: 'bronze' }),
    __metadata("design:type", String)
], ReferralStatsOrmEntity.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ReferralStatsOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ReferralStatsOrmEntity.prototype, "updatedAt", void 0);
exports.ReferralStatsOrmEntity = ReferralStatsOrmEntity = __decorate([
    (0, typeorm_1.Entity)('referral_stats')
], ReferralStatsOrmEntity);
//# sourceMappingURL=referral-stats.orm-entity.js.map