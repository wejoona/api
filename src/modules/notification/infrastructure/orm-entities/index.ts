import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { DeviceTokenOrmEntity } from './device-token.orm-entity';
import { NotificationOrmEntity } from './notification.orm-entity';

export * from './device-token.orm-entity';
export * from './notification.orm-entity';

export const OrmEntities: EntityClassOrSchema[] = [
  DeviceTokenOrmEntity,
  NotificationOrmEntity,
];
