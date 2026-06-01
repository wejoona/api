import { Client } from 'pg';

const REQUIRED_SCHEMAS = [
  'auth',
  'wallet',
  'merchant',
  'payments',
  'compliance',
  'notifications',
  'referral',
  'social',
  'system',
];

export async function ensureDatabaseSchemas(): Promise<void> {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    database: process.env.DATABASE_NAME || 'usdc_wallet',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  });

  await client.connect();

  try {
    if (process.env.E2E_SHARED_INFRA === 'true') {
      await resetSchemas(client);
    }

    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    for (const schema of REQUIRED_SCHEMAS) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }
  } finally {
    await client.end();
  }
}

async function resetSchemas(client: Client): Promise<void> {
  await client.query('DROP SCHEMA IF EXISTS public CASCADE');
  await client.query('CREATE SCHEMA public');
  await client.query('GRANT ALL ON SCHEMA public TO public');

  for (const schema of REQUIRED_SCHEMAS) {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }
}
