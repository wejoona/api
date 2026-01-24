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
exports.ReferralStatsRepository = exports.REFERRAL_STATS_REPOSITORY = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const referral_stats_orm_entity_1 = require("../orm-entities/referral-stats.orm-entity");
exports.REFERRAL_STATS_REPOSITORY = Symbol('REFERRAL_STATS_REPOSITORY');
let ReferralStatsRepository = class ReferralStatsRepository {
    constructor(repository) {
        this.repository = repository;
    }
    async findByUserId(userId) {
        return this.repository.findOne({ where: { userId } });
    }
    async findByCode(code) {
        return this.repository.findOne({ where: { referralCode: code } });
    }
    async create(stats) {
        const entity = this.repository.create(stats);
        return this.repository.save(entity);
    }
    async update(userId, updates) {
        await this.repository.update({ userId }, updates);
        return this.findByUserId(userId);
    }
    async incrementReferralCount(userId, completed) {
        if (completed) {
            await this.repository.increment({ userId }, 'completedReferrals', 1);
            await this.repository.decrement({ userId }, 'pendingReferrals', 1);
        }
        else {
            await this.repository.increment({ userId }, 'totalReferrals', 1);
            await this.repository.increment({ userId }, 'pendingReferrals', 1);
        }
    }
    async addEarnings(userId, amount) {
        const stats = await this.findByUserId(userId);
        if (stats) {
            await this.repository.update({ userId }, {
                totalEarnings: BigInt(stats.totalEarnings) + amount,
            });
        }
    }
    async getTopReferrers(limit = 10) {
        return this.repository.find({
            order: { completedReferrals: 'DESC' },
            take: limit,
        });
    }
    async updateTier(userId, tier) {
        await this.repository.update({ userId }, { tier });
    }
};
exports.ReferralStatsRepository = ReferralStatsRepository;
exports.ReferralStatsRepository = ReferralStatsRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(referral_stats_orm_entity_1.ReferralStatsOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ReferralStatsRepository);
//# sourceMappingURL=referral-stats.repository.js.map