import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { CacheInvalidationService, NtmClientService } from '../../../../shared/infrastructure/services';

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
    private readonly ntmClient: NtmClientService,
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

    // Check if email is changing
    const emailChanged = input.email !== undefined && input.email !== user.email;

    user.updateProfile({
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    });

    // If email changed, generate verification code and send via NTM
    if (emailChanged && input.email) {
      const { code } = user.generateEmailVerification();

      // Send verification email via NTM (fire-and-forget)
      this.ntmClient.send({
        template: 'email.verification',
        channel: 'email',
        recipient: {
          userId: user.id,
          email: input.email,
        },
        variables: {
          code,
          userName: user.firstName || 'Utilisateur',
        },
        priority: 'high',
      }).catch(() => { /* logged internally */ });
    }

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
