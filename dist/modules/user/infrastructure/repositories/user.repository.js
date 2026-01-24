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
exports.UserRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const orm_entities_1 = require("../orm-entities");
const mappers_1 = require("../mappers");
let UserRepository = class UserRepository {
    constructor(ormRepository) {
        this.ormRepository = ormRepository;
    }
    async save(user) {
        const ormEntity = mappers_1.UserMapper.toOrm(user);
        const saved = await this.ormRepository.save(ormEntity);
        return mappers_1.UserMapper.toDomain(saved);
    }
    async findById(id) {
        const orm = await this.ormRepository.findOne({ where: { id } });
        return orm ? mappers_1.UserMapper.toDomain(orm) : null;
    }
    async findByPhone(phone) {
        const orm = await this.ormRepository.findOne({ where: { phone } });
        return orm ? mappers_1.UserMapper.toDomain(orm) : null;
    }
    async existsByPhone(phone) {
        const count = await this.ormRepository.count({ where: { phone } });
        return count > 0;
    }
    async findAll() {
        const orms = await this.ormRepository.find({
            order: { createdAt: 'DESC' },
        });
        return orms.map((orm) => mappers_1.UserMapper.toDomain(orm));
    }
    async delete(id) {
        await this.ormRepository.delete(id);
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(orm_entities_1.UserOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserRepository);
//# sourceMappingURL=user.repository.js.map