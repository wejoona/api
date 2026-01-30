import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

/**
 * Admin Users Seed
 *
 * Seeds initial admin accounts for system management.
 *
 * IMPORTANT: In production, change the default password immediately
 * after first login. The password is only used for initial setup.
 *
 * Admin roles:
 * - super_admin: Full system access
 * - admin: Standard admin access (no system config)
 * - compliance_officer: KYC/AML review access
 * - support_agent: Customer support access
 * - finance_admin: Financial reports and reconciliation
 * - auditor: Read-only audit access
 */

interface AdminUserSeedData {
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  pinCode: string; // Will be hashed
}

// Default initial admin users
const adminUsers: AdminUserSeedData[] = [
  {
    phone: '+22500000001',
    username: 'superadmin',
    firstName: 'System',
    lastName: 'Administrator',
    email: 'admin@joonapay.com',
    role: 'super_admin',
    pinCode: '123456', // CHANGE IN PRODUCTION
  },
  {
    phone: '+22500000002',
    username: 'compliance',
    firstName: 'Compliance',
    lastName: 'Officer',
    email: 'compliance@joonapay.com',
    role: 'compliance_officer',
    pinCode: '123456', // CHANGE IN PRODUCTION
  },
  {
    phone: '+22500000003',
    username: 'support',
    firstName: 'Support',
    lastName: 'Lead',
    email: 'support@joonapay.com',
    role: 'support_agent',
    pinCode: '123456', // CHANGE IN PRODUCTION
  },
  {
    phone: '+22500000004',
    username: 'finance',
    firstName: 'Finance',
    lastName: 'Manager',
    email: 'finance@joonapay.com',
    role: 'finance_admin',
    pinCode: '123456', // CHANGE IN PRODUCTION
  },
];

// Admin permissions by role
const rolePermissions: Record<string, string[]> = {
  super_admin: [
    'users:read',
    'users:write',
    'users:delete',
    'users:suspend',
    'wallets:read',
    'wallets:write',
    'wallets:freeze',
    'transactions:read',
    'transactions:review',
    'transactions:reverse',
    'kyc:read',
    'kyc:review',
    'kyc:approve',
    'kyc:reject',
    'compliance:read',
    'compliance:review',
    'compliance:resolve',
    'support:read',
    'support:write',
    'support:resolve',
    'reports:read',
    'reports:generate',
    'system:read',
    'system:configure',
    'feature_flags:read',
    'feature_flags:write',
    'audit:read',
    'admin:read',
    'admin:write',
    'admin:delete',
  ],
  admin: [
    'users:read',
    'users:write',
    'users:suspend',
    'wallets:read',
    'wallets:freeze',
    'transactions:read',
    'transactions:review',
    'kyc:read',
    'kyc:review',
    'compliance:read',
    'compliance:review',
    'support:read',
    'support:write',
    'support:resolve',
    'reports:read',
    'feature_flags:read',
    'audit:read',
  ],
  compliance_officer: [
    'users:read',
    'wallets:read',
    'transactions:read',
    'transactions:review',
    'kyc:read',
    'kyc:review',
    'kyc:approve',
    'kyc:reject',
    'compliance:read',
    'compliance:review',
    'compliance:resolve',
    'reports:read',
    'reports:generate',
    'audit:read',
  ],
  support_agent: [
    'users:read',
    'wallets:read',
    'transactions:read',
    'kyc:read',
    'support:read',
    'support:write',
    'support:resolve',
    'audit:read',
  ],
  finance_admin: [
    'wallets:read',
    'transactions:read',
    'transactions:review',
    'reports:read',
    'reports:generate',
    'audit:read',
  ],
  auditor: [
    'users:read',
    'wallets:read',
    'transactions:read',
    'kyc:read',
    'compliance:read',
    'support:read',
    'reports:read',
    'audit:read',
    'system:read',
    'feature_flags:read',
  ],
};

async function hashPin(pin: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(pin, saltRounds);
}

export async function seedAdminUsers(dataSource: DataSource): Promise<void> {
  console.log('Seeding admin users...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Ensure auth schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS auth`);

    // Create roles table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth.roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT[] DEFAULT '{}',
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed roles first
    for (const [roleName, permissions] of Object.entries(rolePermissions)) {
      const existingRole = await queryRunner.query(
        `SELECT id FROM auth.roles WHERE name = $1`,
        [roleName],
      );

      if (existingRole.length === 0) {
        await queryRunner.query(
          `INSERT INTO auth.roles (id, name, description, permissions, is_system, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [
            uuidv4(),
            roleName,
            `${roleName.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} role`,
            permissions,
            true,
          ],
        );
        console.log(`  Created role: ${roleName}`);
      } else {
        // Update permissions if role exists
        await queryRunner.query(
          `UPDATE auth.roles SET permissions = $1, updated_at = NOW() WHERE name = $2`,
          [permissions, roleName],
        );
        console.log(`  Updated role permissions: ${roleName}`);
      }
    }

    // Seed admin users
    for (const admin of adminUsers) {
      // Check if user already exists
      const existing = await queryRunner.query(
        `SELECT id FROM auth.users WHERE phone = $1 OR username = $2`,
        [admin.phone, admin.username],
      );

      if (existing.length === 0) {
        const userId = uuidv4();
        const pinHash = await hashPin(admin.pinCode);

        await queryRunner.query(
          `INSERT INTO auth.users (
            id, phone, phone_verified, username, first_name, last_name,
            email, country_code, kyc_status, role, status,
            pin_hash, pin_set_at, pin_attempts, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
          [
            userId,
            admin.phone,
            true, // Phone verified
            admin.username,
            admin.firstName,
            admin.lastName,
            admin.email,
            'CI', // Cote d'Ivoire
            'approved', // Admin accounts are pre-approved
            admin.role,
            'active',
            pinHash,
            new Date(),
            0,
          ],
        );

        console.log(
          `  Created admin user: ${admin.username} (${admin.role})`,
        );
        console.log(
          `    WARNING: Default PIN is '${admin.pinCode}' - CHANGE IMMEDIATELY IN PRODUCTION`,
        );
      } else {
        console.log(`  Skipped (exists): ${admin.username}`);
      }
    }

    await queryRunner.commitTransaction();
    console.log(
      `Admin users seeded: ${adminUsers.length} admins, ${Object.keys(rolePermissions).length} roles`,
    );
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Failed to seed admin users:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default seedAdminUsers;
