import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../../infrastructure/repositories';

export interface EmailStatusInput {
  userId: string;
}

export interface EmailStatusOutput {
  email: string | null;
  verified: boolean;
  pendingVerification: boolean;
}

@Injectable()
export class EmailStatusUsecase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: EmailStatusInput): Promise<EmailStatusOutput> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      email: user.email,
      verified: user.emailVerified,
      pendingVerification: user.hasPendingEmailVerification,
    };
  }
}
