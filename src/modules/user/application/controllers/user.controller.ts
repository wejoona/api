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
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import {
  RegisterUserDto,
  VerifyOtpDto,
  LoginUserDto,
  UpdateProfileDto,
  RefreshTokenDto,
} from '../dto/requests';
import { UserResponse, AuthResponse, OtpSentResponse, RefreshResponse } from '../dto/responses';
import {
  RegisterUserUsecase,
  VerifyOtpUsecase,
  LoginUserUsecase,
  UpdateProfileUsecase,
  RefreshTokenUsecase,
} from '../domain/usecases';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUsecase: RegisterUserUsecase,
    private readonly verifyOtpUsecase: VerifyOtpUsecase,
    private readonly loginUserUsecase: LoginUserUsecase,
    private readonly refreshTokenUsecase: RefreshTokenUsecase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
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
