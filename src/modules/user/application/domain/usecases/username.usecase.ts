import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';

export interface CheckUsernameInput {
  username: string;
}

export interface CheckUsernameOutput {
  available: boolean;
  username: string;
}

export interface SearchUsernameInput {
  query: string;
  limit?: number;
}

export interface UserSearchResult {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
}

export interface FindByUsernameInput {
  username: string;
}

@Injectable()
export class UsernameUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async checkAvailability(
    input: CheckUsernameInput,
  ): Promise<CheckUsernameOutput> {
    const normalizedUsername = input.username.toLowerCase().replace(/^@/, '');
    const exists =
      await this.userRepository.existsByUsername(normalizedUsername);

    return {
      available: !exists,
      username: normalizedUsername,
    };
  }

  async search(input: SearchUsernameInput): Promise<UserSearchResult[]> {
    const users = await this.userRepository.searchByUsername(
      input.query,
      input.limit || 10,
    );

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: this.maskPhone(user.phone),
    }));
  }

  async findByUsername(input: FindByUsernameInput): Promise<User> {
    const user = await this.userRepository.findByUsername(input.username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private maskPhone(phone: string): string {
    // Mask phone number for privacy (show last 4 digits)
    if (phone.length <= 4) return phone;
    return '****' + phone.slice(-4);
  }
}
