import { Device } from '../entities/device.entity';

export abstract class DeviceRepository {
  abstract findById(id: string): Promise<Device | null>;

  abstract findByUserIdAndIdentifier(
    userId: string,
    deviceIdentifier: string,
  ): Promise<Device | null>;

  abstract findByUserId(userId: string): Promise<Device[]>;

  abstract findActiveByUserId(userId: string): Promise<Device[]>;

  abstract findByFcmToken(fcmToken: string): Promise<Device | null>;

  abstract save(device: Device): Promise<Device>;

  abstract delete(id: string): Promise<void>;

  abstract deactivateAllForUser(userId: string): Promise<number>;

  abstract countActiveDevices(userId: string): Promise<number>;
}
