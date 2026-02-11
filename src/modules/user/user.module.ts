import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadModule } from '../upload/upload.module';

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
  GetProfileUsecase,
  CreateUserLedgerIdentityUseCase,
  SetupUserBalanceMonitorsUseCase,
  RefreshTokenUsecase,
  LogoutUsecase,
  LogoutAllUsecase,
  UsernameUsecase,
  GetUserLimitsUseCase,
  SetPinUsecase,
  ChangePinUsecase,
  VerifyPinUsecase,
  ResetPinUsecase,
} from './application/domain/usecases';

// Controllers
import { AuthController, UserController } from './application/controllers';
import { DevController } from './application/controllers/dev.controller';

// Guards
import { JwtStrategy } from '../../common/guards';

// Listeners
import { UserRegisteredListener } from './application/listeners/user-registered.listener';

// Other modules
import { WalletModule } from '../wallet/wallet.module';
import { KycModule } from '../kyc/kyc.module';
import { TransactionModule } from '../transaction/transaction.module';

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
    forwardRef(() => TransactionModule),
    forwardRef(() => UploadModule),
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
    GetProfileUsecase,
    CreateUserLedgerIdentityUseCase,
    SetupUserBalanceMonitorsUseCase,
    RefreshTokenUsecase,
    LogoutUsecase,
    LogoutAllUsecase,
    UsernameUsecase,
    GetUserLimitsUseCase,
    SetPinUsecase,
    ChangePinUsecase,
    VerifyPinUsecase,
    ResetPinUsecase,
    // Listeners
    UserRegisteredListener,
    // Strategy
    JwtStrategy,
  ],
  exports: [UserRepository, JwtStrategy, PassportModule],
})
export class UserModule {}
