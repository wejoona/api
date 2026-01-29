import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceRepository } from '../../domain/repositories/device.repository';
import { Device } from '../../domain/entities/device.entity';
import { DeviceOrmEntity } from '../orm-entities/device.orm-entity';
import { DeviceMapper } from '../mappers/device.mapper';

@Injectable()
export class TypeOrmDeviceRepository extends DeviceRepository {
  constructor(
    @InjectRepository(DeviceOrmEntity)
    private readonly repo: Repository<DeviceOrmEntity>,
    private readonly mapper: DeviceMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<Device | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUserIdAndIdentifier(
    userId: string,
    deviceIdentifier: string,
  ): Promise<Device | null> {
    const entity = await this.repo.findOne({
      where: { userId, deviceIdentifier },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Device[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { lastLoginAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findActiveByUserId(userId: string): Promise<Device[]> {
    const entities = await this.repo.find({
      where: { userId, isActive: true },
      order: { lastLoginAt: 'DESC' },
    });
    return entities.map((e) => this.mapper.toDomain(e));
  }

  async findByFcmToken(fcmToken: string): Promise<Device | null> {
    const entity = await this.repo.findOne({
      where: { fcmToken },
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }

  async save(device: Device): Promise<Device> {
    const entity = this.mapper.toOrmEntity(device);
    const saved = await this.repo.save(entity);
    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deactivateAllForUser(userId: string): Promise<number> {
    const result = await this.repo.update(
      { userId, isActive: true },
      { isActive: false },
    );
    return result.affected ?? 0;
  }

  async countActiveDevices(userId: string): Promise<number> {
    return this.repo.count({
      where: { userId, isActive: true },
    });
  }
}
