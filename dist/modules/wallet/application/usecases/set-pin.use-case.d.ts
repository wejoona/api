import { UserRepository } from '../../../user/infrastructure/repositories';
export interface SetPinInput {
    userId: string;
    pin: string;
    confirmPin: string;
}
export interface SetPinOutput {
    success: boolean;
    message: string;
}
export declare class SetPinUseCase {
    private readonly userRepository;
    private readonly SALT_ROUNDS;
    constructor(userRepository: UserRepository);
    execute(input: SetPinInput): Promise<SetPinOutput>;
    private isWeakPin;
}
