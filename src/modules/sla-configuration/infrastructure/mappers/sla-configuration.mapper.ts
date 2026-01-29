import { Injectable } from '@nestjs/common';
import {
  SlaConfiguration,
  SlaCategory,
  SlaPriority,
} from '../../domain/entities/sla-configuration.entity';
import { SlaConfigurationOrmEntity } from '../orm-entities/sla-configuration.orm-entity';

@Injectable()
export class SlaConfigurationMapper {
  toDomain(entity: SlaConfigurationOrmEntity): SlaConfiguration {
    return SlaConfiguration.reconstitute({
      id: entity.id,
      name: entity.name,
      category: entity.category as SlaCategory,
      priority: entity.priority as SlaPriority,
      responseTimeMinutes: entity.responseTimeMinutes,
      resolutionTimeMinutes: entity.resolutionTimeMinutes,
      escalationAfterMinutes: entity.escalationAfterMinutes ?? undefined,
      isActive: entity.isActive,
      businessHoursOnly: entity.businessHoursOnly,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toOrmEntity(domain: SlaConfiguration): SlaConfigurationOrmEntity {
    const entity = new SlaConfigurationOrmEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.category = domain.category;
    entity.priority = domain.priority;
    entity.responseTimeMinutes = domain.responseTimeMinutes;
    entity.resolutionTimeMinutes = domain.resolutionTimeMinutes;
    entity.escalationAfterMinutes = domain.escalationAfterMinutes;
    entity.isActive = domain.isActive;
    entity.businessHoursOnly = domain.businessHoursOnly;
    return entity;
  }
}
