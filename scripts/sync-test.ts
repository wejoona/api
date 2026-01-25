/**
 * JoonaPay System Sync Test
 *
 * Verifies synchronization between:
 * - PostgreSQL (main database)
 * - Blnk (ledger)
 * - Circle (blockchain wallets)
 * - Redis (cache)
 *
 * Run with: npx ts-node scripts/sync-test.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

const BLNK_URL = process.env.BLNK_URL || 'http://localhost:5001';
const CIRCLE_API_URL = process.env.CIRCLE_API_URL || 'https://api.circle.com';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || '';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || '6380';

interface SystemStatus {
  name: string;
  status: 'ok' | 'error' | 'warning';
  details: Record<string, unknown>;
}

async function checkPostgres(): Promise<SystemStatus> {
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

    const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
    const walletsResult = await client.query('SELECT COUNT(*) as count FROM wallets');
    const txResult = await client.query('SELECT COUNT(*) as count FROM transactions');

    await client.end();

    return {
      name: 'PostgreSQL',
      status: 'ok',
      details: {
        users: parseInt(usersResult.rows[0].count),
        wallets: parseInt(walletsResult.rows[0].count),
        transactions: parseInt(txResult.rows[0].count),
      },
    };
  } catch (error) {
    return {
      name: 'PostgreSQL',
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

async function checkBlnk(): Promise<SystemStatus> {
  try {
    // Get ledgers
    const ledgersResponse = await fetch(`${BLNK_URL}/ledgers`);
    const ledgersText = await ledgersResponse.text();
    const ledgers = ledgersText && ledgersText !== 'null' ? JSON.parse(ledgersText) : [];

    // Get balances (search endpoint)
    const balancesResponse = await fetch(`${BLNK_URL}/search/balances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '*' }),
    });
    let balanceCount = 0;
    if (balancesResponse.ok) {
      const balancesText = await balancesResponse.text();
      if (balancesText && balancesText !== 'null') {
        const balancesData = JSON.parse(balancesText);
        // Search endpoint returns { found: number, hits: [...] }
        balanceCount = balancesData?.found || (Array.isArray(balancesData) ? balancesData.length : 0);
      }
    }

    // Get transactions (search endpoint)
    const txResponse = await fetch(`${BLNK_URL}/search/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: '*' }),
    });
    let txCount = 0;
    if (txResponse.ok) {
      const txText = await txResponse.text();
      if (txText && txText !== 'null') {
        const txData = JSON.parse(txText);
        // Search endpoint returns { found: number, hits: [...] }
        txCount = txData?.found || (Array.isArray(txData) ? txData.length : 0);
      }
    }

    // Count unique ledgers by name
    const uniqueLedgers = Array.isArray(ledgers)
      ? [...new Set(ledgers.map((l: { name: string }) => l.name))]
      : [];

    return {
      name: 'Blnk Ledger',
      status: 'ok',
      details: {
        ledgers: uniqueLedgers.length,
        ledgerNames: uniqueLedgers,
        balances: balanceCount,
        transactions: txCount,
      },
    };
  } catch (error) {
    return {
      name: 'Blnk Ledger',
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

async function checkCircle(): Promise<SystemStatus> {
  try {
    // Check wallet sets
    const walletSetsResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/walletSets`, {
      headers: {
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    const walletSetsData = await walletSetsResponse.json() as { data?: { walletSets?: unknown[] } };

    // Check wallets
    const walletsResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/wallets`, {
      headers: {
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    const walletsData = await walletsResponse.json() as { data?: { wallets?: Array<{ id: string; address: string; blockchain: string; state: string }> } };

    // Check users
    const usersResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/users`, {
      headers: {
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    const usersData = await usersResponse.json() as { data?: { users?: unknown[] } };

    return {
      name: 'Circle',
      status: 'ok',
      details: {
        walletSets: walletSetsData.data?.walletSets?.length || 0,
        wallets: walletsData.data?.wallets?.length || 0,
        users: usersData.data?.users?.length || 0,
        sampleWallet: walletsData.data?.wallets?.[0] ? {
          address: walletsData.data.wallets[0].address,
          blockchain: walletsData.data.wallets[0].blockchain,
          state: walletsData.data.wallets[0].state,
        } : null,
      },
    };
  } catch (error) {
    return {
      name: 'Circle',
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

async function checkRedis(): Promise<SystemStatus> {
  try {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis({
      host: REDIS_HOST,
      port: parseInt(REDIS_PORT),
    });

    const ping = await redis.ping();
    const keys = await redis.keys('*');
    const info = await redis.info('memory');

    const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || 'unknown';

    await redis.quit();

    return {
      name: 'Redis',
      status: ping === 'PONG' ? 'ok' : 'error',
      details: {
        ping,
        cachedKeys: keys.length,
        usedMemory,
        sampleKeys: keys.slice(0, 5),
      },
    };
  } catch (error) {
    return {
      name: 'Redis',
      status: 'error',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

async function runSyncTest(): Promise<void> {
  console.log('='.repeat(70));
  console.log('JoonaPay System Sync Test');
  console.log('='.repeat(70));
  console.log('');

  const results: SystemStatus[] = [];

  // Check all systems
  console.log('Checking systems...\n');

  const postgres = await checkPostgres();
  results.push(postgres);
  console.log(`${postgres.status === 'ok' ? '✅' : '❌'} PostgreSQL`);

  const blnk = await checkBlnk();
  results.push(blnk);
  console.log(`${blnk.status === 'ok' ? '✅' : '❌'} Blnk Ledger`);

  const circle = await checkCircle();
  results.push(circle);
  console.log(`${circle.status === 'ok' ? '✅' : '❌'} Circle`);

  const redis = await checkRedis();
  results.push(redis);
  console.log(`${redis.status === 'ok' ? '✅' : '❌'} Redis`);

  console.log('');
  console.log('-'.repeat(70));
  console.log('');

  // Detailed report
  for (const result of results) {
    console.log(`${result.name}:`);
    console.log(`  Status: ${result.status.toUpperCase()}`);
    for (const [key, value] of Object.entries(result.details)) {
      if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    console.log('');
  }

  // Sync check
  console.log('-'.repeat(70));
  console.log('Sync Status:');
  console.log('-'.repeat(70));

  const pgUsers = (postgres.details.users as number) || 0;
  const pgWallets = (postgres.details.wallets as number) || 0;
  const blnkBalances = (blnk.details.balances as number) || 0;
  const circleWallets = (circle.details.wallets as number) || 0;

  console.log(`  PostgreSQL Users:    ${pgUsers}`);
  console.log(`  PostgreSQL Wallets:  ${pgWallets}`);
  console.log(`  Blnk Balances:       ${blnkBalances}`);
  console.log(`  Circle Wallets:      ${circleWallets}`);
  console.log('');

  // Check if counts match (allowing for system accounts in Blnk)
  const inSync = pgWallets === 0 || (pgWallets <= blnkBalances && pgWallets <= circleWallets + 1);

  if (pgUsers === 0 && pgWallets === 0) {
    console.log('⚠️  No users/wallets in database yet - fresh install');
    console.log('   Systems are ready for first user registration');
  } else if (inSync) {
    console.log('✅ Systems appear to be in sync');
  } else {
    console.log('❌ Potential sync issue detected');
    console.log('   Review counts above for discrepancies');
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('Test Complete');
  console.log('='.repeat(70));
}

runSyncTest().catch(console.error);
