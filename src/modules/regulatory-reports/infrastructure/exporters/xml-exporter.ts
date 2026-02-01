import { Injectable } from '@nestjs/common';
import {
  ReportExporter,
  ExportResult,
  ExportOptions,
  JOONAPAY_COMPANY_INFO,
} from './report-exporter.interface';
import { ExportFormat } from '../../domain/types';

@Injectable()
export class XmlExporter extends ReportExporter {
  get format(): ExportFormat {
    return ExportFormat.XML;
  }

  async export(
    reportData: Record<string, unknown>,
    filename: string,
    options?: ExportOptions,
  ): Promise<ExportResult> {
    const company = options?.companyInfo || JOONAPAY_COMPANY_INFO;

    const xmlLines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<RegulatoryReport xmlns="http://www.bceao.int/regulatory/reports/v1">',
      '  <Metadata>',
      `    <ExportedAt>${new Date().toISOString()}</ExportedAt>`,
      '    <Format>XML</Format>',
      '    <Version>1.0</Version>',
      '    <Generator>JoonaPay Regulatory Reporting System</Generator>',
      '  </Metadata>',
      '  <Institution>',
      `    <Name>${this.escapeXml(company.name)}</Name>`,
      `    <Address>${this.escapeXml(company.address)}</Address>`,
      `    <Phone>${this.escapeXml(company.phone)}</Phone>`,
      `    <Email>${this.escapeXml(company.email)}</Email>`,
      `    <License>${this.escapeXml(company.license)}</License>`,
      `    <BCEAOCode>${this.escapeXml(company.bceaoCode)}</BCEAOCode>`,
      '  </Institution>',
      '  <Report>',
    ];

    // Convert report data to XML
    this.convertToXml(reportData, xmlLines, 2);

    xmlLines.push('  </Report>');
    xmlLines.push('</RegulatoryReport>');

    const xmlContent = xmlLines.join('\n');

    return {
      data: Buffer.from(xmlContent, 'utf-8'),
      mimeType: 'application/xml',
      filename: `${filename}.xml`,
      format: ExportFormat.XML,
    };
  }

  private convertToXml(data: unknown, lines: string[], indent: number): void {
    const prefix = '  '.repeat(indent);

    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        lines.push(`${prefix}<Item index="${i}">`);
        this.convertToXml(data[i], lines, indent + 1);
        lines.push(`${prefix}</Item>`);
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const tagName = this.sanitizeTagName(key);

        if (value === null || value === undefined) {
          lines.push(`${prefix}<${tagName}/>`);
        } else if (typeof value === 'object') {
          lines.push(`${prefix}<${tagName}>`);
          this.convertToXml(value, lines, indent + 1);
          lines.push(`${prefix}</${tagName}>`);
        } else {
          lines.push(
            `${prefix}<${tagName}>${this.escapeXml(String(value))}</${tagName}>`,
          );
        }
      }
    } else if (data !== null && data !== undefined) {
      lines.push(`${prefix}${this.escapeXml(String(data))}`);
    }
  }

  private sanitizeTagName(name: string): string {
    // XML tag names cannot start with numbers and have restricted characters
    let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (/^[0-9]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    return sanitized;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
