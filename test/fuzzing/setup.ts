import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ensureDatabaseSchemas } from '../e2e/database-schemas';
import { setupNock, teardownNock } from '../e2e/helpers/mock-providers.helper';

interface SharedInfraInfo {
  runId: string;
  host: string;
  postgresPort: number;
  redisPort: number;
}

const infraFile = resolve(__dirname, '../.tmp/e2e-infra.json');
const schemaReadyFile = resolve(__dirname, '../.tmp/fuzz-schema-ready');
let currentRunId: string | null = null;

process.env.CIRCLE_API_URL =
  process.env.CIRCLE_API_URL || 'http://localhost:3999/circle';
process.env.YELLOWCARD_API_URL =
  process.env.YELLOWCARD_API_URL || 'http://localhost:3999/yellowcard';
process.env.BLNK_API_URL =
  process.env.BLNK_API_URL || 'http://localhost:3999/blnk';

if (existsSync(infraFile)) {
  const infra = JSON.parse(readFileSync(infraFile, 'utf8')) as SharedInfraInfo;
  currentRunId = infra.runId;

  process.env.E2E_SHARED_INFRA = 'true';
  process.env.E2E_INFRA_FILE = infraFile;
  process.env.DATABASE_HOST = infra.host;
  process.env.DATABASE_PORT = String(infra.postgresPort);
  process.env.DATABASE_NAME = 'test_db';
  process.env.DATABASE_USER = 'test_user';
  process.env.DATABASE_PASSWORD = 'test_password';
  process.env.DATABASE_SYNCHRONIZE = 'true';
  process.env.DATABASE_LOGGING = 'false';
  process.env.REDIS_HOST = infra.host;
  process.env.REDIS_PORT = String(infra.redisPort);
  process.env.REDIS_DB = '0';
}

beforeAll(async () => {
  setupNock();

  if (
    currentRunId &&
    existsSync(schemaReadyFile) &&
    readFileSync(schemaReadyFile, 'utf8') === currentRunId
  ) {
    return;
  }

  await ensureDatabaseSchemas();

  if (currentRunId) {
    writeFileSync(schemaReadyFile, currentRunId);
  }
});

afterAll(() => {
  teardownNock();
});
