import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
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

@Injectable()
export class RefreshTokenUsecase {
  private readonly logger = new Logger(RefreshTokenUsecase.name);
  private readonly refreshSecret: string;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      this.configService.get<string>('JWT_SECRET', 'default-secret') + '-refresh',
    );
  }

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(input.refreshToken, {
        secret: this.refreshSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Find user
      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('User account is not active');
      }

      this.logger.log(`Refreshing tokens for user ${user.id}`);

      // Generate new access token
      const accessToken = this.jwtService.sign({
        sub: user.id,
        phone: user.phone,
      });

      // Generate new refresh token (rotation for security)
      const refreshToken = this.jwtService.sign(
        {
          sub: user.id,
          type: 'refresh',
        },
        {
          secret: this.refreshSecret,
          expiresIn: '30d',
        },
      );

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.warn(`Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Generate a new refresh token for a user
   * Called when user first authenticates
   */
  generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      {
        sub: userId,
        type: 'refresh',
      },
      {
        secret: this.refreshSecret,
        expiresIn: '30d',
      },
    );
  }
}
