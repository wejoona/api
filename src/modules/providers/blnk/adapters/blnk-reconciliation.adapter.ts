import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlnkInit } from '@blnkfinance/blnk-typescript';
import type { Blnk } from '@blnkfinance/blnk-typescript/dist/src/blnk/endpoints/baseBlnkClient';
import type {
  ReconciliationUploadResp,
  RunReconResp,
  Matcher,
  RunReconData,
} from '@blnkfinance/blnk-typescript/dist/src/types/reconciliation';
import type { ApiResponse } from '@blnkfinance/blnk-typescript/dist/src/types/general';
import { createReadStream } from 'fs';

import {
  IReconciliationProvider,
  CreateMatchingRuleParams,
  RunReconciliationParams,
  ReconciliationResultInfo,
} from '@modules/providers/interfaces/ledger.interface';

/**
 * Blnk Reconciliation Adapter
 *
 * Provides reconciliation capabilities for:
 * - Matching Yellow Card statements with ledger
 * - Matching Circle transactions with ledger
 * - Daily/weekly batch reconciliation
 * - Audit and compliance reporting
 */
@Injectable()
export class BlnkReconciliationAdapter implements IReconciliationProvider {
  private readonly logger = new Logger(BlnkReconciliationAdapter.name);
  private readonly client: Blnk;

  constructor(private readonly configService: ConfigService) {
    const blnkUrl = this.configService.get<string>(
      'blnk.url',
      'http://localhost:5001',
    );
    const blnkApiKey = this.configService.get<string>('blnk.apiKey', '');
    this.client = BlnkInit(blnkApiKey, { baseUrl: blnkUrl });
  }

  async uploadExternalData(filePath: string, source: string): Promise<string> {
    this.logger.log(`Uploading external data for reconciliation: ${source}`);

    const fileStream = createReadStream(filePath);

    const response = (await this.client.Reconciliation.upload(
      fileStream,
      source,
    )) as unknown as ApiResponse<ReconciliationUploadResp>;

    if (!response.data) {
      throw new Error(
        `Failed to upload reconciliation data: ${response.message}`,
      );
    }

    this.logger.log(
      `Uploaded reconciliation data, upload_id: ${response.data.upload_id}`,
    );
    return response.data.upload_id;
  }

  async createMatchingRule(params: CreateMatchingRuleParams): Promise<string> {
    this.logger.log(`Creating matching rule: ${params.name}`);

    // Build the matcher request - cast to Matcher type to satisfy SDK
    const matcherRequest = {
      name: params.name,
      description: params.description,
      criteria: params.criteria.map((c) => ({
        field: c.field,
        operator: c.operator,
        allowable_drift: c.allowableDrift ?? 0,
      })),
    } as unknown as Matcher;

    const response = (await this.client.Reconciliation.createMatchingRule(
      matcherRequest,
    )) as unknown as ApiResponse<RunReconResp>;

    if (!response.data) {
      throw new Error(`Failed to create matching rule: ${response.message}`);
    }

    // The SDK returns the rule ID in the response
    const ruleId = (response.data as unknown as { rule_id: string }).rule_id;
    this.logger.log(`Created matching rule: ${ruleId}`);
    return ruleId;
  }

  async runReconciliation(
    params: RunReconciliationParams,
  ): Promise<ReconciliationResultInfo> {
    this.logger.log(`Running reconciliation for upload: ${params.uploadId}`);

    // Build the run request - cast to RunReconData type to satisfy SDK
    const runRequest = {
      upload_id: params.uploadId,
      strategy: params.strategy,
      dry_run: params.dryRun ?? false,
      grouping_criteria: params.groupingCriteria,
      matching_rule_ids: params.matchingRuleIds,
    } as unknown as RunReconData;

    const response = (await this.client.Reconciliation.run(
      runRequest,
    )) as unknown as ApiResponse<RunReconResp>;

    if (!response.data) {
      throw new Error(`Failed to run reconciliation: ${response.message}`);
    }

    // Map the response to our interface
    const result = response.data as unknown as {
      reconciliation_id: string;
      status: string;
      matched_count: number;
      unmatched_count: number;
      created_at: string;
    };

    return {
      reconciliationId: result.reconciliation_id,
      status: result.status,
      matchedCount: result.matched_count ?? 0,
      unmatchedCount: result.unmatched_count ?? 0,
      createdAt: new Date(result.created_at),
    };
  }
}
