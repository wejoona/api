/**
 * Circle SDK Entity Secret Setup
 *
 * Uses the official Circle SDK to generate and register entity secret.
 * Run with: npx ts-node scripts/circle-sdk-setup.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config();

async function setupEntitySecret(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Circle SDK Entity Secret Setup');
  console.log('='.repeat(60));
  console.log('');

  // Dynamic import for ESM module
  const circleSdk = await import('@circle-fin/developer-controlled-wallets');

  // Step 1: Generate entity secret
  console.log('Step 1: Generate Entity Secret');
  console.log('-'.repeat(40));

  // Note: TypeScript types for Circle SDK may be incorrect - generateEntitySecret returns string at runtime
  const entitySecret = circleSdk.generateEntitySecret() as unknown as string;
  console.log('✅ Generated entity secret (32-byte hex):');
  console.log(`   ${entitySecret}`);
  console.log('');
  console.log('⚠️  SAVE THIS SECURELY - Circle does not store it!');
  console.log('');

  // Step 2: Register with Circle
  console.log('Step 2: Register Entity Secret');
  console.log('-'.repeat(40));

  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    console.error('❌ CIRCLE_API_KEY not set in .env');
    process.exit(1);
  }

  try {
    const recoveryPath = path.join(__dirname, '../');

    const response = await circleSdk.registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
      recoveryFileDownloadPath: recoveryPath,
    });

    console.log('✅ Entity secret registered!');
    console.log('');
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('');
    console.log('Recovery file saved to:', recoveryPath);
  } catch (error) {
    console.error('❌ Registration failed:', error);

    // If registration fails, still provide the ciphertext for manual entry
    console.log('');
    console.log('Try manual registration in Circle Console.');
    console.log('');

    try {
      // Generate ciphertext manually using SDK
      const ciphertext = await circleSdk.generateEntitySecretCiphertext({
        apiKey,
        entitySecret,
      });

      console.log('Generated ciphertext for manual entry:');
      console.log(`Length: ${ciphertext.length} characters`);
      console.log('');
      console.log(ciphertext);
    } catch (cipherError) {
      console.error('Could not generate ciphertext:', cipherError);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Add to .env:');
  console.log('='.repeat(60));
  console.log('');
  console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
  console.log('');
}

setupEntitySecret().catch(console.error);
