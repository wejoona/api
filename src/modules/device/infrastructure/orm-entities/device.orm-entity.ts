import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserOrmEntity } from '../../../user/infrastructure/orm-entities/user.orm-entity';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

@Entity({ name: 'devices', schema: 'auth' })
@Unique('UQ_devices_user_device', ['userId', 'deviceIdentifier'])
export class DeviceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'device_identifier', type: 'varchar', length: 255 })
  deviceIdentifier: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  os: string | null;

  @Column({ name: 'os_version', type: 'varchar', length: 50, nullable: true })
  osVersion: string | null;

  @Column({ name: 'app_version', type: 'varchar', length: 50, nullable: true })
  appVersion: string | null;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
    default: DevicePlatform.ANDROID,
  })
  platform: DevicePlatform;

  @Column({ name: 'fcm_token', type: 'varchar', length: 500, nullable: true })
  @Index()
  fcmToken: string | null;

  @Column({ name: 'is_trusted', type: 'boolean', default: false })
  isTrusted: boolean;

  @Column({ name: 'trusted_at', type: 'timestamp', nullable: true })
  trustedAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @Column({
    name: 'last_ip_address',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  lastIpAddress: string | null;

  @Column({ name: 'login_count', type: 'integer', default: 0 })
  loginCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
