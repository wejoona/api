import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
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
   * Sync phone contacts to find JoonaPay users
   * Accepts hashed phone numbers for privacy
   */
  async syncContacts(
    currentUserId: string,
    phoneHashes: string[],
  ): Promise<{
    matches: Array<{
      phoneHash: string;
      userId: string;
      avatarUrl: string | null;
    }>;
    totalChecked: number;
    matchesFound: number;
  }> {
    const uniqueHashes = [
      ...new Set(phoneHashes.map((hash) => hash.trim().toLowerCase())),
    ];
    const users = await this.userRepository.findByPhoneHashes(uniqueHashes);

    const matches: Array<{
      phoneHash: string;
      userId: string;
      avatarUrl: string | null;
    }> = users
      .filter((user) => user.id !== currentUserId)
      .map((user) => ({
        phoneHash: this.userRepository.hashPhoneForLookup(user.phone),
        userId: user.id,
        avatarUrl: user.avatarUrl || null,
      }));

    return {
      matches,
      totalChecked: phoneHashes.length,
      matchesFound: matches.length,
    };
  }

  /**
   * Send invite to non-Korido contact via SMS
   */
  async inviteContact(
    invitedByUserId: string,
    phone: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!phone.startsWith('+')) {
      throw new BadRequestException(
        'Phone number must include country code (e.g., +225...)',
      );
    }

    const existingUser = await this.userRepository.findByPhone(phone);
    if (existingUser) {
      return {
        success: false,
        message: 'This user is already on Korido',
      };
    }

    // Emit invitation event for notification system to handle
    this.eventEmitter.emit('contact.invited', {
      invitedByUserId,
      phone,
      inviteLink: 'https://korido.app/download',
      message: `You've been invited to Korido! Send money instantly across borders. Download now: https://korido.app/download`,
    });

    this.logger.log(`Invitation sent to ${phone.substring(0, 6)}***`);

    return {
      success: true,
      message: 'Invitation sent successfully',
    };
  }
}
