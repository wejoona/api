import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CronJobRegistration {
  id?: string;
  name: string;
  schedule: string;
  grace_period: number;
  service_name: string;
  product_name: string;
  expected_interval_minutes: number;
}

@Injectable()
export class CronHubReporterService implements OnModuleInit {
  private readonly logger = new Logger(CronHubReporterService.name);
  private readonly baseUrl: string | null;
  private readonly jobIds = new Map<string, string>();

  /** Jobs to register on startup */
  private readonly jobs: CronJobRegistration[] = [
    {
      name: 'expire_stale_transactions',
      schedule: '0 * * * *',
      grace_period: 300,
      service_name: 'korido-backend',
      product_name: 'korido',
      expected_interval_minutes: 60,
    },
    {
      name: 'cleanup_transaction_metadata',
      schedule: '0 3 * * *',
      grace_period: 600,
      service_name: 'korido-backend',
      product_name: 'korido',
      expected_interval_minutes: 1440,
    },
    {
      name: 'cleanup_audit_logs',
      schedule: '0 2 * * 0',
      grace_period: 600,
      service_name: 'korido-backend',
      product_name: 'korido',
      expected_interval_minutes: 10080,
    },
    {
      name: 'daily_reconciliation',
      schedule: '0 1 * * *',
      grace_period: 600,
      service_name: 'korido-backend',
      product_name: 'korido',
      expected_interval_minutes: 1440,
    },
    {
      name: 'reconcile_blnk_balances',
      schedule: '30 2 * * *',
      grace_period: 600,
      service_name: 'korido-backend',
      product_name: 'korido',
      expected_interval_minutes: 1440,
    },
    {
      name: 'cleanup_expired_sessions',
      schedule: '0 * * * *',
      grace_period: 300,
      service_name: 'korido-backend',
      product_name: 'korido',
      expected_interval_minutes: 60,
    },
    {
      name: 'cleanup_fcm_tokens',
      schedule: '0 4 * * *',
      grace_period: 600,
      service_name: 'korido-backend',
      product_name: 'korido',
      expected_interval_minutes: 1440,
    },
    {
      name: 'cleanup_notifications',
      schedule: '0 3 * * 6',
      grace_period: 600,
      service_name: 'korido-backend',
      product_name: 'korido',
      expected_interval_minutes: 10080,
    },
  ];

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('CRONHUB_URL', '') || null;
  }

  get enabled(): boolean {
    return !!this.baseUrl;
  }

  getRegisteredJobs(): CronJobRegistration[] {
    return this.jobs.map((job) => ({
      ...job,
      id: this.jobIds.get(job.name),
    }));
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('CronHub reporting disabled (CRONHUB_URL not set)');
      return;
    }
    this.logger.log(`CronHub reporting enabled: ${this.baseUrl}`);
    await this.registerAll();
  }

  /** Register all jobs with CronHub, storing their IDs */
  private async registerAll(): Promise<void> {
    for (const job of this.jobs) {
      try {
        const res = await fetch(`${this.baseUrl}/api/crons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: job.name,
            schedule: job.schedule,
            grace_period: job.grace_period,
            service_name: job.service_name,
            product_name: job.product_name,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { data?: { id?: string } };
          const id = data?.data?.id;
          if (id) {
            this.jobIds.set(job.name, id);
            this.logger.debug(`Registered ${job.name} → ${id}`);
          }
        } else {
          this.logger.warn(
            `Failed to register ${job.name}: ${res.status} ${res.statusText}`,
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to register ${job.name}: ${err}`);
      }
    }
    this.logger.log(`Registered ${this.jobIds.size}/${this.jobs.length} jobs with CronHub`);
  }

  /** Call at the start of a job run */
  async pingStart(jobName: string): Promise<void> {
    const id = this.jobIds.get(jobName);
    if (!id) return;
    try {
      await fetch(`${this.baseUrl}/api/crons/${id}/start`, { method: 'POST' });
    } catch (err) {
      this.logger.debug(`CronHub start ping failed for ${jobName}: ${err}`);
    }
  }

  /** Call when a job completes successfully (heartbeat) */
  async pingComplete(jobName: string): Promise<void> {
    const id = this.jobIds.get(jobName);
    if (!id) return;
    try {
      await fetch(`${this.baseUrl}/api/crons/${id}/heartbeat`, {
        method: 'POST',
      });
    } catch (err) {
      this.logger.debug(
        `CronHub heartbeat failed for ${jobName}: ${err}`,
      );
    }
  }
}
