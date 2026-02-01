import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubBusinessOrmEntity } from './infrastructure/orm-entities/sub-business.orm-entity';
import { SubBusinessRepository } from './domain/repositories/sub-business.repository';
import { TypeOrmSubBusinessRepository } from './infrastructure/repositories/sub-business.repository';
import { SubBusinessMapper } from './infrastructure/mappers/sub-business.mapper';
import { SubBusinessService } from './application/services/sub-business.service';
import { SubBusinessController } from './application/controllers/sub-business.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SubBusinessOrmEntity])],
  controllers: [SubBusinessController],
  providers: [
    SubBusinessMapper,
    SubBusinessService,
    {
      provide: SubBusinessRepository,
      useClass: TypeOrmSubBusinessRepository,
    },
  ],
  exports: [SubBusinessService, SubBusinessRepository],
})
export class SubBusinessModule {}
