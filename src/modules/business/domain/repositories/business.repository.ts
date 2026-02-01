import { Business } from '../entities/business.entity';

export abstract class BusinessRepository {
  abstract findById(id: string): Promise<Business | null>;
  abstract findByUserId(userId: string): Promise<Business | null>;
  abstract findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<Business | null>;
  abstract save(business: Business): Promise<Business>;
  abstract delete(id: string): Promise<void>;
}
