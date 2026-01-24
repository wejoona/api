import { UserRepository } from '../../../user/infrastructure/repositories';
export interface VerifyPinInput {
    userId: string;
    pin: string;
}
export interface VerifyPinOutput {
    valid: boolean;
    message: string;
    remainingAttempts?: number;
    lockedUntil?: Date;
}
export declare class VerifyPinUseCase {
    private readonly userRepository;
    constructor(userRepository: UserRepository);
    execute(input: VerifyPinInput): Promise<VerifyPinOutput>;
}
