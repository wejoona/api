import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';
export interface RegisterUserInput {
    phone: string;
    countryCode?: string;
}
export interface RegisterUserOutput {
    user: User;
    otpExpiresIn: number;
}
export declare class RegisterUserUsecase {
    private readonly userRepository;
    private readonly otpService;
    constructor(userRepository: UserRepository, otpService: OtpService);
    execute(input: RegisterUserInput): Promise<RegisterUserOutput>;
}
