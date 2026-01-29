import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceOrmEntity } from './infrastructure/orm-entities/device.orm-entity';
import { DeviceRepository } from './domain/repositories/device.repository';
import { TypeOrmDeviceRepository } from './infrastructure/repositories/device.repository';
import { DeviceMapper } from './infrastructure/mappers/device.mapper';
import { DeviceService } from './application/services/device.service';
import { DeviceController } from './application/controllers/device.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceOrmEntity])],
  controllers: [DeviceController],
  providers: [
    DeviceMapper,
    DeviceService,
    {
      provide: DeviceRepository,
      useClass: TypeOrmDeviceRepository,
    },
  ],
  exports: [DeviceService, DeviceRepository],
})
export class DeviceModule {}
