import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';
export interface RegisterUserInput {
    phone: string;
    countryCode?: string;
}
export interface RegisterUserOutput {
    message: string;
    otpExpiresIn: number;
    isNewUser?: boolean;
}
export declare class RegisterUserUsecase {
    private readonly userRepository;
    private readonly otpService;
    private readonly logger;
    constructor(userRepository: UserRepository, otpService: OtpService);
    execute(input: RegisterUserInput): Promise<RegisterUserOutput>;
}
