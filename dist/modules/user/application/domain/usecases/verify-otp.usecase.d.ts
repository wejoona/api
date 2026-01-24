import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { OtpService } from '../services';
import { CreateWalletUseCase } from '../../../../wallet/application/usecases';
export interface VerifyOtpInput {
    phone: string;
    otp: string;
}
export interface VerifyOtpOutput {
    user: User;
    accessToken: string;
    refreshToken: string;
    walletCreated: boolean;
}
export declare class VerifyOtpUsecase {
    private readonly userRepository;
    private readonly otpService;
    private readonly jwtService;
    private readonly createWalletUseCase;
    private readonly configService;
    private readonly logger;
    private readonly refreshSecret;
    constructor(userRepository: UserRepository, otpService: OtpService, jwtService: JwtService, createWalletUseCase: CreateWalletUseCase, configService: ConfigService);
    execute(input: VerifyOtpInput): Promise<VerifyOtpOutput>;
}
