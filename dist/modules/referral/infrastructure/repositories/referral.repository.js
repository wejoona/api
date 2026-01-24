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
exports.ReferralRepository = exports.REFERRAL_REPOSITORY = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const referral_orm_entity_1 = require("../orm-entities/referral.orm-entity");
exports.REFERRAL_REPOSITORY = Symbol('REFERRAL_REPOSITORY');
let ReferralRepository = class ReferralRepository {
    constructor(repository) {
        this.repository = repository;
    }
    async findById(id) {
        return this.repository.findOne({ where: { id } });
    }
    async findByCode(code) {
        return this.repository.findOne({ where: { referralCode: code } });
    }
    async findByReferrerId(referrerId) {
        return this.repository.find({
            where: { referrerId },
            order: { createdAt: 'DESC' },
        });
    }
    async findByReferredId(referredId) {
        return this.repository.findOne({ where: { referredId } });
    }
    async findPendingByCode(code) {
        return this.repository.findOne({
            where: {
                referralCode: code,
                status: 'pending',
                expiresAt: (0, typeorm_2.MoreThan)(new Date()),
            },
        });
    }
    async create(referral) {
        const entity = this.repository.create(referral);
        return this.repository.save(entity);
    }
    async update(id, updates) {
        await this.repository.update(id, updates);
        return this.findById(id);
    }
    async updateStatus(id, status) {
        const updates = { status };
        if (status === 'completed') {
            updates.completedAt = new Date();
        }
        else if (status === 'rewarded') {
            updates.rewardedAt = new Date();
        }
        await this.repository.update(id, updates);
    }
    async countByReferrerId(referrerId) {
        return this.repository.count({ where: { referrerId } });
    }
    async countCompletedByReferrerId(referrerId) {
        return this.repository.count({
            where: { referrerId, status: 'completed' },
        });
    }
    async findUnrewardedCompleted() {
        return this.repository.find({
            where: { status: 'completed' },
            order: { completedAt: 'ASC' },
        });
    }
};
exports.ReferralRepository = ReferralRepository;
exports.ReferralRepository = ReferralRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(referral_orm_entity_1.ReferralOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ReferralRepository);
//# sourceMappingURL=referral.repository.js.map