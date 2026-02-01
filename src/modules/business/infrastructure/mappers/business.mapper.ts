import { Injectable } from '@nestjs/common';
import {
  Business,
  BusinessStatus,
} from '../../domain/entities/business.entity';
import { BusinessOrmEntity } from '../orm-entities/business.orm-entity';

@Injectable()
export class BusinessMapper {
  toDomain(entity: BusinessOrmEntity): Business {
    return Business.reconstitute({
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      registrationNumber: entity.registrationNumber,
      industry: entity.industry,
      address: entity.address,
      city: entity.city,
      country: entity.country,
      phone: entity.phone,
      email: entity.email,
      status: entity.status as BusinessStatus,
      verifiedAt: entity.verifiedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(business: Business): BusinessOrmEntity {
    const entity = new BusinessOrmEntity();
    entity.id = business.id;
    entity.userId = business.userId;
    entity.name = business.name;
    entity.registrationNumber = business.registrationNumber;
    entity.industry = business.industry;
    entity.address = business.address;
    entity.city = business.city;
    entity.country = business.country;
    entity.phone = business.phone;
    entity.email = business.email;
    entity.status = business.status;
    entity.verifiedAt = business.verifiedAt;
    return entity;
  }
}
