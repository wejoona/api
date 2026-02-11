import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// ORM Entities
import {
  BlacklistedDeviceOrmEntity,
  WhitelistedAddressOrmEntity,
} from './infrastructure/orm-entities';

// Repositories
import { WhitelistedAddressRepository } from './infrastructure/repositories';

// Services
import {
  DeviceBlacklistService,
  WhitelistedAddressService,
} from './application/services';
import { ServerKeyService } from './application/services/server-key.service';

// Controllers
import {
  DeviceBlacklistController,
  WhitelistedAddressController,
} from './application/controllers';
import { ServerKeyController } from './application/controllers/server-key.controller';

// Interceptors
import { JweDecryptInterceptor } from './application/interceptors/jwe-decrypt.interceptor';

// Guards
import { DeviceBlacklistGuard } from './application/guards/device-blacklist.guard';

// Other modules
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      BlacklistedDeviceOrmEntity,
      WhitelistedAddressOrmEntity,
    ]),
    forwardRef(() => UserModule),
  ],
  controllers: [
    DeviceBlacklistController,
    WhitelistedAddressController,
    ServerKeyController,
  ],
  providers: [
    DeviceBlacklistService,
    DeviceBlacklistGuard,
    WhitelistedAddressRepository,
    WhitelistedAddressService,
    ServerKeyService,
    JweDecryptInterceptor,
  ],
  exports: [
    DeviceBlacklistService,
    DeviceBlacklistGuard,
    WhitelistedAddressService,
    WhitelistedAddressRepository,
    ServerKeyService,
    JweDecryptInterceptor,
  ],
})
export class SecurityModule {}
