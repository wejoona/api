import { ExportFormat } from '../../domain/types';

export interface ExportResult {
  data: Buffer | string;
  mimeType: string;
  filename: string;
  format: ExportFormat;
}

export abstract class ReportExporter {
  abstract export(
    reportData: Record<string, unknown>,
    filename: string,
    options?: ExportOptions,
  ): Promise<ExportResult>;

  abstract get format(): ExportFormat;
}

export interface ExportOptions {
  title?: string;
  subtitle?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  companyInfo?: CompanyInfo;
  dateFormat?: string;
  locale?: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  license: string;
  bceaoCode: string;
}

export const JOONAPAY_COMPANY_INFO: CompanyInfo = {
  name: 'JoonaPay SAS',
  address: "Abidjan, Cote d'Ivoire",
  phone: '+225 XX XX XX XX',
  email: 'compliance@joonapay.com',
  license: 'EME-BCEAO-2024-XXX',
  bceaoCode: 'JP-CI-001',
};
