import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class GetEventsByAggregateDto {
  @IsUUID()
  aggregateId: string;

  @IsString()
  aggregateType: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  fromVersion?: number;
}

export class GetEventsByTypeDto {
  @IsString()
  eventType: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  limit?: number = 100;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number = 0;
}

export class GetEventsByTimeRangeDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  @IsOptional()
  aggregateType?: string;
}

export class GetEventsByCorrelationDto {
  @IsUUID()
  correlationId: string;
}
