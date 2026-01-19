import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'Abidjan' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'Lagunes' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '01 BP 1234' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ example: 'CI' })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class SubmitKycDto {
  @ApiProperty({ example: 'Konan' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Yao' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: '1990-05-15',
    description: 'Date of birth in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({ example: 'CI', description: 'ISO country code' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    enum: ['passport', 'national_id', 'drivers_license'],
    example: 'national_id',
    description: 'Type of ID document',
  })
  @IsEnum(['passport', 'national_id', 'drivers_license'])
  idType: 'passport' | 'national_id' | 'drivers_license';

  @ApiProperty({ example: 'CI123456789', description: 'ID document number' })
  @IsString()
  @IsNotEmpty()
  idNumber: string;

  @ApiPropertyOptional({
    example: '2030-12-31',
    description: 'ID expiry date in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsOptional()
  idExpiryDate?: string;

  @ApiPropertyOptional({ type: AddressDto, description: 'User address' })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;
}
