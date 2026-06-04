import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  HttpException,
  ServiceUnavailableException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../../../upload/application/services/upload.service';
import { UserRepository } from '../../infrastructure/repositories';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SensitiveEndpoint } from '../../../security/application/decorators/sensitive-endpoint.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
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
  UpdateLocaleDto,
  VerifyEmailDto,
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
  VerifyEmailUsecase,
  EmailStatusUsecase,
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
  async verifyOtp(@Body() dto: VerifyOtpDto, @Request() req): Promise<AuthResponse> {
    const result = await this.verifyOtpUsecase.execute({
      phone: dto.phone,
      otp: dto.otp,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
      deviceId: req.headers?.['x-device-id'],
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
      user: UserResponse.fromDomain(result.user),
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
    private readonly verifyEmailUsecase: VerifyEmailUsecase,
    private readonly emailStatusUsecase: EmailStatusUsecase,
    @Inject(forwardRef(() => UploadService))
    private readonly uploadService: UploadService,
    private readonly userRepository: UserRepository,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserResponse })
  async getProfile(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserResponse> {
    try {
      const result = await this.getProfileUsecase.execute({
        userId: req.user.id,
      });

      return UserResponse.fromDomain(result.user, result.kycRejectionReason);
    } catch (error) {
      this.throwProfileDependencyUnavailable(error);
    }
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, type: UserResponse })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    try {
      const user = await this.updateProfileUsecase.execute({
        userId: req.user.id,
        username: dto.username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
      });

      return UserResponse.fromDomain(user);
    } catch (error) {
      this.throwProfileDependencyUnavailable(error);
    }
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    let result;
    try {
      result = await this.uploadService.uploadAvatar({
        userId: req.user.id,
        file,
      });
    } catch (error) {
      this.throwAvatarStorageUnavailable(error);
    }

    // Generate a small base64 thumbnail (64x64) for DB storage — no MinIO dependency
    let thumbBase64: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require('sharp');
      const thumbBuffer = await sharp(file.buffer)
        .resize(64, 64, { fit: 'cover' })
        .jpeg({ quality: 60 })
        .toBuffer();
      thumbBase64 = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;
    } catch {
      // Thumbnail generation failed (sharp not available) — proceed without it
    }

    // Store relative API URL + base64 thumb in DB
    const avatarApiUrl = `/user/avatar/${req.user.id}`;
    try {
      const user = await this.userRepository.findById(req.user.id);
      if (!user) throw new BadRequestException('User not found');
      user.updateAvatar(avatarApiUrl, thumbBase64);
      await this.userRepository.save(user);
    } catch (error) {
      this.throwProfileDependencyUnavailable(error);
    }

    return {
      avatarUrl: avatarApiUrl,
      avatarThumb: thumbBase64,
      message: 'Avatar uploaded successfully',
    };
  }

  @Put('locale')
  @ApiOperation({ summary: 'Update preferred locale' })
  @ApiResponse({ status: 200, description: 'Locale updated' })
  async updateLocale(
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateLocaleDto,
  ) {
    try {
      const user = await this.userRepository.findById(req.user.id);
      if (!user) throw new BadRequestException('User not found');
      user.updateLocale(body.locale);
      await this.userRepository.save(user);
      return { locale: user.preferredLocale, message: 'Locale updated' };
    } catch (error) {
      this.throwProfileDependencyUnavailable(error);
    }
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Remove user avatar' })
  @ApiResponse({ status: 200, description: 'Avatar removed' })
  async removeAvatar(@Request() req: AuthenticatedRequest) {
    try {
      const user = await this.userRepository.findById(req.user.id);
      if (!user) throw new BadRequestException('User not found');
      user.updateAvatar(null);
      await this.userRepository.save(user);
      return { message: 'Avatar removed successfully' };
    } catch (error) {
      this.throwProfileDependencyUnavailable(error);
    }
  }

  @Public()
  @Get('avatar/:userId')
  @ApiOperation({ summary: 'Get user avatar image (proxy from storage)' })
  @ApiResponse({ status: 200, description: 'Avatar image' })
  @ApiResponse({ status: 404, description: 'No avatar' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getAvatar(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const key = `${userId}/avatar.jpg`;
      const buffer = await this.uploadService.getFileBuffer(key);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      });
      res.send(buffer);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === 400) {
        throw new NotFoundException('Avatar not found');
      }
      this.throwAvatarStorageUnavailable(error);
    }
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate user account (soft delete)' })
  @ApiResponse({ status: 200, description: 'Account deactivated' })
  async deactivateAccount(@Request() req: AuthenticatedRequest) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user) throw new BadRequestException('User not found');
    user.status = 'suspended' as any;
    user.suspendedAt = new Date();
    user.suspendedReason = 'User-initiated deactivation';
    await this.userRepository.save(user);
    return { message: 'Account deactivated. Contact support to reactivate.' };
  }

  @Get('data-export')
  @ApiOperation({ summary: 'Export all user data (GDPR compliance)' })
  @ApiResponse({ status: 200, description: 'Full user data export' })
  async exportUserData(@Request() req: AuthenticatedRequest) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user) throw new BadRequestException('User not found');
    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        countryCode: user.countryCode,
        preferredLocale: user.preferredLocale,
        kycStatus: user.kycStatus,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by phone or username' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchUsers(
    @Query('q') query: string,
  ) {
    if (!query || query.length < 2) {
      return { users: [] };
    }
    // DB-level search (indexed, no full table scan)
    const users = await this.userRepository.search(query, 20);
    const results = users.map((u: any) => ({
      id: u.id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone ? u.phone.substring(0, 6) + '****' : null,
      avatarUrl: u.avatarUrl,
    }));
    return { users: results, total: results.length };
  }

  private throwProfileDependencyUnavailable(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new ServiceUnavailableException({
      code: 'PROFILE_DEPENDENCY_UNAVAILABLE',
      message: 'Profile is temporarily unavailable. Please try again later.',
      dependency: 'user_profile_store',
      retryable: true,
      supportReviewRequired: false,
    });
  }

  private throwAvatarStorageUnavailable(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new ServiceUnavailableException({
      code: 'AVATAR_STORAGE_UNAVAILABLE',
      message:
        'Profile photo storage is temporarily unavailable. Please try again later.',
      dependency: 'avatar_storage',
      retryable: true,
      supportReviewRequired: false,
    });
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
  // EMAIL VERIFICATION ENDPOINTS
  // ============================================

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with 6-digit code' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyEmail(
    @Request() req: AuthenticatedRequest,
    @Body() dto: VerifyEmailDto,
  ) {
    return this.verifyEmailUsecase.execute({
      userId: req.user.id,
      code: dto.code,
    });
  }

  @Get('email-status')
  @ApiOperation({ summary: 'Get email verification status' })
  @ApiResponse({ status: 200, description: 'Email status returned' })
  async getEmailStatus(@Request() req: AuthenticatedRequest) {
    return this.emailStatusUsecase.execute({ userId: req.user.id });
  }

  // ============================================
  // PIN ENDPOINTS
  // ============================================

  @Post('pin/set')
  @SensitiveEndpoint()
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
  @SensitiveEndpoint()
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
  @SensitiveEndpoint()
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
  @SensitiveEndpoint()
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
