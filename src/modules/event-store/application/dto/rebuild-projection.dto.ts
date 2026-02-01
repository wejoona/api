import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class RebuildProjectionDto {
  @IsString()
  @IsNotEmpty()
  projectionName: string;

  @IsUUID()
  @IsNotEmpty()
  aggregateId: string;

  @IsString()
  @IsNotEmpty()
  aggregateType: string;
}

export class GetProjectionDto {
  @IsString()
  @IsNotEmpty()
  projectionName: string;

  @IsUUID()
  @IsOptional()
  aggregateId?: string;
}
