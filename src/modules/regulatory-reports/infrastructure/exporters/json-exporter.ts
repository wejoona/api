import { Injectable } from '@nestjs/common';
import {
  ReportExporter,
  ExportResult,
  ExportOptions,
  JOONAPAY_COMPANY_INFO,
} from './report-exporter.interface';
import { ExportFormat } from '../../domain/types';

@Injectable()
export class JsonExporter extends ReportExporter {
  get format(): ExportFormat {
    return ExportFormat.JSON;
  }

  async export(
    reportData: Record<string, unknown>,
    filename: string,
    options?: ExportOptions,
  ): Promise<ExportResult> {
    const exportDocument = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'JSON',
        version: '1.0',
        generator: 'JoonaPay Regulatory Reporting System',
      },
      institution: options?.companyInfo || JOONAPAY_COMPANY_INFO,
      report: reportData,
    };

    const jsonString = JSON.stringify(exportDocument, null, 2);

    return {
      data: Buffer.from(jsonString, 'utf-8'),
      mimeType: 'application/json',
      filename: `${filename}.json`,
      format: ExportFormat.JSON,
    };
  }
}
