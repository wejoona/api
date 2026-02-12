import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocaleDto {
  @ApiProperty({ description: 'Locale code', example: 'fr-CI' })
  @IsString()
  @IsNotEmpty()
  locale: string;
}
