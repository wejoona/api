import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
export interface UpdateProfileInput {
    userId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}
export declare class UpdateProfileUsecase {
    private readonly userRepository;
    constructor(userRepository: UserRepository);
    execute(input: UpdateProfileInput): Promise<User>;
}
