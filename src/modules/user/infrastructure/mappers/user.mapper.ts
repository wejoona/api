import { User, KycStatus } from '../../application/domain/entities';
import { UserOrmEntity } from '../orm-entities';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return User.reconstitute({
      id: orm.id,
      phone: orm.phone,
      phoneVerified: orm.phoneVerified,
      firstName: orm.firstName,
      lastName: orm.lastName,
      email: orm.email,
      countryCode: orm.countryCode,
      kycStatus: orm.kycStatus as KycStatus,
      kycProviderId: orm.kycProviderId,
      circleUserId: orm.circleUserId,
      circleUserToken: orm.circleUserToken,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: User): UserOrmEntity {
    const orm = new UserOrmEntity();
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
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
