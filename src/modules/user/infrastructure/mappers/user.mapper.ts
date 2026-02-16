import {
  User,
  KycStatus,
  UserRole,
  UserStatus,
} from '../../application/domain/entities';
import { UserOrmEntity } from '../orm-entities';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return User.reconstitute({
      id: orm.id,
      phone: orm.phone,
      phoneVerified: orm.phoneVerified,
      username: orm.username,
      firstName: orm.firstName,
      lastName: orm.lastName,
      email: orm.email,
      avatarUrl: orm.avatarUrl,
      avatarThumb: orm.avatarThumb ?? null,
      preferredLocale: orm.preferredLocale || 'fr',
      countryCode: orm.countryCode,
      kycStatus: orm.kycStatus as KycStatus,
      kycProviderId: orm.kycProviderId,
      circleUserId: orm.circleUserId,
      circleUserToken: orm.circleUserToken,
      role: (orm.role as UserRole) || 'user',
      status: (orm.status as UserStatus) || 'active',
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

  static toOrm(domain: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = domain.id;
    orm.phone = domain.phone;
    orm.phoneVerified = domain.phoneVerified;
    orm.username = domain.username;
    orm.firstName = domain.firstName;
    orm.lastName = domain.lastName;
    orm.email = domain.email;
    orm.avatarUrl = domain.avatarUrl;
    orm.avatarThumb = domain.avatarThumb;
    orm.preferredLocale = domain.preferredLocale;
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
