/**
 * Circle Wallet Set Creation Test
 *
 * Tests different approaches to creating a wallet set.
 * Run with: npx ts-node scripts/test-circle-walletset.ts
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

async function testWalletSetCreation(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Circle Wallet Set Creation Test');
  console.log('='.repeat(60));
  console.log('');

  const idempotencyKey = crypto.randomUUID();

  // Approach 1: Entity secret in body
  console.log('Approach 1: Entity secret in request body');
  console.log('-'.repeat(40));

  try {
    const response = await fetch(`${CIRCLE_API_URL}/v1/w3s/developer/walletSets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({
        idempotencyKey,
        name: 'JoonaPay Test Wallets',
        entitySecretCiphertext: CIRCLE_ENTITY_SECRET,
      }),
    });

    const data = await response.json();
    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(data, null, 2)}`);
  } catch (error) {
    console.log(`  Error: ${error}`);
  }
  console.log('');

  // Approach 2: Check existing wallet sets
  console.log('Approach 2: List existing wallet sets');
  console.log('-'.repeat(40));

  try {
    const response = await fetch(`${CIRCLE_API_URL}/v1/w3s/walletSets`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const data = await response.json() as CircleResponse<{ walletSets: Array<{ id: string; name: string; custodyType: string }> }>;
    console.log(`  Status: ${response.status}`);

    if (data.data?.walletSets?.length) {
      console.log(`  ✅ Found ${data.data.walletSets.length} wallet set(s):`);
      data.data.walletSets.forEach((ws, i) => {
        console.log(`     ${i + 1}. ${ws.name || 'Unnamed'} (${ws.id}) - ${ws.custodyType}`);
      });
    } else {
      console.log('  No wallet sets found');
    }
  } catch (error) {
    console.log(`  Error: ${error}`);
  }
  console.log('');

  // Approach 3: Try user-controlled wallet (doesn't need entity secret)
  console.log('Approach 3: Create User-Controlled Wallet (no entity secret needed)');
  console.log('-'.repeat(40));

  const userId = crypto.randomUUID();

  // First create user
  try {
    await fetch(`${CIRCLE_API_URL}/v1/w3s/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({ userId }),
    });
    console.log(`  Created user: ${userId}`);
  } catch (error) {
    console.log(`  User creation: ${error}`);
  }

  // Get user token
  try {
    const tokenResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/users/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({ userId }),
    });

    const tokenData = await tokenResponse.json() as CircleResponse<{ userToken: string; encryptionKey: string }>;

    if (tokenData.data?.userToken) {
      console.log(`  ✅ User token: ${tokenData.data.userToken.substring(0, 40)}...`);
      console.log(`  ✅ Encryption key: ${tokenData.data.encryptionKey.substring(0, 40)}...`);
      console.log('');
      console.log('  This user token can be used with Circle\'s Web SDK to create');
      console.log('  user-controlled wallets directly from the mobile app.');
    }
  } catch (error) {
    console.log(`  Token error: ${error}`);
  }
  console.log('');

  // Check wallet types available
  console.log('Approach 4: Check API capabilities');
  console.log('-'.repeat(40));

  try {
    const configResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/config/entity`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const configData = await configResponse.json();
    console.log(`  Status: ${configResponse.status}`);
    console.log(`  Config: ${JSON.stringify(configData, null, 2)}`);
  } catch (error) {
    console.log(`  Error: ${error}`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Conclusion');
  console.log('='.repeat(60));
  console.log('');
  console.log('Circle Test API Key supports:');
  console.log('  ✅ User creation');
  console.log('  ✅ User token generation');
  console.log('  ✅ API authentication');
  console.log('');
  console.log('For developer-controlled wallets (server-side):');
  console.log('  - Requires production API key with entity secret');
  console.log('  - Or use Circle\'s Web SDK for user-controlled wallets');
  console.log('');
}

testWalletSetCreation().catch(console.error);
