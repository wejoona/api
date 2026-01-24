"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMapper = void 0;
const entities_1 = require("../../application/domain/entities");
const orm_entities_1 = require("../orm-entities");
class UserMapper {
    static toDomain(orm) {
        return entities_1.User.reconstitute({
            id: orm.id,
            phone: orm.phone,
            phoneVerified: orm.phoneVerified,
            firstName: orm.firstName,
            lastName: orm.lastName,
            email: orm.email,
            countryCode: orm.countryCode,
            kycStatus: orm.kycStatus,
            kycProviderId: orm.kycProviderId,
            circleUserId: orm.circleUserId,
            circleUserToken: orm.circleUserToken,
            role: orm.role || 'user',
            status: orm.status || 'active',
            suspendedAt: orm.suspendedAt,
            suspendedReason: orm.suspendedReason,
            pinHash: orm.pinHash,
            pinSetAt: orm.pinSetAt,
            pinAttempts: orm.pinAttempts ?? 0,
            pinLockedUntil: orm.pinLockedUntil,
            createdAt: orm.createdAt,
            updatedAt: orm.updatedAt,
        });
    }
    static toOrm(domain) {
        const orm = new orm_entities_1.UserOrmEntity();
        orm.id = domain.id;
        orm.phone = domain.phone;
        orm.phoneVerified = domain.phoneVerified;
        orm.firstName = domain.firstName;
        orm.lastName = domain.lastName;
        orm.email = domain.email;
        orm.countryCode = domain.countryCode;
        orm.kycStatus = domain.kycStatus;
        orm.kycProviderId = domain.kycProviderId;
        orm.circleUserId = domain.circleUserId;
        orm.circleUserToken = domain.circleUserToken;
        orm.role = domain.role;
        orm.status = domain.status;
        orm.suspendedAt = domain.suspendedAt;
        orm.suspendedReason = domain.suspendedReason;
        orm.pinHash = domain.pinHash;
        orm.pinSetAt = domain.pinSetAt;
        orm.pinAttempts = domain.pinAttempts;
        orm.pinLockedUntil = domain.pinLockedUntil;
        orm.createdAt = domain.createdAt;
        orm.updatedAt = domain.updatedAt;
        return orm;
    }
}
exports.UserMapper = UserMapper;
//# sourceMappingURL=user.mapper.js.map