import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ORM Entities
import {
  BulkPaymentOrmEntity,
  BulkPaymentItemOrmEntity,
} from './infrastructure/orm-entities/bulk-payment.orm-entity';

// Repositories
import { BulkPaymentRepository } from './domain/repositories/bulk-payment.repository';
import { TypeOrmBulkPaymentRepository } from './infrastructure/repositories/typeorm-bulk-payment.repository';

// Mappers
import { BulkPaymentMapper } from './infrastructure/mappers/bulk-payment.mapper';

// Services
import { BulkPaymentService } from './application/services/bulk-payment.service';

// Controllers
import { BulkPaymentController } from './application/controllers/bulk-payment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BulkPaymentOrmEntity, BulkPaymentItemOrmEntity]),
  ],
  providers: [
    BulkPaymentMapper,
    BulkPaymentService,
    {
      provide: BulkPaymentRepository,
      useClass: TypeOrmBulkPaymentRepository,
    },
  ],
  controllers: [BulkPaymentController],
  exports: [BulkPaymentRepository, BulkPaymentService],
})
export class BulkPaymentsModule {}
