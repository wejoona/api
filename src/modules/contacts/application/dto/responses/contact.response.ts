import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Contact } from '../../../domain/entities';

export class ContactResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Amadou Diallo' })
  name: string;

  @ApiPropertyOptional({ example: '+2250701234567' })
  phone: string | null;

  @ApiPropertyOptional({ example: '0x1234567890abcdef...' })
  walletAddress: string | null;

  @ApiPropertyOptional({ example: 'amadou_diallo' })
  username: string | null;

  @ApiProperty({ example: true })
  isFavorite: boolean;

  @ApiProperty({ example: 5 })
  transactionCount: number;

  @ApiPropertyOptional({ example: '2026-01-20T12:00:00.000Z' })
  lastTransactionAt: Date | null;

  @ApiProperty({ example: true })
  isJoonaPayUser: boolean;

  static fromDomain(contact: Contact): ContactResponse {
    const response = new ContactResponse();
    response.id = contact.id;
    response.name = contact.name;
    response.phone = contact.phone;
    response.walletAddress = contact.walletAddress;
    response.username = contact.username;
    response.isFavorite = contact.isFavorite;
    response.transactionCount = contact.transactionCount;
    response.lastTransactionAt = contact.lastTransactionAt;
    response.isJoonaPayUser = contact.contactUserId !== null;
    return response;
  }
}

export class ContactListResponse {
  @ApiProperty({ type: [ContactResponse] })
  contacts: ContactResponse[];

  @ApiProperty({ example: 10 })
  total: number;

  static fromDomain(contacts: Contact[]): ContactListResponse {
    const response = new ContactListResponse();
    response.contacts = contacts.map(ContactResponse.fromDomain);
    response.total = contacts.length;
    return response;
  }
}

export class SyncedContactResponse {
  @ApiProperty({
    description: 'SHA-256 hash of the phone number',
    example: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  })
  phoneHash: string;

  @ApiProperty({ example: 'user_amadou_123' })
  userId: string;

  @ApiPropertyOptional({
    example: 'https://i.pravatar.cc/150?img=12',
    nullable: true,
  })
  avatarUrl: string | null;
}

export class SyncContactsResponse {
  @ApiProperty({ type: [SyncedContactResponse] })
  matches: SyncedContactResponse[];

  @ApiProperty({ example: 10 })
  totalChecked: number;

  @ApiProperty({ example: 3 })
  matchesFound: number;
}

export class InviteContactResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Invitation sent successfully' })
  message: string;
}
