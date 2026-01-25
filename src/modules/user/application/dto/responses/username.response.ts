import { ApiProperty } from '@nestjs/swagger';

export class CheckUsernameResponse {
  @ApiProperty({ example: true })
  available: boolean;

  @ApiProperty({ example: 'amadou_diallo' })
  username: string;
}

export class UserSearchResultResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'amadou_diallo' })
  username: string;

  @ApiProperty({ example: 'Amadou', nullable: true })
  firstName: string | null;

  @ApiProperty({ example: 'Diallo', nullable: true })
  lastName: string | null;

  @ApiProperty({ example: '****4567', description: 'Masked phone number' })
  phone: string;
}

export class SearchUsernameResponse {
  @ApiProperty({ type: [UserSearchResultResponse] })
  users: UserSearchResultResponse[];

  @ApiProperty({ example: 5 })
  count: number;
}
