import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';

export class CreateDeletionRequestDto {
  @IsString()
  userId: string;

  @IsEnum(['gdpr', 'account_closure', 'admin'])
  deletionType: 'gdpr' | 'account_closure' | 'admin';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  daysDelay?: number;
}
