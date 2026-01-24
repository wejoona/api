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
} from './application/domain/usecases';

// Controllers
import { AuthController, UserController } from './application/controllers';

// Guards
import { JwtStrategy } from '../../common/guards';

// Other modules
import { WalletModule } from '../wallet/wallet.module';

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
  ],
  controllers: [AuthController, UserController],
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
    // Strategy
    JwtStrategy,
  ],
  exports: [UserRepository, JwtStrategy, PassportModule],
})
export class UserModule {}
