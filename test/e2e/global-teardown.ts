import { execFileSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

interface InfraInfo {
  postgresContainer: string;
  redisContainer: string;
}

const INFRA_FILE = resolve(__dirname, '../.tmp/e2e-infra.json');
const SCHEMA_READY_FILE = resolve(__dirname, '../.tmp/e2e-schema-ready');
const FUZZ_SCHEMA_READY_FILE = resolve(__dirname, '../.tmp/fuzz-schema-ready');

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(INFRA_FILE)) {
    return;
  }

  const infra = JSON.parse(readFileSync(INFRA_FILE, 'utf8')) as InfraInfo;
  const containers = [infra.postgresContainer, infra.redisContainer].filter(Boolean);

  if (containers.length > 0) {
    try {
      execFileSync('docker', ['rm', '-f', ...containers], {
        stdio: ['ignore', 'ignore', 'ignore'],
      });
    } catch {
      // The test process may already have cleaned these up.
    }
  }

  try {
    unlinkSync(INFRA_FILE);
  } catch {
    // Nothing else to do.
  }

  try {
    unlinkSync(SCHEMA_READY_FILE);
  } catch {
    // Nothing else to do.
  }

  try {
    unlinkSync(FUZZ_SCHEMA_READY_FILE);
  } catch {
    // Nothing else to do.
  }
}
