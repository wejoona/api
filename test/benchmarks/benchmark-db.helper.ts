import { Client } from 'pg';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

interface BenchmarkDbConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export function getBenchmarkDbConfig(): BenchmarkDbConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'joonapay_test',
  };
}

export async function ensureBenchmarkDatabase(): Promise<void> {
  const config = getBenchmarkDbConfig();
  assertSafeDatabaseName(config.database);

  const adminClient = new Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    const result = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [config.database],
    );
    if (result.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE "${config.database}"`);
    }
  } finally {
    await adminClient.end();
  }

  const targetClient = new Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
  });

  await targetClient.connect();
  try {
    await targetClient.query('CREATE SCHEMA IF NOT EXISTS auth');
  } finally {
    await targetClient.end();
  }
}

export async function deleteAll<T extends ObjectLiteral>(
  dataSource: DataSource,
  entity: EntityTarget<T>,
): Promise<void> {
  await dataSource.createQueryBuilder().delete().from(entity).execute();
}

export function testUserId(index: number): string {
  return `00000000-0000-4000-8000-${toUuidTail(index)}`;
}

export function testWalletId(index: number): string {
  return `00000000-0000-4000-8001-${toUuidTail(index)}`;
}

export function testTransactionId(index: number): string {
  return `00000000-0000-4000-8002-${toUuidTail(index)}`;
}

function toUuidTail(index: number): string {
  return index.toString(16).padStart(12, '0');
}

function assertSafeDatabaseName(database: string): void {
  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error(`Unsafe benchmark database name: ${database}`);
  }
}
