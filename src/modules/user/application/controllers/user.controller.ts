import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Query,
  Param,
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
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import {
  RegisterUserDto,
  VerifyOtpDto,
  LoginUserDto,
  UpdateProfileDto,
  RefreshTokenDto,
  LogoutDto,
  LogoutAllDto,
  SearchUsernameDto,
  SetPinDto,
  ChangePinDto,
  VerifyPinDto,
  ResetPinDto,
} from '../dto/requests';
import {
  UserResponse,
  AuthResponse,
  OtpSentResponse,
  RefreshResponse,
  LogoutResponse,
  LogoutAllResponse,
  CheckUsernameResponse,
  SearchUsernameResponse,
  UserLimitsResponse,
  SetPinResponse,
  ChangePinResponse,
  VerifyPinResponse,
  ResetPinResponse,
} from '../dto/responses';
import {
  RegisterUserUsecase,
  VerifyOtpUsecase,
  LoginUserUsecase,
  UpdateProfileUsecase,
  GetProfileUsecase,
  RefreshTokenUsecase,
  LogoutUsecase,
  LogoutAllUsecase,
  UsernameUsecase,
  GetUserLimitsUseCase,
  SetPinUsecase,
  ChangePinUsecase,
  VerifyPinUsecase,
  ResetPinUsecase,
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
    private readonly logoutAllUsecase: LogoutAllUsecase,
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
      expiresIn: result.expiresIn,
      kycStatus: result.kycStatus,
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
      expiresIn: result.expiresIn,
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

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary: 'Logout from all devices',
    description:
      'Invalidate all refresh tokens for the user. Optionally preserve current session by providing currentRefreshToken.',
  })
  @ApiResponse({ status: 200, type: LogoutAllResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(
    @Request() req: AuthenticatedRequest,
    @Body() dto: LogoutAllDto,
  ): Promise<LogoutAllResponse> {
    const result = await this.logoutAllUsecase.execute({
      userId: req.user.id,
      currentRefreshToken: dto.currentRefreshToken,
    });

    return {
      success: result.success,
      message: result.message,
      sessionsInvalidated: result.sessionsInvalidated,
    };
  }
}

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly getProfileUsecase: GetProfileUsecase,
    private readonly updateProfileUsecase: UpdateProfileUsecase,
    private readonly usernameUsecase: UsernameUsecase,
    private readonly getUserLimitsUseCase: GetUserLimitsUseCase,
    private readonly setPinUsecase: SetPinUsecase,
    private readonly changePinUsecase: ChangePinUsecase,
    private readonly verifyPinUsecase: VerifyPinUsecase,
    private readonly resetPinUsecase: ResetPinUsecase,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserResponse })
  async getProfile(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
    const result = await this.getProfileUsecase.execute({
      userId: req.user.id,
    });

    return UserResponse.fromDomain(result.user, result.kycRejectionReason);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, type: UserResponse })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    const user = await this.updateProfileUsecase.execute({
      userId: req.user.id,
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
    });

    return UserResponse.fromDomain(user);
  }

  @Get('username/check/:username')
  @ApiOperation({ summary: 'Check if username is available' })
  @ApiParam({ name: 'username', description: 'Username to check' })
  @ApiResponse({ status: 200, type: CheckUsernameResponse })
  async checkUsername(
    @Param('username') username: string,
  ): Promise<CheckUsernameResponse> {
    return this.usernameUsecase.checkAvailability({ username });
  }

  @Get('username/search')
  @ApiOperation({ summary: 'Search users by username' })
  @ApiResponse({ status: 200, type: SearchUsernameResponse })
  async searchUsername(
    @Query() dto: SearchUsernameDto,
  ): Promise<SearchUsernameResponse> {
    const users = await this.usernameUsecase.search({
      query: dto.query,
      limit: dto.limit,
    });

    return {
      users,
      count: users.length,
    };
  }

  @Get('by-username/:username')
  @ApiOperation({ summary: 'Find user by username' })
  @ApiParam({
    name: 'username',
    description: 'Username to find (with or without @)',
  })
  @ApiResponse({ status: 200, type: UserResponse })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByUsername(
    @Param('username') username: string,
  ): Promise<UserResponse> {
    const user = await this.usernameUsecase.findByUsername({ username });
    return UserResponse.fromDomain(user);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Get user transaction limits based on KYC status' })
  @ApiResponse({ status: 200, type: UserLimitsResponse })
  @ApiResponse({ status: 404, description: 'User or wallet not found' })
  async getLimits(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserLimitsResponse> {
    return this.getUserLimitsUseCase.execute({
      userId: req.user.id,
    });
  }

  // ============================================
  // PIN ENDPOINTS
  // ============================================

  @Post('pin/set')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary: 'Set initial PIN',
    description:
      'Set the user PIN for the first time. PIN must be SHA256 hashed on client side before sending.',
  })
  @ApiResponse({ status: 200, type: SetPinResponse })
  @ApiResponse({
    status: 400,
    description: 'PIN already set or invalid format',
  })
  async setPin(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SetPinDto,
  ): Promise<SetPinResponse> {
    const result = await this.setPinUsecase.execute({
      userId: req.user.id,
      pinHash: dto.pinHash,
    });

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('pin/change')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Change PIN',
    description:
      'Change the user PIN. Requires old PIN verification. Both PINs must be SHA256 hashed on client side.',
  })
  @ApiResponse({ status: 200, type: ChangePinResponse })
  @ApiResponse({
    status: 400,
    description: 'Invalid old PIN or PIN not set',
  })
  @ApiResponse({
    status: 403,
    description: 'PIN locked due to too many failed attempts',
  })
  async changePin(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ChangePinDto,
  ): Promise<ChangePinResponse> {
    const result = await this.changePinUsecase.execute({
      userId: req.user.id,
      oldPinHash: dto.oldPinHash,
      newPinHash: dto.newPinHash,
    });

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Post('pin/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'Verify PIN for sensitive operations',
    description:
      'Verify the user PIN and receive a time-limited token (5 minutes) for use in X-Pin-Token header for sensitive operations like transfers.',
  })
  @ApiResponse({ status: 200, type: VerifyPinResponse })
  @ApiResponse({
    status: 400,
    description: 'Invalid PIN or PIN not set',
  })
  @ApiResponse({
    status: 403,
    description: 'PIN locked due to too many failed attempts',
  })
  async verifyPin(
    @Request() req: AuthenticatedRequest,
    @Body() dto: VerifyPinDto,
  ): Promise<VerifyPinResponse> {
    const result = await this.verifyPinUsecase.execute({
      userId: req.user.id,
      pinHash: dto.pinHash,
    });

    return {
      verified: result.verified,
      pinToken: result.pinToken,
      expiresIn: result.expiresIn,
    };
  }

  @Post('pin/reset')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({
    summary: 'Reset PIN with OTP verification',
    description:
      'Reset the user PIN using OTP verification. User must request OTP first via login endpoint.',
  })
  @ApiResponse({ status: 200, type: ResetPinResponse })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or PIN format',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired OTP',
  })
  async resetPin(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ResetPinDto,
  ): Promise<ResetPinResponse> {
    const result = await this.resetPinUsecase.execute({
      userId: req.user.id,
      otp: dto.otp,
      newPinHash: dto.newPinHash,
    });

    return {
      success: result.success,
      message: result.message,
    };
  }
}
