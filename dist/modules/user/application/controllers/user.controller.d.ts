import { AuthenticatedRequest } from '../../../../common/guards';
import { RegisterUserDto, VerifyOtpDto, LoginUserDto, UpdateProfileDto, RefreshTokenDto, LogoutDto } from '../dto/requests';
import { UserResponse, AuthResponse, OtpSentResponse, RefreshResponse, LogoutResponse } from '../dto/responses';
import { RegisterUserUsecase, VerifyOtpUsecase, LoginUserUsecase, UpdateProfileUsecase, RefreshTokenUsecase, LogoutUsecase } from '../domain/usecases';
export declare class AuthController {
    private readonly registerUserUsecase;
    private readonly verifyOtpUsecase;
    private readonly loginUserUsecase;
    private readonly refreshTokenUsecase;
    private readonly logoutUsecase;
    constructor(registerUserUsecase: RegisterUserUsecase, verifyOtpUsecase: VerifyOtpUsecase, loginUserUsecase: LoginUserUsecase, refreshTokenUsecase: RefreshTokenUsecase, logoutUsecase: LogoutUsecase);
    register(dto: RegisterUserDto): Promise<OtpSentResponse>;
    verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse>;
    refreshToken(dto: RefreshTokenDto): Promise<RefreshResponse>;
    login(dto: LoginUserDto): Promise<OtpSentResponse>;
    logout(req: AuthenticatedRequest, dto: LogoutDto): Promise<LogoutResponse>;
}
export declare class UserController {
    private readonly updateProfileUsecase;
    constructor(updateProfileUsecase: UpdateProfileUsecase);
    getProfile(req: AuthenticatedRequest): Promise<UserResponse>;
    updateProfile(req: AuthenticatedRequest, dto: UpdateProfileDto): Promise<UserResponse>;
}
