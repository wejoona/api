import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Deposit } from './application/domain/entities/deposit.entity';
import { DepositsController } from './application/controllers/deposits.controller';
import { DepositService } from './application/domain/services/deposit.service';
import { DepositTokenService } from './application/domain/services/deposit-token.service';
import { MockDepositProvider } from './application/domain/services/mock-deposit.provider';
import { DEPOSIT_PROVIDER } from './application/domain/services/deposit-provider.interface';
import { DepositCompletedListener } from './application/domain/events/deposit-completed.listener';
import { KeyVaultService } from '../shared/infrastructure/services/key-vault.service';
import { BlnkLedgerAdapter } from '../providers/blnk/adapters/blnk-ledger.adapter';
import { NtmClientService } from '../shared/infrastructure/services/ntm-client.service';

@Module({
  imports: [TypeOrmModule.forFeature([Deposit]), HttpModule],
  providers: [
    DepositService,
    DepositTokenService,
    { provide: DEPOSIT_PROVIDER, useClass: MockDepositProvider },
    DepositCompletedListener,
    KeyVaultService,
    BlnkLedgerAdapter,
    NtmClientService,
  ],
  controllers: [DepositsController],
})
export class DepositsModule {}
