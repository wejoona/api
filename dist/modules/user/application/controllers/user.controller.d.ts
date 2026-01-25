import { AuthenticatedRequest } from '../../../../common/guards';
import { RegisterUserDto, VerifyOtpDto, LoginUserDto, UpdateProfileDto, RefreshTokenDto, LogoutDto, SearchUsernameDto } from '../dto/requests';
import { UserResponse, AuthResponse, OtpSentResponse, RefreshResponse, LogoutResponse, CheckUsernameResponse, SearchUsernameResponse } from '../dto/responses';
import { RegisterUserUsecase, VerifyOtpUsecase, LoginUserUsecase, UpdateProfileUsecase, RefreshTokenUsecase, LogoutUsecase, UsernameUsecase } from '../domain/usecases';
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
    private readonly usernameUsecase;
    constructor(updateProfileUsecase: UpdateProfileUsecase, usernameUsecase: UsernameUsecase);
    getProfile(req: AuthenticatedRequest): Promise<UserResponse>;
    updateProfile(req: AuthenticatedRequest, dto: UpdateProfileDto): Promise<UserResponse>;
    checkUsername(username: string): Promise<CheckUsernameResponse>;
    searchUsername(dto: SearchUsernameDto): Promise<SearchUsernameResponse>;
    findByUsername(username: string): Promise<UserResponse>;
}
