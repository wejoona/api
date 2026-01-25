import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';
import { KycService } from '../../../../kyc/application/services/kyc.service';
export interface VerifyOtpInput {
    phone: string;
    otp: string;
}
export interface VerifyOtpOutput {
    user: User;
    accessToken: string;
    refreshToken: string;
    kycStatus: string;
}
export declare class VerifyOtpUsecase {
    private readonly userRepository;
    private readonly otpService;
    private readonly jwtService;
    private readonly kycService;
    private readonly configService;
    private readonly logger;
    private readonly refreshSecret;
    private readonly refreshExpiresIn;
    constructor(userRepository: UserRepository, otpService: OtpService, jwtService: JwtService, kycService: KycService, configService: ConfigService);
    execute(input: VerifyOtpInput): Promise<VerifyOtpOutput>;
}
