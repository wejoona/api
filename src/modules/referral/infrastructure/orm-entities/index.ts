import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { ReferralOrmEntity } from './referral.orm-entity';
import { ReferralStatsOrmEntity } from './referral-stats.orm-entity';

export * from './referral.orm-entity';
export * from './referral-stats.orm-entity';

export const OrmEntities: EntityClassOrSchema[] = [
  ReferralOrmEntity,
  ReferralStatsOrmEntity,
];
