import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessOrmEntity } from './infrastructure/orm-entities/business.orm-entity';
import { BusinessRepository } from './domain/repositories/business.repository';
import { TypeOrmBusinessRepository } from './infrastructure/repositories/business.repository';
import { BusinessMapper } from './infrastructure/mappers/business.mapper';
import { BusinessService } from './application/services/business.service';
import { BusinessController } from './application/controllers/business.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessOrmEntity])],
  controllers: [BusinessController],
  providers: [
    BusinessMapper,
    BusinessService,
    {
      provide: BusinessRepository,
      useClass: TypeOrmBusinessRepository,
    },
  ],
  exports: [BusinessService, BusinessRepository],
})
export class BusinessModule {}
