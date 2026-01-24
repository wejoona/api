import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
export interface RefreshTokenInput {
    refreshToken: string;
}
export interface RefreshTokenOutput {
    user: User;
    accessToken: string;
    refreshToken: string;
}
export declare class RefreshTokenUsecase {
    private readonly userRepository;
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    private readonly refreshSecret;
    constructor(userRepository: UserRepository, jwtService: JwtService, configService: ConfigService);
    execute(input: RefreshTokenInput): Promise<RefreshTokenOutput>;
    generateRefreshToken(userId: string): string;
}
