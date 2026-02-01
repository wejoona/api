import { Injectable } from '@nestjs/common';
import {
  ReportExporter,
  ExportResult,
  ExportOptions,
  JOONAPAY_COMPANY_INFO,
} from './report-exporter.interface';
import { ExportFormat } from '../../domain/types';

@Injectable()
export class CsvExporter extends ReportExporter {
  get format(): ExportFormat {
    return ExportFormat.CSV;
  }

  async export(
    reportData: Record<string, unknown>,
    filename: string,
    options?: ExportOptions,
  ): Promise<ExportResult> {
    const rows: string[] = [];

    // Add header metadata
    if (options?.includeHeader !== false) {
      const company = options?.companyInfo || JOONAPAY_COMPANY_INFO;
      rows.push(`# Report: ${options?.title || 'Regulatory Report'}`);
      rows.push(`# Institution: ${company.name}`);
      rows.push(`# BCEAO Code: ${company.bceaoCode}`);
      rows.push(`# Generated: ${new Date().toISOString()}`);
      rows.push('');
    }

    // Convert report data to CSV format
    this.convertToCSV(reportData, rows, '');

    const csvContent = rows.join('\n');

    return {
      data: Buffer.from(csvContent, 'utf-8'),
      mimeType: 'text/csv',
      filename: `${filename}.csv`,
      format: ExportFormat.CSV,
    };
  }

  private convertToCSV(
    data: Record<string, unknown> | unknown[],
    rows: string[],
    prefix: string,
  ): void {
    if (Array.isArray(data)) {
      this.convertArrayToCSV(data, rows, prefix);
    } else if (typeof data === 'object' && data !== null) {
      this.convertObjectToCSV(data, rows, prefix);
    }
  }

  private convertArrayToCSV(
    arr: unknown[],
    rows: string[],
    _prefix: string,
  ): void {
    if (arr.length === 0) return;

    // Check if array contains objects
    if (
      typeof arr[0] === 'object' &&
      arr[0] !== null &&
      !Array.isArray(arr[0])
    ) {
      // Get all keys from the first object
      const headers = Object.keys(arr[0] as Record<string, unknown>);
      rows.push(headers.map((h) => this.escapeCSV(h)).join(','));

      // Add rows
      for (const item of arr) {
        const itemObj = item as Record<string, unknown>;
        const values = headers.map((h) =>
          this.escapeCSV(String(itemObj[h] ?? '')),
        );
        rows.push(values.join(','));
      }
    } else {
      // Simple array
      rows.push(arr.map((item) => this.escapeCSV(String(item))).join(','));
    }
  }

  private convertObjectToCSV(
    obj: Record<string, unknown>,
    rows: string[],
    prefix: string,
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (Array.isArray(value)) {
        rows.push('');
        rows.push(`# Section: ${fullKey}`);
        this.convertArrayToCSV(value, rows, fullKey);
      } else if (typeof value === 'object' && value !== null) {
        rows.push('');
        rows.push(`# Section: ${fullKey}`);
        this.convertObjectToCSV(
          value as Record<string, unknown>,
          rows,
          fullKey,
        );
      } else {
        rows.push(
          `${this.escapeCSV(fullKey)},${this.escapeCSV(String(value ?? ''))}`,
        );
      }
    }
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
