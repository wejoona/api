import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsDate,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RegulatoryReportType,
  ReportPeriod,
  ExportFormat,
} from '../../domain/types';

export class ReportFiltersDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transactionTypes?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  riskLevels?: string[];
}

export class GenerateReportDto {
  @IsEnum(RegulatoryReportType)
  @IsNotEmpty()
  reportType: RegulatoryReportType;

  @IsEnum(ReportPeriod)
  @IsNotEmpty()
  period: ReportPeriod;

  @IsDate()
  @Type(() => Date)
  periodStart: Date;

  @IsDate()
  @Type(() => Date)
  periodEnd: Date;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;
}

export class GenerateSARDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsDate()
  @Type(() => Date)
  activityDateFrom: Date;

  @IsDate()
  @Type(() => Date)
  activityDateTo: Date;

  @IsString()
  @IsNotEmpty()
  activityType: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  indicators: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedTransactionIds?: string[];

  @IsString()
  @IsNotEmpty()
  narrative: string;
}

export class GenerateAuditExportDto {
  @IsDate()
  @Type(() => Date)
  periodStart: Date;

  @IsDate()
  @Type(() => Date)
  periodEnd: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entityTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}
