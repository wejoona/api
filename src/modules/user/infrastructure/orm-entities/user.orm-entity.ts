import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  phone: string;

  @Column({ name: 'phone_verified', type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ name: 'first_name', type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'country_code', type: 'varchar', length: 3, default: 'CI' })
  countryCode: string;

  @Column({
    name: 'kyc_status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  kycStatus: string;

  @Column({
    name: 'kyc_provider_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  kycProviderId: string | null;

  // Circle integration
  @Column({
    name: 'circle_user_id',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  @Index()
  circleUserId: string | null;

  @Column({ name: 'circle_user_token', type: 'text', nullable: true })
  circleUserToken: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
