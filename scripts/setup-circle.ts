/**
 * Circle Setup Script
 *
 * Creates a wallet set and entity secret for Circle integration.
 * Run with: npx ts-node scripts/setup-circle.ts
 */

import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
dotenv.config();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || '';
const CIRCLE_API_URL = process.env.CIRCLE_API_URL || 'https://api.circle.com';

interface CircleResponse<T> {
  data?: T;
  message?: string;
  code?: number;
}

interface WalletSet {
  id: string;
  custodyType: string;
  name?: string;
  updateDate: string;
  createDate: string;
}

async function setupCircle(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Circle Setup');
  console.log('='.repeat(60));
  console.log('');

  if (!CIRCLE_API_KEY) {
    console.error('❌ CIRCLE_API_KEY is not set');
    process.exit(1);
  }

  // Step 1: Get or Create Wallet Set
  console.log('Step 1: Get or Create Wallet Set');
  console.log('-'.repeat(40));

  let walletSetId: string | null = null;

  // First, check if we already have a wallet set
  try {
    const listResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/walletSets`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const listData = await listResponse.json() as CircleResponse<{ walletSets: WalletSet[] }>;

    if (listResponse.ok && listData.data?.walletSets?.length > 0) {
      walletSetId = listData.data.walletSets[0].id;
      console.log(`  ✅ Found existing wallet set: ${walletSetId}`);
    }
  } catch (error) {
    console.log(`  Error listing wallet sets: ${error}`);
  }

  // Create wallet set if none exists
  if (!walletSetId) {
    try {
      const idempotencyKey = crypto.randomUUID();
      const createResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/developer/walletSets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${CIRCLE_API_KEY}`,
          'X-Request-Id': idempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey,
          name: 'JoonaPay Production Wallets',
        }),
      });

      const createData = await createResponse.json() as CircleResponse<{ walletSet: WalletSet }>;
      console.log(`  Create status: ${createResponse.status}`);

      if (createResponse.ok && createData.data?.walletSet) {
        walletSetId = createData.data.walletSet.id;
        console.log(`  ✅ Created wallet set: ${walletSetId}`);
      } else {
        console.log(`  Response: ${JSON.stringify(createData)}`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to create wallet set: ${error}`);
    }
  }
  console.log('');

  // Step 2: Generate Entity Secret
  console.log('Step 2: Entity Secret');
  console.log('-'.repeat(40));

  // Get the public key for encrypting the entity secret
  try {
    const publicKeyResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/config/entity/publicKey`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const publicKeyData = await publicKeyResponse.json() as CircleResponse<{ publicKey: string }>;

    if (publicKeyResponse.ok && publicKeyData.data?.publicKey) {
      console.log('  ✅ Public key retrieved for entity secret encryption');
      console.log('');
      console.log('  To generate an entity secret:');
      console.log('  1. Generate a 32-byte random hex string:');
      console.log(`     ${crypto.randomBytes(32).toString('hex')}`);
      console.log('');
      console.log('  2. Encrypt it with the Circle public key using:');
      console.log('     - RSA-OAEP with SHA-256');
      console.log('     - Base64 encode the result');
      console.log('');
      console.log('  Or use Circle\'s SDK to generate it automatically.');
    }
  } catch (error) {
    console.log(`  ❌ Failed to get public key: ${error}`);
  }
  console.log('');

  // Step 3: Summary
  console.log('Step 3: Environment Variables to Set');
  console.log('-'.repeat(40));
  console.log('');
  console.log('Add these to your .env file:');
  console.log('');
  if (walletSetId) {
    console.log(`CIRCLE_WALLET_SET_ID=${walletSetId}`);
  }
  console.log('CIRCLE_ENTITY_SECRET=<encrypted-entity-secret>');
  console.log('');

  // Step 4: Test creating a user (developer controlled wallet)
  if (walletSetId) {
    console.log('Step 4: Test User Creation');
    console.log('-'.repeat(40));

    try {
      const userId = crypto.randomUUID();
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

      const userData = await createUserResponse.json() as CircleResponse<{ user: { id: string; status: string } }>;
      console.log(`  Status: ${createUserResponse.status}`);

      if (createUserResponse.ok || createUserResponse.status === 201) {
        console.log(`  ✅ Test user created`);
        console.log(`  User ID: ${userId}`);
        console.log(`  Response: ${JSON.stringify(userData)}`);
      } else {
        console.log(`  Response: ${JSON.stringify(userData)}`);
      }
    } catch (error) {
      console.log(`  ❌ Failed to create test user: ${error}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Setup Complete');
  console.log('='.repeat(60));
}

setupCircle().catch(console.error);
