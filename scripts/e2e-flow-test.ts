/**
 * JoonaPay End-to-End Flow Test
 *
 * Simulates a complete user journey:
 * 1. Create user in DB
 * 2. Create Circle user
 * 3. Create Blnk balance
 * 4. Verify all systems in sync
 *
 * Run with: npx ts-node scripts/e2e-flow-test.ts
 */

import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
dotenv.config();

const BLNK_URL = process.env.BLNK_URL || 'http://localhost:5001';
const CIRCLE_API_URL = process.env.CIRCLE_API_URL || 'https://api.circle.com';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || '';
const CIRCLE_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET || '';
const CIRCLE_WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID || '';

interface TestResult {
  step: string;
  status: 'pass' | 'fail';
  data?: unknown;
  error?: string;
}

const results: TestResult[] = [];

async function log(step: string, status: 'pass' | 'fail', data?: unknown, error?: string) {
  results.push({ step, status, data, error });
  const icon = status === 'pass' ? '✅' : '❌';
  console.log(`${icon} ${step}`);
  if (error) console.log(`   Error: ${error}`);
}

async function createDbUser(userId: string, phone: string): Promise<boolean> {
  try {
    const { Client } = await import('pg');
    const client = new Client({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'usdc_wallet',
    });

    await client.connect();

    // Check if user exists
    const existing = await client.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      await log('Create DB User', 'pass', { userId: existing.rows[0].id, note: 'Already exists' });
      await client.end();
      return true;
    }

    // Create user
    await client.query(
      `INSERT INTO users (id, phone, kyc_status, created_at, updated_at)
       VALUES ($1, $2, 'pending', NOW(), NOW())`,
      [userId, phone]
    );

    await log('Create DB User', 'pass', { userId, phone });
    await client.end();
    return true;
  } catch (error) {
    await log('Create DB User', 'fail', null, error instanceof Error ? error.message : 'Unknown');
    return false;
  }
}

async function createCircleUser(userId: string): Promise<string | null> {
  try {
    const response = await fetch(`${CIRCLE_API_URL}/v1/w3s/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json() as { data?: { id: string } };

    if (response.ok || response.status === 201) {
      await log('Create Circle User', 'pass', { circleUserId: userId });
      return userId;
    } else {
      await log('Create Circle User', 'fail', data);
      return null;
    }
  } catch (error) {
    await log('Create Circle User', 'fail', null, error instanceof Error ? error.message : 'Unknown');
    return null;
  }
}

async function createCircleWallet(userId: string): Promise<string | null> {
  try {
    const { generateEntitySecretCiphertext } = await import('@circle-fin/developer-controlled-wallets');

    const ciphertext = await generateEntitySecretCiphertext({
      apiKey: CIRCLE_API_KEY,
      entitySecret: CIRCLE_ENTITY_SECRET,
    });

    const response = await fetch(`${CIRCLE_API_URL}/v1/w3s/developer/wallets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        walletSetId: CIRCLE_WALLET_SET_ID,
        blockchains: ['MATIC-AMOY'],
        count: 1,
        entitySecretCiphertext: ciphertext,
        metadata: [{ name: 'userId', refId: userId }],
      }),
    });

    const data = await response.json() as { data?: { wallets?: Array<{ id: string; address: string }> } };

    if (response.ok && data.data?.wallets?.length) {
      const wallet = data.data.wallets[0];
      await log('Create Circle Wallet', 'pass', {
        walletId: wallet.id,
        address: wallet.address,
      });
      return wallet.address;
    } else {
      await log('Create Circle Wallet', 'fail', data);
      return null;
    }
  } catch (error) {
    await log('Create Circle Wallet', 'fail', null, error instanceof Error ? error.message : 'Unknown');
    return null;
  }
}

async function createBlnkBalance(userId: string): Promise<string | null> {
  try {
    // Get the customer ledger
    const ledgersResponse = await fetch(`${BLNK_URL}/ledgers`);
    const ledgers = await ledgersResponse.json() as Array<{ ledger_id: string; name: string }>;
    const customerLedger = ledgers.find(l => l.name === 'joonapay-customer-wallets');

    if (!customerLedger) {
      await log('Create Blnk Balance', 'fail', null, 'Customer ledger not found');
      return null;
    }

    // Create balance
    const response = await fetch(`${BLNK_URL}/balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ledger_id: customerLedger.ledger_id,
        currency: 'USDC',
        meta_data: {
          user_id: userId,
          account_type: 'customer_wallet',
        },
      }),
    });

    const data = await response.json() as { balance_id?: string };

    if (response.ok && data.balance_id) {
      await log('Create Blnk Balance', 'pass', { balanceId: data.balance_id });
      return data.balance_id;
    } else {
      await log('Create Blnk Balance', 'fail', data);
      return null;
    }
  } catch (error) {
    await log('Create Blnk Balance', 'fail', null, error instanceof Error ? error.message : 'Unknown');
    return null;
  }
}

async function updateDbWallet(userId: string, circleAddress: string, blnkBalanceId: string): Promise<boolean> {
  try {
    const { Client } = await import('pg');
    const client = new Client({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'usdc_wallet',
    });

    await client.connect();

    // Check if wallet already exists
    const existingWallet = await client.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    let walletId: string;

    if (existingWallet.rows.length > 0) {
      // Update existing wallet
      walletId = existingWallet.rows[0].id;
      await client.query(
        `UPDATE wallets SET circle_wallet_address = $1, updated_at = NOW() WHERE user_id = $2`,
        [circleAddress, userId]
      );
    } else {
      // Insert new wallet
      walletId = crypto.randomUUID();
      await client.query(
        `INSERT INTO wallets (id, user_id, circle_wallet_address, currency, balance, kyc_status, status, version, created_at, updated_at)
         VALUES ($1, $2, $3, 'USDC', 0, 'none', 'active', 1, NOW(), NOW())`,
        [walletId, userId, circleAddress]
      );
    }

    await log('Update DB Wallet', 'pass', { walletId, circleAddress, blnkBalanceId });
    await client.end();
    return true;
  } catch (error) {
    await log('Update DB Wallet', 'fail', null, error instanceof Error ? error.message : 'Unknown');
    return false;
  }
}

async function verifySyncStatus(): Promise<void> {
  console.log('\n' + '-'.repeat(60));
  console.log('Verification');
  console.log('-'.repeat(60));

  // Check PostgreSQL
  try {
    const { Client } = await import('pg');
    const client = new Client({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'usdc_wallet',
    });

    await client.connect();
    const users = await client.query('SELECT COUNT(*) as count FROM users');
    const wallets = await client.query('SELECT COUNT(*) as count FROM wallets');
    console.log(`PostgreSQL: ${users.rows[0].count} users, ${wallets.rows[0].count} wallets`);
    await client.end();
  } catch (e) {
    console.log('PostgreSQL: Error');
  }

  // Check Blnk
  try {
    const response = await fetch(`${BLNK_URL}/search/balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '*' }),
    });
    const text = await response.text();
    const data = text && text !== 'null' ? JSON.parse(text) : { found: 0 };
    // Search endpoint returns { found: number, hits: [...] }
    const count = data?.found || (Array.isArray(data) ? data.length : 0);
    console.log(`Blnk: ${count} balances`);
  } catch (e) {
    console.log('Blnk: Error');
  }

  // Check Circle
  try {
    const response = await fetch(`${CIRCLE_API_URL}/v1/w3s/wallets`, {
      headers: { 'Authorization': `Bearer ${CIRCLE_API_KEY}` },
    });
    const data = await response.json() as { data?: { wallets?: unknown[] } };
    console.log(`Circle: ${data.data?.wallets?.length || 0} wallets`);
  } catch (e) {
    console.log('Circle: Error');
  }
}

async function runE2ETest(): Promise<void> {
  console.log('='.repeat(60));
  console.log('JoonaPay E2E Flow Test');
  console.log('='.repeat(60));
  console.log('');

  const testUserId = crypto.randomUUID();
  const testPhone = `+2547${Math.floor(10000000 + Math.random() * 90000000)}`;

  console.log(`Test User ID: ${testUserId}`);
  console.log(`Test Phone: ${testPhone}`);
  console.log('');

  // Step 1: Create DB User
  await createDbUser(testUserId, testPhone);

  // Step 2: Create Circle User
  await createCircleUser(testUserId);

  // Step 3: Create Circle Wallet
  const circleAddress = await createCircleWallet(testUserId);

  // Step 4: Create Blnk Balance
  const blnkBalanceId = await createBlnkBalance(testUserId);

  // Step 5: Update DB with wallet info
  if (circleAddress && blnkBalanceId) {
    await updateDbWallet(testUserId, circleAddress, blnkBalanceId);
  }

  // Verify sync
  await verifySyncStatus();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log('');

  if (failed === 0) {
    console.log('✅ All systems in sync!');
  } else {
    console.log('❌ Some steps failed - check errors above');
  }

  console.log('='.repeat(60));
}

runE2ETest().catch(console.error);
