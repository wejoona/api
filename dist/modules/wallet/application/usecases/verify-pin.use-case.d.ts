import { Cache } from 'cache-manager';
import { UserRepository } from '../../../user/infrastructure/repositories';
export interface VerifyPinInput {
    userId: string;
    pin: string;
}
export interface VerifyPinOutput {
    valid: boolean;
    message: string;
    pinToken?: string;
    expiresIn?: number;
    remainingAttempts?: number;
    lockedUntil?: Date;
}
export declare class VerifyPinUseCase {
    private readonly userRepository;
    private readonly cacheManager;
    private readonly PIN_TOKEN_TTL;
    constructor(userRepository: UserRepository, cacheManager: Cache);
    execute(input: VerifyPinInput): Promise<VerifyPinOutput>;
}
