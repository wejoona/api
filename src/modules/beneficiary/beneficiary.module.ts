import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeneficiaryOrmEntity } from './infrastructure/orm-entities/beneficiary.orm-entity';
import { BeneficiaryRepository } from './domain/repositories/beneficiary.repository';
import { TypeOrmBeneficiaryRepository } from './infrastructure/repositories/beneficiary.repository';
import { BeneficiaryMapper } from './infrastructure/mappers/beneficiary.mapper';
import { BeneficiaryService } from './application/services/beneficiary.service';
import { BeneficiaryController } from './application/controllers/beneficiary.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BeneficiaryOrmEntity])],
  controllers: [BeneficiaryController],
  providers: [
    BeneficiaryMapper,
    BeneficiaryService,
    {
      provide: BeneficiaryRepository,
      useClass: TypeOrmBeneficiaryRepository,
    },
  ],
  exports: [BeneficiaryService, BeneficiaryRepository],
})
export class BeneficiaryModule {}
