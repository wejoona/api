import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRepository } from '../../../infrastructure/repositories';
import { VerificationFacadeService } from '../../../../verification/application/services/verification-facade.service';

export interface LoginUserInput {
  phone: string;
}

export interface LoginUserOutput {
  success: boolean;
  otpExpiresIn: number;
}

@Injectable()
export class LoginUserUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly verificationFacade: VerificationFacadeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    // Check if user exists
    const user = await this.userRepository.findByPhone(input.phone);
    if (!user) {
      throw new NotFoundException('User not found. Please register first.');
    }

    // Send OTP
    await this.verificationFacade.sendOtp(input.phone);

    this.eventEmitter.emit('user.login.requested', {
      userId: user.id,
      phone: input.phone,
      timestamp: new Date(),
    });

    return {
      success: true,
      otpExpiresIn: 300,
    };
  }
}
