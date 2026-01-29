import { AuthenticatedRequest } from '../../../../common/guards';
import { RegisterUserDto, VerifyOtpDto, LoginUserDto, UpdateProfileDto, RefreshTokenDto, LogoutDto, LogoutAllDto, SearchUsernameDto } from '../dto/requests';
import { UserResponse, AuthResponse, OtpSentResponse, RefreshResponse, LogoutResponse, LogoutAllResponse, CheckUsernameResponse, SearchUsernameResponse, UserLimitsResponse } from '../dto/responses';
import { RegisterUserUsecase, VerifyOtpUsecase, LoginUserUsecase, UpdateProfileUsecase, RefreshTokenUsecase, LogoutUsecase, LogoutAllUsecase, UsernameUsecase, GetUserLimitsUseCase } from '../domain/usecases';
export declare class AuthController {
    private readonly registerUserUsecase;
    private readonly verifyOtpUsecase;
    private readonly loginUserUsecase;
    private readonly refreshTokenUsecase;
    private readonly logoutUsecase;
    private readonly logoutAllUsecase;
    constructor(registerUserUsecase: RegisterUserUsecase, verifyOtpUsecase: VerifyOtpUsecase, loginUserUsecase: LoginUserUsecase, refreshTokenUsecase: RefreshTokenUsecase, logoutUsecase: LogoutUsecase, logoutAllUsecase: LogoutAllUsecase);
    register(dto: RegisterUserDto): Promise<OtpSentResponse>;
    verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse>;
    refreshToken(dto: RefreshTokenDto): Promise<RefreshResponse>;
    login(dto: LoginUserDto): Promise<OtpSentResponse>;
    logout(req: AuthenticatedRequest, dto: LogoutDto): Promise<LogoutResponse>;
    logoutAll(req: AuthenticatedRequest, dto: LogoutAllDto): Promise<LogoutAllResponse>;
}
export declare class UserController {
    private readonly updateProfileUsecase;
    private readonly usernameUsecase;
    private readonly getUserLimitsUseCase;
    constructor(updateProfileUsecase: UpdateProfileUsecase, usernameUsecase: UsernameUsecase, getUserLimitsUseCase: GetUserLimitsUseCase);
    getProfile(req: AuthenticatedRequest): Promise<UserResponse>;
    updateProfile(req: AuthenticatedRequest, dto: UpdateProfileDto): Promise<UserResponse>;
    checkUsername(username: string): Promise<CheckUsernameResponse>;
    searchUsername(dto: SearchUsernameDto): Promise<SearchUsernameResponse>;
    findByUsername(username: string): Promise<UserResponse>;
    getLimits(req: AuthenticatedRequest): Promise<UserLimitsResponse>;
}
