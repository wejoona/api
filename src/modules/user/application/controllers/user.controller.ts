import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import {
  RegisterUserDto,
  VerifyOtpDto,
  LoginUserDto,
  UpdateProfileDto,
  RefreshTokenDto,
  LogoutDto,
} from '../dto/requests';
import { UserResponse, AuthResponse, OtpSentResponse, RefreshResponse, LogoutResponse } from '../dto/responses';
import {
  RegisterUserUsecase,
  VerifyOtpUsecase,
  LoginUserUsecase,
  UpdateProfileUsecase,
  RefreshTokenUsecase,
  LogoutUsecase,
} from '../domain/usecases';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUsecase: RegisterUserUsecase,
    private readonly verifyOtpUsecase: VerifyOtpUsecase,
    private readonly loginUserUsecase: LoginUserUsecase,
    private readonly refreshTokenUsecase: RefreshTokenUsecase,
    private readonly logoutUsecase: LogoutUsecase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  // SECURITY: Strict rate limit to prevent account enumeration
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: OtpSentResponse })
  async register(@Body() dto: RegisterUserDto): Promise<OtpSentResponse> {
    const result = await this.registerUserUsecase.execute({
      phone: dto.phone,
      countryCode: dto.countryCode,
    });

    return {
      success: true,
      message: 'OTP sent successfully. Please verify your phone number.',
      expiresIn: result.otpExpiresIn,
    };
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  // SECURITY: Strict rate limit to prevent OTP brute force attacks (5 attempts per minute)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Verify OTP and get access token' })
  @ApiResponse({ status: 200, type: AuthResponse })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponse> {
    const result = await this.verifyOtpUsecase.execute({
      phone: dto.phone,
      otp: dto.otp,
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: UserResponse.fromDomain(result.user),
      walletCreated: result.walletCreated,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  // SECURITY: Rate limit token refresh to prevent abuse (10 per minute)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: RefreshResponse })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<RefreshResponse> {
    const result = await this.refreshTokenUsecase.execute({
      refreshToken: dto.refreshToken,
    });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  // SECURITY: Strict rate limit to prevent login brute force
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Request login OTP' })
  @ApiResponse({ status: 200, type: OtpSentResponse })
  async login(@Body() dto: LoginUserDto): Promise<OtpSentResponse> {
    const result = await this.loginUserUsecase.execute({
      phone: dto.phone,
    });

    return {
      success: result.success,
      message: 'OTP sent successfully',
      expiresIn: result.otpExpiresIn,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, type: LogoutResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @Request() req: AuthenticatedRequest,
    @Body() dto: LogoutDto,
  ): Promise<LogoutResponse> {
    const result = await this.logoutUsecase.execute({
      userId: req.user.id,
      refreshToken: dto.refreshToken,
    });

    return {
      success: result.success,
      message: result.message,
    };
  }
}

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly updateProfileUsecase: UpdateProfileUsecase) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserResponse })
  getProfile(@Request() req: AuthenticatedRequest): Promise<UserResponse> {
    // Note: req.user comes from JWT strategy which has JwtUser type
    // UserResponse.fromDomain expects a User domain entity, but for profile
    // we can create a partial response since we have id, phone from JWT
    return Promise.resolve(
      UserResponse.fromDomain(
        req.user as unknown as import('../domain/entities/user.entity').User,
      ),
    );
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, type: UserResponse })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    const user = await this.updateProfileUsecase.execute({
      userId: req.user.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
    });

    return UserResponse.fromDomain(user);
  }
}
