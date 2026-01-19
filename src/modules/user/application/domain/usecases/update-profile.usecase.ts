import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';

export interface UpdateProfileInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

@Injectable()
export class UpdateProfileUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UpdateProfileInput): Promise<User> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.updateProfile({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    });

    return this.userRepository.save(user);
  }
}
