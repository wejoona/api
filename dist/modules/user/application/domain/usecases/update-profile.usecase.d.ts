import { User } from '../entities';
import { UserRepository } from '../../../infrastructure/repositories';
import { CacheInvalidationService } from '../../../../shared/infrastructure/services';
export interface UpdateProfileInput {
    userId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
}
export declare class UpdateProfileUsecase {
    private readonly userRepository;
    private readonly cacheInvalidationService;
    constructor(userRepository: UserRepository, cacheInvalidationService: CacheInvalidationService);
    execute(input: UpdateProfileInput): Promise<User>;
}
