import { Contact } from '../../domain/entities';
import { ContactOrmEntity } from '../orm-entities';

export class ContactMapper {
  static toDomain(orm: ContactOrmEntity): Contact {
    return Contact.reconstitute({
      id: orm.id,
      userId: orm.userId,
      contactUserId: orm.contactUserId,
      name: orm.name,
      phone: orm.phone,
      walletAddress: orm.walletAddress,
      username: orm.username,
      isFavorite: orm.isFavorite,
      transactionCount: orm.transactionCount,
      lastTransactionAt: orm.lastTransactionAt,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toOrm(domain: Contact): ContactOrmEntity {
    const orm = new ContactOrmEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.contactUserId = domain.contactUserId;
    orm.name = domain.name;
    orm.phone = domain.phone;
    orm.walletAddress = domain.walletAddress;
    orm.username = domain.username;
    orm.isFavorite = domain.isFavorite;
    orm.transactionCount = domain.transactionCount;
    orm.lastTransactionAt = domain.lastTransactionAt;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }
}
