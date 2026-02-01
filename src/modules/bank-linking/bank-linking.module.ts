import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkedBankAccountOrmEntity } from './infrastructure/orm-entities/linked-bank-account.orm-entity';
import { BankOrmEntity } from './infrastructure/orm-entities/bank.orm-entity';
import { LinkedBankAccountRepository } from './domain/repositories/linked-bank-account.repository';
import { BankRepository } from './domain/repositories/bank.repository';
import { TypeOrmLinkedBankAccountRepository } from './infrastructure/repositories/linked-bank-account.repository';
import { TypeOrmBankRepository } from './infrastructure/repositories/bank.repository';
import { LinkedBankAccountMapper } from './infrastructure/mappers/linked-bank-account.mapper';
import { BankMapper } from './infrastructure/mappers/bank.mapper';
import { BankLinkingService } from './application/services/bank-linking.service';
import { BankLinkingController } from './application/controllers/bank-linking.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LinkedBankAccountOrmEntity, BankOrmEntity]),
  ],
  controllers: [BankLinkingController],
  providers: [
    LinkedBankAccountMapper,
    BankMapper,
    BankLinkingService,
    {
      provide: LinkedBankAccountRepository,
      useClass: TypeOrmLinkedBankAccountRepository,
    },
    {
      provide: BankRepository,
      useClass: TypeOrmBankRepository,
    },
  ],
  exports: [BankLinkingService, LinkedBankAccountRepository, BankRepository],
})
export class BankLinkingModule {}
