import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// ORM Entities
import { UserOrmEntity } from './infrastructure/orm-entities';

// Repositories
import { UserRepository } from './infrastructure/repositories';

// Services
import { OtpService } from './application/domain/services';

// Use Cases
import {
  RegisterUserUsecase,
  VerifyOtpUsecase,
  LoginUserUsecase,
  UpdateProfileUsecase,
  CreateUserLedgerIdentityUseCase,
  SetupUserBalanceMonitorsUseCase,
  RefreshTokenUsecase,
  LogoutUsecase,
  UsernameUsecase,
} from './application/domain/usecases';

// Controllers
import { AuthController, UserController } from './application/controllers';
import { DevController } from './application/controllers/dev.controller';

// Guards
import { JwtStrategy } from '../../common/guards';

// Other modules
import { WalletModule } from '../wallet/wallet.module';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('jwt.expiresIn') || '7d';
        return {
          secret: configService.get<string>('jwt.secret') || 'fallback-secret',
          signOptions: {
            expiresIn: expiresIn as '7d',
          },
        };
      },
    }),
    forwardRef(() => WalletModule),
    forwardRef(() => KycModule),
  ],
  controllers: [
    AuthController,
    UserController,
    // Conditionally register DevController only in non-production environments
    ...(process.env.NODE_ENV !== 'production' ? [DevController] : []),
  ],
  providers: [
    // Repository
    UserRepository,
    // Services
    OtpService,
    // Use Cases
    RegisterUserUsecase,
    VerifyOtpUsecase,
    LoginUserUsecase,
    UpdateProfileUsecase,
    CreateUserLedgerIdentityUseCase,
    SetupUserBalanceMonitorsUseCase,
    RefreshTokenUsecase,
    LogoutUsecase,
    UsernameUsecase,
    // Strategy
    JwtStrategy,
  ],
  exports: [UserRepository, JwtStrategy, PassportModule],
})
export class UserModule {}
