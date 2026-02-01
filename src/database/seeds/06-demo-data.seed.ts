import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

/**
 * Demo Data Seed (STAGING ONLY)
 *
 * Seeds realistic test data for staging/development environments:
 * - Test users with different KYC tiers
 * - Sample transactions
 * - Sample beneficiaries
 * - Realistic West African names and phone numbers
 *
 * DO NOT RUN IN PRODUCTION!
 */

// West African names for realistic test data
const westAfricanNames = {
  firstNames: {
    male: [
      'Amadou',
      'Ibrahim',
      'Moussa',
      'Kofi',
      'Mamadou',
      'Ousmane',
      'Sekou',
      'Boubacar',
      'Youssouf',
      'Abdoulaye',
      'Cheick',
      'Modibo',
      'Bakary',
      'Souleymane',
      'Drissa',
      'Lamine',
      'Ismaila',
      'Tidiane',
    ],
    female: [
      'Fatou',
      'Aminata',
      'Mariam',
      'Aissatou',
      'Kadiatou',
      'Fatoumata',
      'Rama',
      'Adja',
      'Bintou',
      'Oumou',
      'Sira',
      'Nana',
      'Djénéba',
      'Salimata',
      'Rokia',
      'Maïmouna',
      'Awa',
      'Korotoumou',
    ],
  },
  lastNames: [
    'Diallo',
    'Touré',
    'Konaté',
    'Traoré',
    'Coulibaly',
    'Bamba',
    'Koné',
    'Camara',
    'Sylla',
    'Keita',
    'Sanogo',
    'Sidibé',
    'Cissé',
    'Ouattara',
    'Diabaté',
    'Dembélé',
    'Doumbia',
    'Fofana',
    'Sissoko',
    'Diarra',
    'Kanté',
    'Samaké',
    'Bagayoko',
    'Diakité',
  ],
};

// Country-specific phone prefixes
const phonePrefixes: Record<string, string> = {
  CI: '+225', // Cote d'Ivoire
  SN: '+221', // Senegal
  ML: '+223', // Mali
  BF: '+226', // Burkina Faso
};

interface TestUser {
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  kycStatus: string;
  role: string;
  balance: number;
}

interface TestTransaction {
  type: string;
  amount: number;
  currency: string;
  status: string;
  recipientPhone?: string;
}

interface TestBeneficiary {
  name: string;
  phoneE164: string;
  accountType: string;
  isFavorite: boolean;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(countryCode: string): string {
  const prefix = phonePrefixes[countryCode] || '+225';
  const number = Math.floor(Math.random() * 90000000 + 10000000);
  return `${prefix}${number}`;
}

function generateEmail(firstName: string, lastName: string): string {
  const domain = getRandomElement(['gmail.com', 'yahoo.fr', 'outlook.com']);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generateUsername(firstName: string, lastName: string): string {
  return `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Math.floor(Math.random() * 100)}`;
}

// Generate test users with various KYC tiers
function generateTestUsers(): TestUser[] {
  const users: TestUser[] = [];
  const kycStatuses = [
    'pending',
    'pending',
    'approved',
    'approved',
    'approved',
    'rejected',
  ];
  const countries = ['CI', 'SN', 'ML', 'BF'];

  // Generate 20 test users
  for (let i = 0; i < 20; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = getRandomElement(
      isMale
        ? westAfricanNames.firstNames.male
        : westAfricanNames.firstNames.female,
    );
    const lastName = getRandomElement(westAfricanNames.lastNames);
    const countryCode = getRandomElement(countries);

    users.push({
      phone: generatePhone(countryCode),
      username: generateUsername(firstName, lastName),
      firstName,
      lastName,
      email: generateEmail(firstName, lastName),
      countryCode,
      kycStatus: getRandomElement(kycStatuses),
      role: 'user',
      balance: Math.floor(Math.random() * 1000) + 10, // 10-1010 USDC
    });
  }

  // Add specific test users with known credentials
  users.push(
    {
      phone: '+22507000001',
      username: 'test_unverified',
      firstName: 'Test',
      lastName: 'Unverified',
      email: 'test.unverified@joonapay.com',
      countryCode: 'CI',
      kycStatus: 'pending',
      role: 'user',
      balance: 50,
    },
    {
      phone: '+22507000002',
      username: 'test_basic',
      firstName: 'Test',
      lastName: 'Basic',
      email: 'test.basic@joonapay.com',
      countryCode: 'CI',
      kycStatus: 'approved',
      role: 'user',
      balance: 500,
    },
    {
      phone: '+22507000003',
      username: 'test_verified',
      firstName: 'Test',
      lastName: 'Verified',
      email: 'test.verified@joonapay.com',
      countryCode: 'CI',
      kycStatus: 'approved',
      role: 'user',
      balance: 2000,
    },
    {
      phone: '+22507000004',
      username: 'test_premium',
      firstName: 'Test',
      lastName: 'Premium',
      email: 'test.premium@joonapay.com',
      countryCode: 'CI',
      kycStatus: 'approved',
      role: 'user',
      balance: 10000,
    },
    {
      phone: '+22507000005',
      username: 'test_rejected',
      firstName: 'Test',
      lastName: 'Rejected',
      email: 'test.rejected@joonapay.com',
      countryCode: 'CI',
      kycStatus: 'rejected',
      role: 'user',
      balance: 0,
    },
  );

  return users;
}

// Generate sample transactions for a user
function generateTransactions(_walletId: string): TestTransaction[] {
  const transactions: TestTransaction[] = [];
  const types = ['deposit', 'withdrawal', 'transfer_in', 'transfer_out'];
  const statuses = ['completed', 'completed', 'completed', 'pending', 'failed'];

  // Generate 5-15 transactions per user
  const count = Math.floor(Math.random() * 10) + 5;

  for (let i = 0; i < count; i++) {
    const type = getRandomElement(types);
    transactions.push({
      type,
      amount: Math.floor(Math.random() * 200) + 5, // 5-205 USDC
      currency: 'USDC',
      status: getRandomElement(statuses),
      recipientPhone: type === 'transfer_out' ? generatePhone('CI') : undefined,
    });
  }

  return transactions;
}

// Generate sample beneficiaries for a user
function generateBeneficiaries(): TestBeneficiary[] {
  const beneficiaries: TestBeneficiary[] = [];
  const count = Math.floor(Math.random() * 5) + 2; // 2-7 beneficiaries

  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = getRandomElement(
      isMale
        ? westAfricanNames.firstNames.male
        : westAfricanNames.firstNames.female,
    );
    const lastName = getRandomElement(westAfricanNames.lastNames);

    beneficiaries.push({
      name: `${firstName} ${lastName}`,
      phoneE164: generatePhone(getRandomElement(['CI', 'SN', 'ML'])),
      accountType: getRandomElement(['joonapay_user', 'mobile_money']),
      isFavorite: Math.random() > 0.7,
    });
  }

  return beneficiaries;
}

async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function seedDemoData(dataSource: DataSource): Promise<void> {
  // Safety check - only run in non-production environments
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    console.warn('SKIPPING demo data seed in production environment');
    return;
  }

  console.log('Seeding demo data (STAGING/DEV ONLY)...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Ensure schemas exist
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS auth`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS wallet`);

    const testUsers = generateTestUsers();
    const defaultPinHash = await hashPin('000000'); // Default test PIN

    for (const user of testUsers) {
      // Check if user already exists
      const existing = await queryRunner.query(
        `SELECT id FROM auth.users WHERE phone = $1`,
        [user.phone],
      );

      if (existing.length > 0) {
        console.log(`  Skipped (exists): ${user.username}`);
        continue;
      }

      const userId = uuidv4();
      const walletId = uuidv4();

      // Create user
      await queryRunner.query(
        `INSERT INTO auth.users (
          id, phone, phone_verified, username, first_name, last_name,
          email, country_code, kyc_status, role, status,
          pin_hash, pin_set_at, pin_attempts, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
        [
          userId,
          user.phone,
          true,
          user.username,
          user.firstName,
          user.lastName,
          user.email,
          user.countryCode,
          user.kycStatus,
          user.role,
          'active',
          defaultPinHash,
          new Date(),
          0,
        ],
      );

      // Create wallet
      await queryRunner.query(
        `INSERT INTO wallets (
          id, user_id, currency, balance, kyc_status, status, version,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          walletId,
          userId,
          'USDC',
          user.balance,
          user.kycStatus === 'approved' ? 'approved' : 'none',
          'active',
          1,
        ],
      );

      console.log(
        `  Created user: ${user.username} (${user.kycStatus}, ${user.balance} USDC)`,
      );

      // Generate and insert transactions
      const transactions = generateTransactions(walletId);
      for (const tx of transactions) {
        await queryRunner.query(
          `INSERT INTO transactions (
            id, wallet_id, type, amount, currency, status,
            recipient_phone, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')`,
          [
            uuidv4(),
            walletId,
            tx.type,
            tx.amount,
            tx.currency,
            tx.status,
            tx.recipientPhone || null,
          ],
        );
      }
      console.log(`    + ${transactions.length} transactions`);

      // Generate and insert beneficiaries (only for verified users)
      if (user.kycStatus === 'approved') {
        const beneficiaries = generateBeneficiaries();
        for (const ben of beneficiaries) {
          await queryRunner.query(
            `INSERT INTO wallet.beneficiaries (
              id, wallet_id, name, phone_e164, account_type,
              is_favorite, is_verified, transfer_count, total_transferred,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
            [
              uuidv4(),
              walletId,
              ben.name,
              ben.phoneE164,
              ben.accountType,
              ben.isFavorite,
              ben.accountType === 'joonapay_user',
              Math.floor(Math.random() * 10),
              Math.floor(Math.random() * 500),
            ],
          );
        }
        console.log(`    + ${beneficiaries.length} beneficiaries`);
      }
    }

    await queryRunner.commitTransaction();
    console.log(
      `Demo data seeded: ${testUsers.length} users with transactions and beneficiaries`,
    );
    console.log('\nTest accounts (all use PIN: 000000):');
    console.log('  +22507000001 - Unverified user');
    console.log('  +22507000002 - Basic KYC user');
    console.log('  +22507000003 - Verified user');
    console.log('  +22507000004 - Premium user');
    console.log('  +22507000005 - Rejected user');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Failed to seed demo data:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default seedDemoData;
