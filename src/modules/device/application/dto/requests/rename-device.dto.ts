import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RenameDeviceDto {
  @ApiProperty({
    description: 'New name for the device',
    example: "Ben's iPhone 15",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
