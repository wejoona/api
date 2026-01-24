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
var ReferralService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const referral_repository_1 = require("../../../infrastructure/repositories/referral.repository");
const referral_stats_repository_1 = require("../../../infrastructure/repositories/referral-stats.repository");
const DEFAULT_CONFIG = {
    referrerReward: BigInt(1000000),
    referredReward: BigInt(500000),
    expirationDays: 30,
    minTransactionForCompletion: BigInt(5000000),
};
let ReferralService = ReferralService_1 = class ReferralService {
    constructor(referralRepository, statsRepository, eventEmitter) {
        this.referralRepository = referralRepository;
        this.statsRepository = statsRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(ReferralService_1.name);
        this.config = DEFAULT_CONFIG;
    }
    async generateReferralCode(userId) {
        const existingStats = await this.statsRepository.findByUserId(userId);
        if (existingStats) {
            return existingStats.referralCode;
        }
        const code = this.createUniqueCode();
        await this.statsRepository.create({
            userId,
            referralCode: code,
            totalReferrals: 0,
            completedReferrals: 0,
            pendingReferrals: 0,
            totalEarnings: BigInt(0),
            pendingEarnings: BigInt(0),
            tier: 'bronze',
        });
        this.logger.log(`Generated referral code ${code} for user ${userId}`);
        return code;
    }
    async getUserReferralCode(userId) {
        const stats = await this.statsRepository.findByUserId(userId);
        if (stats) {
            return stats.referralCode;
        }
        return this.generateReferralCode(userId);
    }
    async applyReferralCode(referredUserId, code) {
        const stats = await this.statsRepository.findByCode(code);
        if (!stats) {
            throw new common_1.NotFoundException('Invalid referral code');
        }
        const existingReferral = await this.referralRepository.findByReferredId(referredUserId);
        if (existingReferral) {
            throw new common_1.BadRequestException('User has already been referred');
        }
        if (stats.userId === referredUserId) {
            throw new common_1.BadRequestException('Cannot use your own referral code');
        }
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.config.expirationDays);
        const referral = await this.referralRepository.create({
            referrerId: stats.userId,
            referredId: referredUserId,
            referralCode: code,
            status: 'pending',
            referrerReward: this.config.referrerReward,
            referredReward: this.config.referredReward,
            rewardCurrency: 'USDC',
            expiresAt,
        });
        await this.statsRepository.incrementReferralCount(stats.userId, false);
        this.logger.log(`Applied referral code ${code}: ${stats.userId} referred ${referredUserId}`);
        this.eventEmitter.emit('referral.applied', {
            referralId: referral.id,
            referrerId: stats.userId,
            referredId: referredUserId,
            code,
        });
        return referral;
    }
    async completeReferral(referredUserId) {
        const referral = await this.referralRepository.findByReferredId(referredUserId);
        if (!referral || referral.status !== 'pending') {
            return;
        }
        if (referral.expiresAt && new Date() > referral.expiresAt) {
            await this.referralRepository.updateStatus(referral.id, 'expired');
            return;
        }
        await this.referralRepository.updateStatus(referral.id, 'completed');
        await this.statsRepository.incrementReferralCount(referral.referrerId, true);
        this.logger.log(`Completed referral ${referral.id} for user ${referredUserId}`);
        this.eventEmitter.emit('referral.completed', {
            referralId: referral.id,
            referrerId: referral.referrerId,
            referredId: referredUserId,
        });
    }
    async processRewards(referralId) {
        const referral = await this.referralRepository.findById(referralId);
        if (!referral || referral.status !== 'completed') {
            return;
        }
        await this.referralRepository.updateStatus(referral.id, 'rewarded');
        await this.statsRepository.addEarnings(referral.referrerId, BigInt(referral.referrerReward));
        this.logger.log(`Processed rewards for referral ${referralId}: referrer gets ${referral.referrerReward}`);
        this.eventEmitter.emit('referral.rewarded', {
            referralId: referral.id,
            referrerId: referral.referrerId,
            referredId: referral.referredId,
            referrerReward: referral.referrerReward.toString(),
            referredReward: referral.referredReward.toString(),
        });
    }
    async getUserStats(userId) {
        return this.statsRepository.findByUserId(userId);
    }
    async getUserReferrals(userId) {
        return this.referralRepository.findByReferrerId(userId);
    }
    async getLeaderboard(limit = 10) {
        return this.statsRepository.getTopReferrers(limit);
    }
    async updateUserTier(userId) {
        const stats = await this.statsRepository.findByUserId(userId);
        if (!stats) {
            return 'bronze';
        }
        let tier = 'bronze';
        if (stats.completedReferrals >= 50) {
            tier = 'diamond';
        }
        else if (stats.completedReferrals >= 25) {
            tier = 'platinum';
        }
        else if (stats.completedReferrals >= 10) {
            tier = 'gold';
        }
        else if (stats.completedReferrals >= 5) {
            tier = 'silver';
        }
        if (tier !== stats.tier) {
            await this.statsRepository.updateTier(userId, tier);
            this.eventEmitter.emit('referral.tier.upgraded', {
                userId,
                oldTier: stats.tier,
                newTier: tier,
            });
        }
        return tier;
    }
    createUniqueCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
};
exports.ReferralService = ReferralService;
exports.ReferralService = ReferralService = ReferralService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [referral_repository_1.ReferralRepository,
        referral_stats_repository_1.ReferralStatsRepository,
        event_emitter_1.EventEmitter2])
], ReferralService);
//# sourceMappingURL=referral.service.js.map