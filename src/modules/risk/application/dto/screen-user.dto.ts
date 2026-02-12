import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScreenUserDto {
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'Middle name' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({ description: 'Date of birth (ISO)', example: '1990-01-15' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Nationality (ISO country code)', example: 'CI' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ description: 'Country of residence (ISO code)', example: 'CI' })
  @IsOptional()
  @IsString()
  countryOfResidence?: string;

  @ApiPropertyOptional({ description: 'ID document type', example: 'passport' })
  @IsOptional()
  @IsString()
  idType?: string;

  @ApiPropertyOptional({ description: 'ID document number' })
  @IsOptional()
  @IsString()
  idNumber?: string;
}
