/**
 * Circle API Connection Test
 *
 * Tests the Circle API connection using the configured API key.
 * Run with: npx ts-node scripts/test-circle.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || '';
const CIRCLE_API_URL = process.env.CIRCLE_API_URL || 'https://api.circle.com';

interface CircleResponse<T> {
  data?: T;
  message?: string;
  code?: number;
}

async function testCircleConnection(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Circle API Connection Test');
  console.log('='.repeat(60));
  console.log('');
  console.log(`API URL: ${CIRCLE_API_URL}`);
  console.log(`API Key: ${CIRCLE_API_KEY.substring(0, 20)}...`);
  console.log('');

  if (!CIRCLE_API_KEY) {
    console.error('❌ CIRCLE_API_KEY is not set');
    process.exit(1);
  }

  // Test 1: Check API reachability (public endpoint)
  console.log('Test 1: API Reachability');
  console.log('-'.repeat(40));
  try {
    const pingResponse = await fetch(`${CIRCLE_API_URL}/ping`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    console.log(`  Status: ${pingResponse.status}`);
    console.log(`  ✅ API is reachable`);
  } catch (error) {
    console.log(`  ❌ API unreachable: ${error}`);
  }
  console.log('');

  // Test 2: Get configuration (authenticated)
  console.log('Test 2: Authentication Check (W3S Config)');
  console.log('-'.repeat(40));
  try {
    const configResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/config/entity`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const configData = await configResponse.json() as CircleResponse<unknown>;
    console.log(`  Status: ${configResponse.status}`);

    if (configResponse.ok) {
      console.log(`  ✅ Authentication successful`);
      console.log(`  Response: ${JSON.stringify(configData, null, 2).substring(0, 200)}...`);
    } else {
      console.log(`  ❌ Authentication failed`);
      console.log(`  Error: ${JSON.stringify(configData)}`);
    }
  } catch (error) {
    console.log(`  ❌ Request failed: ${error}`);
  }
  console.log('');

  // Test 3: List wallet sets
  console.log('Test 3: List Wallet Sets');
  console.log('-'.repeat(40));
  try {
    const walletSetsResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/walletSets`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const walletSetsData = await walletSetsResponse.json() as CircleResponse<{ walletSets?: unknown[] }>;
    console.log(`  Status: ${walletSetsResponse.status}`);

    if (walletSetsResponse.ok && walletSetsData.data) {
      const sets = walletSetsData.data.walletSets || [];
      console.log(`  ✅ Found ${sets.length} wallet set(s)`);
      if (sets.length > 0) {
        console.log(`  First wallet set: ${JSON.stringify(sets[0], null, 2).substring(0, 300)}`);
      }
    } else {
      console.log(`  Response: ${JSON.stringify(walletSetsData)}`);
    }
  } catch (error) {
    console.log(`  ❌ Request failed: ${error}`);
  }
  console.log('');

  // Test 4: Get public key (for entity secret encryption)
  console.log('Test 4: Get Public Key');
  console.log('-'.repeat(40));
  try {
    const publicKeyResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/config/entity/publicKey`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const publicKeyData = await publicKeyResponse.json() as CircleResponse<{ publicKey?: string }>;
    console.log(`  Status: ${publicKeyResponse.status}`);

    if (publicKeyResponse.ok && publicKeyData.data?.publicKey) {
      console.log(`  ✅ Public key retrieved`);
      console.log(`  Key (first 50 chars): ${publicKeyData.data.publicKey.substring(0, 50)}...`);
    } else {
      console.log(`  Response: ${JSON.stringify(publicKeyData)}`);
    }
  } catch (error) {
    console.log(`  ❌ Request failed: ${error}`);
  }
  console.log('');

  // Test 5: List wallets (if any exist)
  console.log('Test 5: List Wallets');
  console.log('-'.repeat(40));
  try {
    const walletsResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/wallets?pageSize=5`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const walletsData = await walletsResponse.json() as CircleResponse<{ wallets?: unknown[] }>;
    console.log(`  Status: ${walletsResponse.status}`);

    if (walletsResponse.ok && walletsData.data) {
      const wallets = walletsData.data.wallets || [];
      console.log(`  ✅ Found ${wallets.length} wallet(s)`);
      if (wallets.length > 0) {
        console.log(`  First wallet: ${JSON.stringify(wallets[0], null, 2).substring(0, 300)}`);
      }
    } else {
      console.log(`  Response: ${JSON.stringify(walletsData)}`);
    }
  } catch (error) {
    console.log(`  ❌ Request failed: ${error}`);
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

testCircleConnection().catch(console.error);
