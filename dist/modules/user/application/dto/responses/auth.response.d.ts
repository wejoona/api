import { UserResponse } from './user.response';
export declare class AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
    kycStatus?: string;
}
export declare class RefreshResponse {
    accessToken: string;
    refreshToken: string;
}
export declare class OtpSentResponse {
    success: boolean;
    message: string;
    expiresIn: number;
}
export declare class LogoutResponse {
    success: boolean;
    message: string;
}
export declare class LogoutAllResponse {
    success: boolean;
    message: string;
    sessionsInvalidated?: number;
}
