import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export class UpdateRoleDto {
  @ApiProperty({
    description: 'New role to assign to the user',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: user, admin, super_admin',
  })
  role: UserRole;
}
