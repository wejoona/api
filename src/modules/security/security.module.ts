import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

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

// Controllers
import {
  DeviceBlacklistController,
  WhitelistedAddressController,
} from './application/controllers';

// Guards
import { DeviceBlacklistGuard } from './application/guards/device-blacklist.guard';

// Other modules
import { UserModule } from '../user/user.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlacklistedDeviceOrmEntity,
      WhitelistedAddressOrmEntity,
    ]),
    forwardRef(() => UserModule),
  ],
  controllers: [DeviceBlacklistController, WhitelistedAddressController],
  providers: [
    DeviceBlacklistService,
    DeviceBlacklistGuard,
    WhitelistedAddressRepository,
    WhitelistedAddressService,
  ],
  exports: [
    DeviceBlacklistService,
    DeviceBlacklistGuard,
    WhitelistedAddressService,
    WhitelistedAddressRepository,
  ],
})
export class SecurityModule {}
