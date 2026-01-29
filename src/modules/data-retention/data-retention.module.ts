import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataRetentionController } from './application/controllers/data-retention.controller';
import { DataRetentionService } from './application/services/data-retention.service';
import { RetentionPolicyRepository } from './domain/repositories/retention-policy.repository';
import { TypeOrmRetentionPolicyRepository } from './infrastructure/repositories/typeorm-retention-policy.repository';
import {
  RetentionPolicyOrmEntity,
  DataDeletionRequestOrmEntity,
  DataRetentionLogOrmEntity,
} from './infrastructure/orm-entities';

// Import entities from other modules
import { SessionOrmEntity } from '@modules/session/infrastructure/orm-entities/session.orm-entity';
import { VerificationOrmEntity } from '@modules/verification/infrastructure/orm-entities/verification.orm-entity';
import { WebhookDeadletterOrmEntity } from '@modules/webhook/infrastructure/orm-entities/webhook-deadletter.orm-entity';
import { TransactionOrmEntity } from '@modules/transaction/infrastructure/orm-entities';
import { NotificationOrmEntity } from '@modules/notification/infrastructure/orm-entities';
import { FcmTokenOrmEntity } from '@modules/notification/infrastructure/fcm';
import { UserOrmEntity } from '@modules/user/infrastructure/orm-entities/user.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Data retention entities
      RetentionPolicyOrmEntity,
      DataDeletionRequestOrmEntity,
      DataRetentionLogOrmEntity,
      // Entities to be cleaned up
      SessionOrmEntity,
      VerificationOrmEntity,
      WebhookDeadletterOrmEntity,
      TransactionOrmEntity,
      NotificationOrmEntity,
      FcmTokenOrmEntity,
      UserOrmEntity,
    ]),
  ],
  controllers: [DataRetentionController],
  providers: [
    DataRetentionService,
    {
      provide: RetentionPolicyRepository,
      useClass: TypeOrmRetentionPolicyRepository,
    },
  ],
  exports: [DataRetentionService, RetentionPolicyRepository],
})
export class DataRetentionModule {}
