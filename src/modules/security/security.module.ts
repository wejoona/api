import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlacklistedDeviceOrmEntity } from './infrastructure/orm-entities/blacklisted-device.orm-entity';
import { DeviceBlacklistService } from './application/services/device-blacklist.service';
import { DeviceBlacklistGuard } from './application/guards/device-blacklist.guard';
import { DeviceBlacklistController } from './application/controllers/device-blacklist.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([BlacklistedDeviceOrmEntity]),
  ],
  controllers: [DeviceBlacklistController],
  providers: [
    DeviceBlacklistService,
    DeviceBlacklistGuard,
  ],
  exports: [
    DeviceBlacklistService,
    DeviceBlacklistGuard,
  ],
})
export class SecurityModule {}
