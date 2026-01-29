import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationOrmEntity } from './infrastructure/orm-entities/verification.orm-entity';
import { VerificationRepository } from './domain/repositories/verification.repository';
import { TypeOrmVerificationRepository } from './infrastructure/repositories/verification.repository';
import { VerificationMapper } from './infrastructure/mappers/verification.mapper';
import { VerificationService } from './application/services/verification.service';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationOrmEntity])],
  providers: [
    VerificationMapper,
    VerificationService,
    {
      provide: VerificationRepository,
      useClass: TypeOrmVerificationRepository,
    },
  ],
  exports: [VerificationService, VerificationRepository],
})
export class VerificationModule {}
