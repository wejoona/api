import { AuthenticatedRequest } from '../../../../common/guards';
import { RegisterUserDto, VerifyOtpDto, LoginUserDto, UpdateProfileDto, RefreshTokenDto } from '../dto/requests';
import { UserResponse, AuthResponse, OtpSentResponse, RefreshResponse } from '../dto/responses';
import { RegisterUserUsecase, VerifyOtpUsecase, LoginUserUsecase, UpdateProfileUsecase, RefreshTokenUsecase } from '../domain/usecases';
export declare class AuthController {
    private readonly registerUserUsecase;
    private readonly verifyOtpUsecase;
    private readonly loginUserUsecase;
    private readonly refreshTokenUsecase;
    constructor(registerUserUsecase: RegisterUserUsecase, verifyOtpUsecase: VerifyOtpUsecase, loginUserUsecase: LoginUserUsecase, refreshTokenUsecase: RefreshTokenUsecase);
    register(dto: RegisterUserDto): Promise<OtpSentResponse>;
    verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse>;
    refreshToken(dto: RefreshTokenDto): Promise<RefreshResponse>;
    login(dto: LoginUserDto): Promise<OtpSentResponse>;
}
export declare class UserController {
    private readonly updateProfileUsecase;
    constructor(updateProfileUsecase: UpdateProfileUsecase);
    getProfile(req: AuthenticatedRequest): Promise<UserResponse>;
    updateProfile(req: AuthenticatedRequest, dto: UpdateProfileDto): Promise<UserResponse>;
}
