import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceOrmEntity } from './infrastructure/orm-entities/device.orm-entity';
import { DeviceRepository } from './domain/repositories/device.repository';
import { TypeOrmDeviceRepository } from './infrastructure/repositories/device.repository';
import { DeviceMapper } from './infrastructure/mappers/device.mapper';
import { DeviceService } from './application/services/device.service';
import { JweEncryptionService } from './application/services/jwe-encryption.service';
import { DeviceController } from './application/controllers/device.controller';
import { JwsDeviceGuard } from './application/guards/jws-device.guard';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceOrmEntity]), SessionModule],
  controllers: [DeviceController],
  providers: [
    DeviceMapper,
    DeviceService,
    JweEncryptionService,
    JwsDeviceGuard,
    {
      provide: DeviceRepository,
      useClass: TypeOrmDeviceRepository,
    },
  ],
  exports: [
    DeviceService,
    DeviceRepository,
    JweEncryptionService,
    JwsDeviceGuard,
  ],
})
export class DeviceModule {}
