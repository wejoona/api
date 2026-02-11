import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PulsarService } from './pulsar.service';
import { WalletCreditConsumer } from './wallet-credit.consumer';
import { BlnkModule } from '../providers/blnk/blnk.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [ConfigModule, BlnkModule, UserModule],
  providers: [PulsarService, WalletCreditConsumer],
  exports: [PulsarService],
})
export class MessagingModule {}
