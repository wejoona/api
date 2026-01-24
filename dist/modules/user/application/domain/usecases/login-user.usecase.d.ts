import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';
export interface LoginUserInput {
    phone: string;
}
export interface LoginUserOutput {
    success: boolean;
    otpExpiresIn: number;
}
export declare class LoginUserUsecase {
    private readonly userRepository;
    private readonly otpService;
    constructor(userRepository: UserRepository, otpService: OtpService);
    execute(input: LoginUserInput): Promise<LoginUserOutput>;
}
