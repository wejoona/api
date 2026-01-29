import { OnModuleDestroy } from '@nestjs/common';
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
export declare class RefreshTokenUsecase implements OnModuleDestroy {
    private readonly userRepository;
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    private readonly refreshSecret;
    private readonly refreshExpiresIn;
    private readonly redis;
    private isRedisConnected;
    constructor(userRepository: UserRepository, jwtService: JwtService, configService: ConfigService);
    onModuleDestroy(): Promise<void>;
    private ensureConnection;
    execute(input: RefreshTokenInput): Promise<RefreshTokenOutput>;
    generateRefreshToken(userId: string): string;
    blacklistToken(token: string, expirationTimestamp?: number): Promise<void>;
    private checkGlobalInvalidation;
}
