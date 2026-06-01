import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

interface InfraInfo {
  runId: string;
  infraFile: string;
  host: string;
  postgresContainer: string;
  redisContainer: string;
  postgresPort: number;
  redisPort: number;
}

const INFRA_FILE = resolve(__dirname, '../.tmp/e2e-infra.json');

export default async function globalSetup(): Promise<void> {
  const runId = `${Date.now()}-${process.pid}`;
  const postgresContainer = `usdc-wallet-e2e-postgres-${runId}`;
  const redisContainer = `usdc-wallet-e2e-redis-${runId}`;

  cleanupPreviousRun();

  runDocker([
    'run',
    '-d',
    '--label',
    'com.joonapay.usdc-wallet-e2e=true',
    '--name',
    postgresContainer,
    '-e',
    'POSTGRES_DB=test_db',
    '-e',
    'POSTGRES_USER=test_user',
    '-e',
    'POSTGRES_PASSWORD=test_password',
    '-p',
    '127.0.0.1::5432',
    'postgres:15-alpine',
  ]);

  runDocker([
    'run',
    '-d',
    '--label',
    'com.joonapay.usdc-wallet-e2e=true',
    '--name',
    redisContainer,
    '-p',
    '127.0.0.1::6379',
    'redis:7-alpine',
  ]);

  waitForCommand(() =>
    runDocker(['exec', postgresContainer, 'pg_isready', '-U', 'test_user', '-d', 'test_db']),
  );
  waitForCommand(() => runDocker(['exec', redisContainer, 'redis-cli', 'ping']));

  const infra: InfraInfo = {
    runId,
    infraFile: INFRA_FILE,
    host: '127.0.0.1',
    postgresContainer,
    redisContainer,
    postgresPort: getMappedPort(postgresContainer, 5432),
    redisPort: getMappedPort(redisContainer, 6379),
  };

  if (!existsSync(dirname(INFRA_FILE))) {
    mkdirSync(dirname(INFRA_FILE), { recursive: true });
  }

  writeFileSync(INFRA_FILE, JSON.stringify(infra, null, 2));

  process.env.E2E_SHARED_INFRA = 'true';
  process.env.E2E_INFRA_FILE = INFRA_FILE;
}

function runDocker(args: string[]): string {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function getMappedPort(container: string, port: number): number {
  const output = runDocker(['port', container, `${port}/tcp`]);
  const endpoint = output.split('\n')[0].trim();
  return Number(endpoint.slice(endpoint.lastIndexOf(':') + 1));
}

function waitForCommand(command: () => string): void {
  let lastError: unknown;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      command();
      return;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
  }

  throw lastError;
}

function cleanupPreviousRun(): void {
  try {
    const containers = runDocker([
      'ps',
      '-aq',
      '--filter',
      'label=com.joonapay.usdc-wallet-e2e=true',
    ])
      .split('\n')
      .map((container) => container.trim())
      .filter(Boolean);

    if (containers.length > 0) {
      runDocker(['rm', '-f', ...containers]);
    }
  } catch {
    // Best-effort cleanup only; docker run will surface real failures.
  }
}
