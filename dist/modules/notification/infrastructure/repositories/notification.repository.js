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
exports.NotificationRepository = exports.NOTIFICATION_REPOSITORY = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_orm_entity_1 = require("../orm-entities/notification.orm-entity");
exports.NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
let NotificationRepository = class NotificationRepository {
    constructor(repository) {
        this.repository = repository;
    }
    async findByUserId(userId, options) {
        return this.repository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: options?.limit ?? 50,
            skip: options?.offset ?? 0,
        });
    }
    async findUnreadByUserId(userId) {
        return this.repository.find({
            where: { userId, readAt: undefined },
            order: { createdAt: 'DESC' },
        });
    }
    async findById(id) {
        return this.repository.findOne({ where: { id } });
    }
    async save(notification) {
        const entity = this.repository.create(notification);
        return this.repository.save(entity);
    }
    async create(params) {
        return this.save({
            userId: params.userId,
            type: params.type,
            title: params.title,
            body: params.body,
            data: params.data ?? {},
            referenceType: params.referenceType,
            referenceId: params.referenceId,
            status: 'pending',
        });
    }
    async markAsSent(id) {
        await this.repository.update(id, {
            status: 'sent',
            sentAt: new Date(),
        });
    }
    async markAsDelivered(id) {
        await this.repository.update(id, {
            status: 'delivered',
            deliveredAt: new Date(),
        });
    }
    async markAsRead(id) {
        await this.repository.update(id, {
            status: 'read',
            readAt: new Date(),
        });
    }
    async markAllAsRead(userId) {
        await this.repository.update({ userId, readAt: undefined }, { status: 'read', readAt: new Date() });
    }
    async markAsFailed(id) {
        await this.repository.update(id, { status: 'failed' });
    }
    async countUnread(userId) {
        return this.repository.count({
            where: { userId, readAt: undefined },
        });
    }
    async deleteOlderThan(days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const result = await this.repository.delete({
            createdAt: (0, typeorm_2.LessThan)(cutoffDate),
        });
        return result.affected ?? 0;
    }
};
exports.NotificationRepository = NotificationRepository;
exports.NotificationRepository = NotificationRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_orm_entity_1.NotificationOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationRepository);
//# sourceMappingURL=notification.repository.js.map