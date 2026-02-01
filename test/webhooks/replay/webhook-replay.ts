import * as fs from 'fs/promises';
import * as path from 'path';
import { MockWebhookServer } from '../server/mock-webhook-server';

/**
 * Webhook Replay Tool
 *
 * Records and replays webhook payloads for testing and debugging.
 * Useful for reproducing production issues, regression testing,
 * and load testing webhook handlers.
 *
 * Usage:
 * ```typescript
 * const replay = new WebhookReplay();
 *
 * // Record webhooks
 * await replay.record('circle-transfer-complete', webhookPayload, 'circle');
 *
 * // Replay webhooks
 * const server = new MockWebhookServer();
 * await replay.replayOne('circle-transfer-complete', server, 'http://localhost:3000/webhooks/circle');
 *
 * // Replay all webhooks in a scenario
 * await replay.replayScenario('deposit-flow', server, 'http://localhost:3000');
 * ```
 */
export class WebhookReplay {
  private recordingsDir: string;

  constructor(recordingsDir?: string) {
    this.recordingsDir =
      recordingsDir || path.join(__dirname, '../fixtures/recordings');
  }

  /**
   * Initialize recordings directory
   */
  async init(): Promise<void> {
    await fs.mkdir(this.recordingsDir, { recursive: true });
  }

  /**
   * Record a webhook payload
   */
  async record(
    name: string,
    payload: any,
    provider: 'circle' | 'yellowcard' | 'twilio',
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.init();

    const recording: WebhookRecording = {
      name,
      provider,
      payload,
      metadata: metadata || {},
      recordedAt: new Date().toISOString(),
    };

    const filePath = this.getRecordingPath(name);
    await fs.writeFile(filePath, JSON.stringify(recording, null, 2));
    console.log(`Recorded webhook: ${name} -> ${filePath}`);
  }

  /**
   * Load a recorded webhook
   */
  async load(name: string): Promise<WebhookRecording> {
    const filePath = this.getRecordingPath(name);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * List all recordings
   */
  async list(): Promise<string[]> {
    await this.init();
    const files = await fs.readdir(this.recordingsDir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  }

  /**
   * Delete a recording
   */
  async delete(name: string): Promise<void> {
    const filePath = this.getRecordingPath(name);
    await fs.unlink(filePath);
    console.log(`Deleted recording: ${name}`);
  }

  /**
   * Replay a single webhook
   */
  async replayOne(
    name: string,
    server: MockWebhookServer,
    targetUrl: string,
  ): Promise<any> {
    const recording = await this.load(name);
    console.log(`Replaying webhook: ${name} (${recording.provider})`);

    switch (recording.provider) {
      case 'circle':
        return server.sendCircleWebhook(targetUrl, recording.payload);
      case 'yellowcard':
        return server.sendYellowCardWebhook(targetUrl, recording.payload);
      case 'twilio':
        return server.sendTwilioWebhook(targetUrl, recording.payload);
      default:
        throw new Error(`Unknown provider: ${recording.provider}`);
    }
  }

  /**
   * Replay multiple webhooks in sequence
   */
  async replaySequence(
    names: string[],
    server: MockWebhookServer,
    targetUrl: string,
    delayMs: number = 0,
  ): Promise<any[]> {
    const results = [];

    for (const name of names) {
      const result = await this.replayOne(name, server, targetUrl);
      results.push(result);

      if (delayMs > 0 && names.indexOf(name) < names.length - 1) {
        await this.sleep(delayMs);
      }
    }

    return results;
  }

  /**
   * Record a scenario (sequence of webhooks)
   */
  async recordScenario(
    scenarioName: string,
    recordings: Array<{
      name: string;
      payload: any;
      provider: 'circle' | 'yellowcard' | 'twilio';
      delayMs?: number;
    }>,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.init();

    const scenario: WebhookScenario = {
      name: scenarioName,
      webhooks: recordings.map((r) => ({
        recordingName: r.name,
        delayMs: r.delayMs || 0,
      })),
      metadata: metadata || {},
      recordedAt: new Date().toISOString(),
    };

    // Record individual webhooks
    for (const recording of recordings) {
      await this.record(recording.name, recording.payload, recording.provider, {
        scenarioName,
      });
    }

    // Record scenario manifest
    const scenarioPath = this.getScenarioPath(scenarioName);
    await fs.writeFile(scenarioPath, JSON.stringify(scenario, null, 2));
    console.log(`Recorded scenario: ${scenarioName} -> ${scenarioPath}`);
  }

  /**
   * Replay a scenario
   */
  async replayScenario(
    scenarioName: string,
    server: MockWebhookServer,
    baseUrl: string,
  ): Promise<any[]> {
    const scenarioPath = this.getScenarioPath(scenarioName);
    const content = await fs.readFile(scenarioPath, 'utf-8');
    const scenario: WebhookScenario = JSON.parse(content);

    console.log(
      `Replaying scenario: ${scenarioName} (${scenario.webhooks.length} webhooks)`,
    );

    const results = [];
    for (const webhook of scenario.webhooks) {
      const recording = await this.load(webhook.recordingName);

      // Determine target URL based on provider
      const targetUrl = this.getTargetUrl(baseUrl, recording.provider);

      const result = await this.replayOne(
        webhook.recordingName,
        server,
        targetUrl,
      );
      results.push(result);

      if (webhook.delayMs > 0) {
        console.log(`Waiting ${webhook.delayMs}ms before next webhook...`);
        await this.sleep(webhook.delayMs);
      }
    }

    console.log(`Scenario completed: ${scenarioName}`);
    return results;
  }

  /**
   * List all scenarios
   */
  async listScenarios(): Promise<string[]> {
    await this.init();
    const files = await fs.readdir(this.recordingsDir);
    return files
      .filter((f) => f.startsWith('scenario-') && f.endsWith('.json'))
      .map((f) => f.replace('scenario-', '').replace('.json', ''));
  }

  /**
   * Export webhooks as test fixtures
   */
  async exportAsFixture(names: string[], outputPath: string): Promise<void> {
    const fixtures: Record<string, any> = {};

    for (const name of names) {
      const recording = await this.load(name);
      fixtures[name] = recording.payload;
    }

    await fs.writeFile(outputPath, JSON.stringify(fixtures, null, 2));
    console.log(`Exported ${names.length} webhooks to ${outputPath}`);
  }

  /**
   * Import webhooks from production logs
   */
  async importFromLogs(
    logFile: string,
    filter?: (log: any) => boolean,
  ): Promise<void> {
    const content = await fs.readFile(logFile, 'utf-8');
    const logs = content.split('\n').filter(Boolean).map(JSON.parse);

    let imported = 0;
    for (const log of logs) {
      if (filter && !filter(log)) {
        continue;
      }

      // Extract webhook data from log
      const { provider, payload, timestamp } = this.extractWebhookFromLog(log);
      if (!provider || !payload) {
        continue;
      }

      const name = `${provider}-${timestamp}-${imported}`;
      await this.record(name, payload, provider, { importedFrom: logFile });
      imported++;
    }

    console.log(`Imported ${imported} webhooks from ${logFile}`);
  }

  /**
   * Get recording file path
   */
  private getRecordingPath(name: string): string {
    return path.join(this.recordingsDir, `${name}.json`);
  }

  /**
   * Get scenario file path
   */
  private getScenarioPath(name: string): string {
    return path.join(this.recordingsDir, `scenario-${name}.json`);
  }

  /**
   * Get target URL based on provider
   */
  private getTargetUrl(baseUrl: string, provider: string): string {
    const routes = {
      circle: '/webhooks/circle',
      yellowcard: '/webhooks/payment/yellow-card',
      twilio: '/webhooks/twilio/sms-status',
    };

    return `${baseUrl}${routes[provider] || '/webhooks/payment'}`;
  }

  /**
   * Extract webhook data from log entry
   */
  private extractWebhookFromLog(log: any): {
    provider: 'circle' | 'yellowcard' | 'twilio' | null;
    payload: any;
    timestamp: string;
  } {
    // This is a placeholder - implement based on your log format
    // Look for webhook-related log entries and extract provider/payload

    if (log.message?.includes('Circle webhook')) {
      return {
        provider: 'circle',
        payload: log.payload || log.body,
        timestamp: log.timestamp || new Date().toISOString(),
      };
    }

    if (log.message?.includes('Yellow Card webhook')) {
      return {
        provider: 'yellowcard',
        payload: log.payload || log.body,
        timestamp: log.timestamp || new Date().toISOString(),
      };
    }

    if (log.message?.includes('Twilio webhook')) {
      return {
        provider: 'twilio',
        payload: log.payload || log.body,
        timestamp: log.timestamp || new Date().toISOString(),
      };
    }

    return { provider: null, payload: null, timestamp: '' };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// Types
// ============================================

export interface WebhookRecording {
  name: string;
  provider: 'circle' | 'yellowcard' | 'twilio';
  payload: any;
  metadata: Record<string, any>;
  recordedAt: string;
}

export interface WebhookScenario {
  name: string;
  webhooks: Array<{
    recordingName: string;
    delayMs: number;
  }>;
  metadata: Record<string, any>;
  recordedAt: string;
}
