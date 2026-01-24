import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { TransferOrmEntity } from './transfer.orm-entity';

export * from './transfer.orm-entity';

export const OrmEntities: EntityClassOrSchema[] = [TransferOrmEntity];
