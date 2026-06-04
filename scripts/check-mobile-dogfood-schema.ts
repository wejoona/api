import { Client } from 'pg';

type RequiredTable = {
  schema: string;
  table: string;
  columns: string[];
  indexes: string[][];
};

const requiredTables: RequiredTable[] = [
  {
    schema: 'auth',
    table: 'users',
    columns: [
      'id',
      'phone',
      'phone_hash',
      'country_code',
      'status',
      'created_at',
    ],
    indexes: [['phone'], ['phone_hash'], ['status']],
  },
  {
    schema: 'public',
    table: 'wallets',
    columns: ['id', 'user_id', 'currency', 'balance', 'status', 'created_at'],
    indexes: [['user_id']],
  },
  {
    schema: 'public',
    table: 'transactions',
    columns: ['id', 'wallet_id', 'type', 'status', 'amount', 'created_at'],
    indexes: [
      ['wallet_id'],
      ['status'],
      ['created_at'],
      ['wallet_id', 'created_at'],
    ],
  },
  {
    schema: 'auth',
    table: 'sessions',
    columns: [
      'id',
      'user_id',
      'device_id',
      'refresh_token_hash',
      'is_active',
      'expires_at',
      'created_at',
    ],
    indexes: [['user_id'], ['refresh_token_hash'], ['expires_at']],
  },
  {
    schema: 'auth',
    table: 'devices',
    columns: [
      'id',
      'user_id',
      'device_identifier',
      'platform',
      'fcm_token',
      'is_active',
      'public_key_jwk',
      'device_name',
      'metadata',
      'created_at',
    ],
    indexes: [['user_id'], ['fcm_token'], ['user_id', 'device_identifier']],
  },
  {
    schema: 'public',
    table: 'contacts',
    columns: [
      'id',
      'user_id',
      'contact_user_id',
      'name',
      'phone',
      'wallet_address',
      'created_at',
    ],
    indexes: [['user_id'], ['phone'], ['contact_user_id']],
  },
  {
    schema: 'public',
    table: 'notifications',
    columns: [
      'id',
      'user_id',
      'type',
      'status',
      'title',
      'body',
      'read_at',
      'created_at',
    ],
    indexes: [
      ['user_id'],
      ['type'],
      ['reference_id'],
      ['user_id', 'status', 'created_at'],
    ],
  },
  {
    schema: 'system',
    table: 'feature_subscriptions',
    columns: [
      'id',
      'user_id',
      'feature_key',
      'source',
      'status',
      'phone',
      'email',
      'metadata',
      'created_at',
    ],
    indexes: [['user_id'], ['feature_key'], ['source']],
  },
  {
    schema: 'public',
    table: 'audit_logs',
    columns: [
      'id',
      'user_id',
      'actor_id',
      'action',
      'resource_type',
      'resource_id',
      'created_at',
    ],
    indexes: [['user_id'], ['actor_id'], ['action'], ['created_at']],
  },
  {
    schema: 'public',
    table: 'batch_jobs',
    columns: [
      'id',
      'type',
      'status',
      'user_id',
      'organization_id',
      'payload',
      'metrics',
      'scheduled_at',
      'created_at',
      'created_by',
    ],
    indexes: [
      ['user_id'],
      ['user_id', 'status'],
      ['type', 'status'],
      ['scheduled_at'],
    ],
  },
];

const forbiddenColumns = [
  ['public', 'batch_jobs', 'userId'],
  ['public', 'batch_jobs', 'organizationId'],
  ['public', 'batch_jobs', 'scheduledAt'],
  ['public', 'batch_jobs', 'createdAt'],
  ['public', 'batch_jobs', 'createdBy'],
];

async function main(): Promise<void> {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'usdc_wallet',
  });

  await client.connect();
  const failures: string[] = [];

  try {
    for (const required of requiredTables) {
      const tableExists = await client.query(
        `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
        `,
        [required.schema, required.table],
      );

      if (tableExists.rowCount === 0) {
        failures.push(`missing table ${required.schema}.${required.table}`);
        continue;
      }

      const columnRows = await client.query<{ column_name: string }>(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        `,
        [required.schema, required.table],
      );
      const columns = new Set(columnRows.rows.map((row) => row.column_name));
      for (const column of required.columns) {
        if (!columns.has(column)) {
          failures.push(
            `missing column ${required.schema}.${required.table}.${column}`,
          );
        }
      }

      const indexRows = await client.query<{ columns: string[] | string }>(
        `
        SELECT array_agg(a.attname ORDER BY x.ordinality) AS columns
        FROM pg_class t
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_index ix ON ix.indrelid = t.oid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, ordinality) ON true
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.attnum
        WHERE n.nspname = $1 AND t.relname = $2
        GROUP BY i.relname
        `,
        [required.schema, required.table],
      );
      const indexKeys = new Set(
        indexRows.rows
          .filter((row) => row.columns)
          .map((row) => {
            if (Array.isArray(row.columns)) {
              return row.columns.join(',');
            }

            return row.columns.replace(/^{|}$/g, '').split(',').join(',');
          }),
      );

      for (const indexColumns of required.indexes) {
        if (!indexKeys.has(indexColumns.join(','))) {
          failures.push(
            `missing index on ${required.schema}.${required.table}(${indexColumns.join(', ')})`,
          );
        }
      }
    }

    for (const [schema, table, column] of forbiddenColumns) {
      const result = await client.query(
        `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
        `,
        [schema, table, column],
      );
      if (result.rowCount && result.rowCount > 0) {
        failures.push(
          `legacy camelCase column still present: ${schema}.${table}.${column}`,
        );
      }
    }
  } finally {
    await client.end();
  }

  if (failures.length > 0) {
    console.error('Mobile dogfood schema check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Mobile dogfood schema check passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
