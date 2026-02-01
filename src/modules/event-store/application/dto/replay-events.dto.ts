import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class ReplayEventsDto {
  @IsUUID()
  @IsNotEmpty()
  aggregateId: string;

  @IsString()
  @IsNotEmpty()
  aggregateType: string;

  @IsNumber()
  @IsOptional()
  fromVersion?: number;

  @IsNumber()
  @IsOptional()
  toVersion?: number;
}
