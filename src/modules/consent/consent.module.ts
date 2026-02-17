import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { ConsentController } from './application/controllers/consent.controller';
import { ConsentService } from './application/services/consent.service';
import { ConsentRepository } from './domain/repositories/consent.repository';
import { TypeOrmConsentRepository } from './infrastructure/repositories/typeorm-consent.repository';
import { ConsentRecordOrmEntity } from './infrastructure/orm-entities/consent-record.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsentRecordOrmEntity]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [ConsentController],
  providers: [
    ConsentService,
    {
      provide: ConsentRepository,
      useClass: TypeOrmConsentRepository,
    },
  ],
  exports: [ConsentService],
})
export class ConsentModule {}
