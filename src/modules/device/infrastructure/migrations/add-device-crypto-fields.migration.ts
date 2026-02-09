import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration to add JWS/JWE cryptographic fields to the devices table.
 *
 * Adds:
 * - public_key_jwk: JSONB column for storing ECDH P-256 public key in JWK format
 * - device_name: Human-readable device name
 */
export class AddDeviceCryptoFields1707500000000
  implements MigrationInterface
{
  name = 'AddDeviceCryptoFields1707500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'auth.devices',
      new TableColumn({
        name: 'public_key_jwk',
        type: 'jsonb',
        isNullable: true,
        comment: 'ECDH P-256 public key in JWK format for JWS/JWE',
      }),
    );

    await queryRunner.addColumn(
      'auth.devices',
      new TableColumn({
        name: 'device_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Human-readable device name',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('auth.devices', 'device_name');
    await queryRunner.dropColumn('auth.devices', 'public_key_jwk');
  }
}
