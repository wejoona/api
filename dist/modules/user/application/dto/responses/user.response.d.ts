import { User, KycStatus } from '../../domain/entities';
export declare class UserResponse {
    id: string;
    phone: string;
    phoneVerified: boolean;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    countryCode: string;
    kycStatus: KycStatus;
    canTransact: boolean;
    canWithdraw: boolean;
    createdAt: Date;
    static fromDomain(user: User): UserResponse;
}
