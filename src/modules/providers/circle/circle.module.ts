import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  CircleIdentityAdapter,
  CircleWalletAdapter,
  CircleTransferAdapter,
} from './adapters';
import {
  IDENTITY_PROVIDER,
  WALLET_PROVIDER,
  TRANSFER_PROVIDER,
} from '../interfaces';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Circle Adapters
    CircleIdentityAdapter,
    CircleWalletAdapter,
    CircleTransferAdapter,

    // Bind to interfaces
    {
      provide: IDENTITY_PROVIDER,
      useExisting: CircleIdentityAdapter,
    },
    {
      provide: WALLET_PROVIDER,
      useExisting: CircleWalletAdapter,
    },
    {
      provide: TRANSFER_PROVIDER,
      useExisting: CircleTransferAdapter,
    },
  ],
  exports: [
    IDENTITY_PROVIDER,
    WALLET_PROVIDER,
    TRANSFER_PROVIDER,
    CircleIdentityAdapter,
    CircleWalletAdapter,
    CircleTransferAdapter,
  ],
})
export class CircleModule {}
