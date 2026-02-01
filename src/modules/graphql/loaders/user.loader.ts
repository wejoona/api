import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { UserRepository } from '@/modules/user/infrastructure/repositories/user.repository';
import { User } from '@/modules/user/application/domain/entities/user.entity';

@Injectable({ scope: Scope.REQUEST })
export class UserLoader {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * DataLoader for batching user lookups by ID
   */
  readonly byId = new DataLoader<string, User | null>(
    async (ids: readonly string[]) => {
      // Batch load using individual findById calls
      const users = await Promise.all(
        ids.map(async (id) => {
          try {
            return await this.userRepository.findById(id);
          } catch {
            return null;
          }
        }),
      );

      return users;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  /**
   * DataLoader for batching user lookups by phone
   */
  readonly byPhone = new DataLoader<string, User | null>(
    async (phones: readonly string[]) => {
      // Batch load using individual findByPhone calls
      const users = await Promise.all(
        phones.map(async (phone) => {
          try {
            return await this.userRepository.findByPhone(phone);
          } catch {
            return null;
          }
        }),
      );

      return users;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  /**
   * DataLoader for batching user lookups by username
   */
  readonly byUsername = new DataLoader<string, User | null>(
    async (usernames: readonly string[]) => {
      // Batch load using individual findByUsername calls
      const users = await Promise.all(
        usernames.map(async (username) => {
          try {
            return await this.userRepository.findByUsername(username);
          } catch {
            return null;
          }
        }),
      );

      return users;
    },
    {
      cache: true,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );
}
