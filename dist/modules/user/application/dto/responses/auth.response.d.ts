import { UserResponse } from './user.response';
export declare class AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
    walletCreated?: boolean;
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
