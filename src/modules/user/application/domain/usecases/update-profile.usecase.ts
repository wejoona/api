import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { CacheInvalidationService } from '../../../../shared/infrastructure/services';

export interface UpdateProfileInput {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

@Injectable()
export class UpdateProfileUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: UpdateProfileInput): Promise<User> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check username uniqueness if changing
    if (input.username !== undefined && input.username !== user.username) {
      const existingUser = await this.userRepository.findByUsername(
        input.username,
      );
      if (existingUser && existingUser.id !== user.id) {
        throw new ConflictException('Username is already taken');
      }
    }

    user.updateProfile({
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    });

    const updatedUser = await this.userRepository.save(user);

    // Invalidate user profile cache
    await this.cacheInvalidationService.invalidateUserProfile(input.userId);

    this.eventEmitter.emit('user.profile.updated', {
      userId: input.userId,
      updatedFields: Object.keys(input).filter(k => k !== 'userId' && input[k as keyof UpdateProfileInput] !== undefined),
      timestamp: new Date(),
    });

    return updatedUser;
  }
}
