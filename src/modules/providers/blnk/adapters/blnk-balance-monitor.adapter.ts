import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlnkInit } from '@blnkfinance/blnk-typescript';
import type { Blnk } from '@blnkfinance/blnk-typescript/dist/src/blnk/endpoints/baseBlnkClient';
import type { MonitorDataResp } from '@blnkfinance/blnk-typescript/dist/src/types/balanceMonitor';
import type { ApiResponse } from '@blnkfinance/blnk-typescript/dist/src/types/general';

import {
  IBalanceMonitorProvider,
  CreateMonitorParams,
  BalanceMonitorInfo,
} from '@modules/providers/interfaces/ledger.interface';

/**
 * Blnk Balance Monitor Adapter
 *
 * Implements balance monitoring for:
 * - Fraud detection (high debit alerts)
 * - Low balance notifications
 * - Float monitoring for operations
 * - AML compliance thresholds
 */
@Injectable()
export class BlnkBalanceMonitorAdapter implements IBalanceMonitorProvider {
  private readonly logger = new Logger(BlnkBalanceMonitorAdapter.name);
  private readonly client: Blnk;
  private readonly USDC_PRECISION = 1000000;

  constructor(private readonly configService: ConfigService) {
    const blnkUrl = this.configService.get<string>(
      'blnk.url',
      'http://localhost:5001',
    );
    const blnkApiKey = this.configService.get<string>('blnk.apiKey', '');
    this.client = BlnkInit(blnkApiKey, { baseUrl: blnkUrl });
  }

  async createMonitor(
    params: CreateMonitorParams,
  ): Promise<BalanceMonitorInfo> {
    this.logger.log(
      `Creating balance monitor for balance: ${params.balanceId}`,
    );

    const response = (await this.client.BalanceMonitor.create({
      balance_id: params.balanceId,
      condition: {
        field: params.field,
        operator: params.operator,
        value: Number(params.value),
        precision: this.USDC_PRECISION,
      },
      description: params.description,
    })) as unknown as ApiResponse<MonitorDataResp>;

    if (!response.data) {
      throw new Error(`Failed to create balance monitor: ${response.message}`);
    }

    return this.mapToMonitorInfo(response.data);
  }

  async getMonitor(monitorId: string): Promise<BalanceMonitorInfo | null> {
    this.logger.debug(`Getting balance monitor: ${monitorId}`);

    const response = (await this.client.BalanceMonitor.get(
      monitorId,
    )) as unknown as ApiResponse<MonitorDataResp>;

    if (!response.data) {
      return null;
    }

    return this.mapToMonitorInfo(response.data);
  }

  async listMonitors(): Promise<BalanceMonitorInfo[]> {
    this.logger.debug('Listing all balance monitors');

    const response =
      (await this.client.BalanceMonitor.list()) as unknown as ApiResponse<
        MonitorDataResp[]
      >;

    if (!response.data) {
      return [];
    }

    return response.data.map((m) => this.mapToMonitorInfo(m));
  }

  async updateMonitor(
    monitorId: string,
    params: Partial<CreateMonitorParams>,
  ): Promise<BalanceMonitorInfo> {
    this.logger.log(`Updating balance monitor: ${monitorId}`);

    // First get the existing monitor
    const existing = await this.getMonitor(monitorId);
    if (!existing) {
      throw new Error(`Balance monitor not found: ${monitorId}`);
    }

    const response = (await this.client.BalanceMonitor.update(monitorId, {
      balance_id: params.balanceId ?? existing.balanceId,
      condition: {
        field: (params.field ?? existing.field) as
          | 'balance'
          | 'credit_balance'
          | 'debit_balance',
        operator: (params.operator ?? existing.operator) as
          | '>'
          | '<'
          | '='
          | '!='
          | '>='
          | '<=',
        value: params.value ? Number(params.value) : Number(existing.value),
        precision: this.USDC_PRECISION,
      },
      description: params.description ?? existing.description,
    })) as unknown as ApiResponse<MonitorDataResp>;

    if (!response.data) {
      throw new Error(`Failed to update balance monitor: ${response.message}`);
    }

    return this.mapToMonitorInfo(response.data);
  }

  deleteMonitor(_monitorId: string): Promise<void> {
    // Note: Blnk SDK doesn't expose a delete method for monitors
    // This would need to be implemented via direct API call or SDK update
    this.logger.warn(`Delete monitor not supported by Blnk SDK: ${_monitorId}`);
    return Promise.reject(
      new Error('Delete monitor not yet supported by Blnk SDK'),
    );
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private mapToMonitorInfo(monitor: MonitorDataResp): BalanceMonitorInfo {
    return {
      monitorId: monitor.monitor_id,
      balanceId: monitor.balance_id,
      field: monitor.condition.field,
      operator: monitor.condition.operator,
      value: BigInt(monitor.condition.value),
      description: monitor.description,
      createdAt: new Date(monitor.created_at),
    };
  }
}
