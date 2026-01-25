/**
 * Circle Full Integration Test
 *
 * Tests wallet set creation, user creation, and wallet creation.
 * Run with: npx ts-node scripts/test-circle-full.ts
 */

import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
dotenv.config();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || '';
const CIRCLE_API_URL = process.env.CIRCLE_API_URL || 'https://api.circle.com';
const CIRCLE_ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET || '';

interface CircleResponse<T> {
  data?: T;
  message?: string;
  code?: number;
  errors?: Array<{ error: string; message: string; location: string }>;
}

async function testCircleFull(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Circle Full Integration Test');
  console.log('='.repeat(60));
  console.log('');
  console.log(`API URL: ${CIRCLE_API_URL}`);
  console.log(`API Key: ${CIRCLE_API_KEY.substring(0, 20)}...`);
  console.log(`Entity Secret: ${CIRCLE_ENTITY_SECRET ? 'SET' : 'NOT SET'}`);
  console.log('');

  if (!CIRCLE_API_KEY) {
    console.error('❌ CIRCLE_API_KEY is not set');
    process.exit(1);
  }

  // Test 1: Create a wallet set
  console.log('Test 1: Create Wallet Set');
  console.log('-'.repeat(40));

  const idempotencyKey = crypto.randomUUID();
  let walletSetId: string | null = null;

  try {
    const createWalletSetResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/developer/walletSets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
        'X-Entity-Secret': CIRCLE_ENTITY_SECRET,
      },
      body: JSON.stringify({
        idempotencyKey,
        name: 'JoonaPay Test Wallets',
      }),
    });

    const walletSetData = await createWalletSetResponse.json() as CircleResponse<{ walletSet: { id: string } }>;
    console.log(`  Status: ${createWalletSetResponse.status}`);

    if (createWalletSetResponse.ok && walletSetData.data?.walletSet) {
      walletSetId = walletSetData.data.walletSet.id;
      console.log(`  ✅ Wallet set created: ${walletSetId}`);
    } else {
      console.log(`  Response: ${JSON.stringify(walletSetData, null, 2)}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
  }
  console.log('');

  // Test 2: Create a user
  console.log('Test 2: Create User');
  console.log('-'.repeat(40));

  const userId = crypto.randomUUID();
  let userToken: string | null = null;

  try {
    const createUserResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({
        userId,
      }),
    });

    const userData = await createUserResponse.json() as CircleResponse<{ user: { id: string; status: string }; userToken?: string }>;
    console.log(`  Status: ${createUserResponse.status}`);

    if (createUserResponse.ok || createUserResponse.status === 201) {
      console.log(`  ✅ User created: ${userId}`);
      console.log(`  Response: ${JSON.stringify(userData, null, 2)}`);
    } else {
      console.log(`  Response: ${JSON.stringify(userData, null, 2)}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
  }
  console.log('');

  // Test 3: Get user token (for user-controlled wallets)
  console.log('Test 3: Get User Token');
  console.log('-'.repeat(40));

  try {
    const tokenResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/users/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({
        userId,
      }),
    });

    const tokenData = await tokenResponse.json() as CircleResponse<{ userToken: string; encryptionKey: string }>;
    console.log(`  Status: ${tokenResponse.status}`);

    if (tokenResponse.ok && tokenData.data?.userToken) {
      userToken = tokenData.data.userToken;
      console.log(`  ✅ User token retrieved`);
      console.log(`  Token (first 50 chars): ${userToken.substring(0, 50)}...`);
    } else {
      console.log(`  Response: ${JSON.stringify(tokenData, null, 2)}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error}`);
  }
  console.log('');

  // Test 4: Create developer-controlled wallet (if wallet set exists)
  if (walletSetId) {
    console.log('Test 4: Create Developer Wallet');
    console.log('-'.repeat(40));

    const walletIdempotencyKey = crypto.randomUUID();

    try {
      const createWalletResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/developer/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${CIRCLE_API_KEY}`,
          'X-Entity-Secret': CIRCLE_ENTITY_SECRET,
        },
        body: JSON.stringify({
          idempotencyKey: walletIdempotencyKey,
          walletSetId,
          blockchains: ['MATIC-AMOY'], // Polygon testnet
          count: 1,
          metadata: [
            { name: 'userId', refId: userId },
          ],
        }),
      });

      const walletData = await createWalletResponse.json() as CircleResponse<{ wallets: Array<{ id: string; address: string; blockchain: string }> }>;
      console.log(`  Status: ${createWalletResponse.status}`);

      if (createWalletResponse.ok && walletData.data?.wallets?.length) {
        const wallet = walletData.data.wallets[0];
        console.log(`  ✅ Wallet created`);
        console.log(`  Wallet ID: ${wallet.id}`);
        console.log(`  Address: ${wallet.address}`);
        console.log(`  Blockchain: ${wallet.blockchain}`);
      } else {
        console.log(`  Response: ${JSON.stringify(walletData, null, 2)}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error}`);
    }
  } else {
    console.log('Test 4: Skipped (no wallet set)');
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log('');
  console.log('Environment variables to update:');
  console.log('');
  if (walletSetId) {
    console.log(`CIRCLE_WALLET_SET_ID=${walletSetId}`);
  }
  console.log('');
  console.log('='.repeat(60));
}

testCircleFull().catch(console.error);
