import { IsArray, IsString, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckContactsDto {
  @ApiProperty({
    description: 'Phone numbers in international format to check',
    example: ['+2250701234567', '+221771234567'],
    maxItems: 500,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  phoneNumbers: string[];
}
