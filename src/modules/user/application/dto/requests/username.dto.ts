import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CheckUsernameDto {
  @ApiProperty({
    description: 'Username to check availability (3-20 chars, alphanumeric and underscores)',
    example: 'amadou_diallo',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().replace(/^@/, '') : value,
  )
  username: string;
}

export class SearchUsernameDto {
  @ApiProperty({
    description: 'Search query (username prefix)',
    example: 'ama',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().replace(/^@/, '') : value,
  )
  query: string;

  @ApiProperty({
    description: 'Maximum number of results',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
