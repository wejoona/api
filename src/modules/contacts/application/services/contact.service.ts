import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Contact } from '../../domain/entities';
import { ContactRepository } from '../../infrastructure/repositories';
import { UserRepository } from '../../../user/infrastructure/repositories';

export interface CreateContactInput {
  userId: string;
  name: string;
  phone?: string;
  walletAddress?: string;
  username?: string;
}

export interface UpdateContactInput {
  contactId: string;
  userId: string;
  name?: string;
  isFavorite?: boolean;
}

@Injectable()
export class ContactService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async createContact(input: CreateContactInput): Promise<Contact> {
    // Validate at least one identifier is provided
    if (!input.phone && !input.walletAddress && !input.username) {
      throw new BadRequestException(
        'At least one contact identifier (phone, wallet address, or username) is required',
      );
    }

    // Check for duplicates
    if (input.phone) {
      const existing = await this.contactRepository.findByPhone(
        input.userId,
        input.phone,
      );
      if (existing) {
        throw new ConflictException('Contact with this phone already exists');
      }
    }

    if (input.walletAddress) {
      const existing = await this.contactRepository.findByWalletAddress(
        input.userId,
        input.walletAddress,
      );
      if (existing) {
        throw new ConflictException(
          'Contact with this wallet address already exists',
        );
      }
    }

    // Try to link to JoonaPay user
    let contactUserId: string | undefined;
    let linkedUsername: string | undefined;

    if (input.username) {
      const user = await this.userRepository.findByUsername(input.username);
      if (user) {
        contactUserId = user.id;
        linkedUsername = user.username || undefined;
      }
    } else if (input.phone) {
      const user = await this.userRepository.findByPhone(input.phone);
      if (user) {
        contactUserId = user.id;
        linkedUsername = user.username || undefined;
      }
    }

    const contact = Contact.create({
      userId: input.userId,
      name: input.name,
      phone: input.phone,
      walletAddress: input.walletAddress,
      username: linkedUsername || input.username,
      contactUserId,
    });

    return this.contactRepository.save(contact);
  }

  async updateContact(input: UpdateContactInput): Promise<Contact> {
    const contact = await this.contactRepository.findById(input.contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.userId !== input.userId) {
      throw new NotFoundException('Contact not found');
    }

    if (input.name !== undefined) {
      contact.updateName(input.name);
    }

    if (input.isFavorite !== undefined) {
      contact.setFavorite(input.isFavorite);
    }

    return this.contactRepository.save(contact);
  }

  async getContacts(userId: string): Promise<Contact[]> {
    return this.contactRepository.findByUserId(userId);
  }

  async getFavorites(userId: string): Promise<Contact[]> {
    return this.contactRepository.findFavoritesByUserId(userId);
  }

  async getRecents(userId: string, limit = 5): Promise<Contact[]> {
    return this.contactRepository.findRecentsByUserId(userId, limit);
  }

  async searchContacts(
    userId: string,
    query: string,
    limit = 10,
  ): Promise<Contact[]> {
    return this.contactRepository.searchByName(userId, query, limit);
  }

  async deleteContact(contactId: string, userId: string): Promise<void> {
    const contact = await this.contactRepository.findById(contactId);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    if (contact.userId !== userId) {
      throw new NotFoundException('Contact not found');
    }

    await this.contactRepository.delete(contactId);
  }

  async recordTransaction(
    userId: string,
    identifier: { phone?: string; walletAddress?: string; username?: string },
  ): Promise<Contact | null> {
    let contact: Contact | null = null;

    if (identifier.phone) {
      contact = await this.contactRepository.findByPhone(
        userId,
        identifier.phone,
      );
    } else if (identifier.walletAddress) {
      contact = await this.contactRepository.findByWalletAddress(
        userId,
        identifier.walletAddress,
      );
    }

    if (contact) {
      contact.recordTransaction();
      return this.contactRepository.save(contact);
    }

    return null;
  }

  async getOrCreateContact(
    userId: string,
    input: CreateContactInput,
  ): Promise<Contact> {
    // Try to find existing contact
    if (input.phone) {
      const existing = await this.contactRepository.findByPhone(
        userId,
        input.phone,
      );
      if (existing) return existing;
    }

    if (input.walletAddress) {
      const existing = await this.contactRepository.findByWalletAddress(
        userId,
        input.walletAddress,
      );
      if (existing) return existing;
    }

    // Create new contact
    return this.createContact(input);
  }

  /**
   * Hash phone number using SHA-256 (matches mobile app implementation)
   */
  private hashPhone(phone: string): string {
    return createHash('sha256').update(phone).digest('hex');
  }

  /**
   * Sync phone contacts to find JoonaPay users
   * Accepts hashed phone numbers for privacy
   */
  async syncContacts(phoneHashes: string[]): Promise<{
    matches: Array<{
      phoneHash: string;
      userId: string;
      avatarUrl: string | null;
    }>;
    totalChecked: number;
    matchesFound: number;
  }> {
    // Get all users
    const users = await this.userRepository.findAll();

    // Match hashes against user phone numbers
    const matches: Array<{
      phoneHash: string;
      userId: string;
      avatarUrl: string | null;
    }> = [];

    for (const user of users) {
      const userPhoneHash = this.hashPhone(user.phone);

      if (phoneHashes.includes(userPhoneHash)) {
        matches.push({
          phoneHash: userPhoneHash,
          userId: user.id,
          avatarUrl: null, // TODO: Add avatar support when user profile is implemented
        });
      }
    }

    return {
      matches,
      totalChecked: phoneHashes.length,
      matchesFound: matches.length,
    };
  }

  /**
   * Send invite to non-JoonaPay contact
   * TODO: Implement SMS/WhatsApp invitation logic
   */
  async inviteContact(
    phone: string,
  ): Promise<{ success: boolean; message: string }> {
    // Validate phone number format
    if (!phone.startsWith('+')) {
      throw new BadRequestException(
        'Phone number must include country code (e.g., +225...)',
      );
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByPhone(phone);
    if (existingUser) {
      return {
        success: false,
        message: 'This user is already on JoonaPay',
      };
    }

    // TODO: Implement actual invitation logic
    // - Send SMS with download link
    // - Track invitation status
    // - Reward referrals

    return {
      success: true,
      message: 'Invitation sent successfully',
    };
  }
}
