import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsNumber,
  IsUUID,
} from 'class-validator';

export class AppendEventDto {
  @IsUUID()
  @IsNotEmpty()
  aggregateId: string;

  @IsString()
  @IsNotEmpty()
  aggregateType: string;

  @IsString()
  @IsNotEmpty()
  eventType: string;

  @IsObject()
  @IsNotEmpty()
  eventData: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsNumber()
  @IsNotEmpty()
  version: number;

  @IsUUID()
  @IsOptional()
  correlationId?: string;

  @IsUUID()
  @IsOptional()
  causationId?: string;
}
