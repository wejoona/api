/**
 * Generate Circle Entity Secret
 *
 * Generates and encrypts an entity secret using Circle's public key.
 * Run with: npx ts-node scripts/generate-entity-secret.ts
 */

import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
dotenv.config();

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || '';
const CIRCLE_API_URL = process.env.CIRCLE_API_URL || 'https://api.circle.com';

interface CircleResponse<T> {
  data?: T;
  message?: string;
}

async function generateEntitySecret(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Generate Circle Entity Secret');
  console.log('='.repeat(60));
  console.log('');

  if (!CIRCLE_API_KEY) {
    console.error('❌ CIRCLE_API_KEY is not set');
    process.exit(1);
  }

  // Step 1: Get Circle's public key
  console.log('Step 1: Fetching Circle Public Key');
  console.log('-'.repeat(40));

  let publicKeyPem: string;
  try {
    const response = await fetch(`${CIRCLE_API_URL}/v1/w3s/config/entity/publicKey`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
    });

    const data = await response.json() as CircleResponse<{ publicKey: string }>;

    if (!response.ok || !data.data?.publicKey) {
      console.error('  ❌ Failed to get public key');
      console.error('  Response:', JSON.stringify(data));
      process.exit(1);
    }

    publicKeyPem = data.data.publicKey;
    console.log('  ✅ Public key retrieved');
    console.log(`  Key preview: ${publicKeyPem.substring(0, 60)}...`);
  } catch (error) {
    console.error('  ❌ Error:', error);
    process.exit(1);
  }
  console.log('');

  // Step 2: Generate random 32-byte secret
  console.log('Step 2: Generating Entity Secret');
  console.log('-'.repeat(40));

  const entitySecretRaw = crypto.randomBytes(32);
  const entitySecretHex = entitySecretRaw.toString('hex');
  console.log('  ✅ Generated 32-byte random secret');
  console.log(`  Raw hex (SAVE THIS SECURELY): ${entitySecretHex}`);
  console.log('');

  // Step 3: Encrypt with RSA-OAEP
  console.log('Step 3: Encrypting Entity Secret');
  console.log('-'.repeat(40));

  try {
    const encryptedBuffer = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      entitySecretRaw
    );

    const entitySecretCiphertext = encryptedBuffer.toString('base64');
    console.log('  ✅ Entity secret encrypted');
    console.log(`  Ciphertext (first 50 chars): ${entitySecretCiphertext.substring(0, 50)}...`);
    console.log('');

    // Step 4: Verify by registering with Circle
    console.log('Step 4: Registering Entity Secret with Circle');
    console.log('-'.repeat(40));

    const registerResponse = await fetch(`${CIRCLE_API_URL}/v1/w3s/config/entity/entitySecret`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
      },
      body: JSON.stringify({
        entitySecretCiphertext,
      }),
    });

    if (registerResponse.ok || registerResponse.status === 200 || registerResponse.status === 204) {
      console.log('  ✅ Entity secret registered with Circle');
    } else {
      const errorData = await registerResponse.json();
      console.log(`  Status: ${registerResponse.status}`);
      console.log(`  Response: ${JSON.stringify(errorData)}`);
    }
    console.log('');

    // Step 5: Output for .env
    console.log('Step 5: Environment Variables');
    console.log('-'.repeat(40));
    console.log('');
    console.log('Add this to your .env file:');
    console.log('');
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecretCiphertext}`);
    console.log('');
    console.log('IMPORTANT: Also save the raw hex secret securely:');
    console.log(`RAW_ENTITY_SECRET=${entitySecretHex}`);
    console.log('');

  } catch (error) {
    console.error('  ❌ Encryption failed:', error);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Entity Secret Generation Complete');
  console.log('='.repeat(60));
}

generateEntitySecret().catch(console.error);
