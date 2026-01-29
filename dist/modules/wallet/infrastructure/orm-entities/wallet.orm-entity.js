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
exports.WalletOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const orm_entities_1 = require("../../../user/infrastructure/orm-entities");
let WalletOrmEntity = class WalletOrmEntity {
};
exports.WalletOrmEntity = WalletOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WalletOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], WalletOrmEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'yellow_card_wallet_id',
        type: 'varchar',
        length: 100,
        nullable: true,
        unique: true,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], WalletOrmEntity.prototype, "yellowCardWalletId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'circle_wallet_id',
        type: 'varchar',
        length: 100,
        nullable: true,
        unique: true,
    }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], WalletOrmEntity.prototype, "circleWalletId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'circle_wallet_address',
        type: 'varchar',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", Object)
], WalletOrmEntity.prototype, "circleWalletAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'USDC' }),
    __metadata("design:type", String)
], WalletOrmEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 18, scale: 6, default: 0 }),
    __metadata("design:type", Number)
], WalletOrmEntity.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'kyc_status', type: 'varchar', length: 20, default: 'none' }),
    __metadata("design:type", String)
], WalletOrmEntity.prototype, "kycStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'active' }),
    __metadata("design:type", String)
], WalletOrmEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)(),
    __metadata("design:type", Number)
], WalletOrmEntity.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WalletOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], WalletOrmEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => orm_entities_1.UserOrmEntity),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", orm_entities_1.UserOrmEntity)
], WalletOrmEntity.prototype, "user", void 0);
exports.WalletOrmEntity = WalletOrmEntity = __decorate([
    (0, typeorm_1.Entity)('wallets')
], WalletOrmEntity);
//# sourceMappingURL=wallet.orm-entity.js.map