import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScreenIndividualDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class ScreenEntityDto {
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;
}

export class BatchScreenEntityDto {
  @IsEnum(['individual', 'entity'])
  type: 'individual' | 'entity';

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  metadata?: any;
}

export class BatchScreenDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchScreenEntityDto)
  entities: BatchScreenEntityDto[];
}

export class ScreenTransferDto {
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  senderName: string;

  @IsOptional()
  @IsString()
  recipientId?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class ReviewMatchDto {
  @IsString()
  @IsNotEmpty()
  matchId: string;

  @IsEnum(['confirm', 'dismiss'])
  decision: 'confirm' | 'dismiss';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetStatisticsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
