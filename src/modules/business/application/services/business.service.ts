import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { Business } from '../../domain/entities/business.entity';
import { CreateBusinessDto } from '../dto/create-business.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly businessRepository: BusinessRepository) {}

  async createBusiness(
    userId: string,
    dto: CreateBusinessDto,
  ): Promise<Business> {
    // Check if user already has a business
    const existing = await this.businessRepository.findByUserId(userId);
    if (existing) {
      throw new ConflictException('User already has a business account');
    }

    // Check if registration number is already used
    const existingByRegNum =
      await this.businessRepository.findByRegistrationNumber(
        dto.registrationNumber,
      );
    if (existingByRegNum) {
      throw new ConflictException('Registration number already exists');
    }

    // Create business
    const business = Business.create({
      userId,
      name: dto.name,
      registrationNumber: dto.registrationNumber,
      industry: dto.industry,
      address: dto.address,
      city: dto.city,
      country: dto.country,
      phone: dto.phone,
      email: dto.email,
    });

    return this.businessRepository.save(business);
  }

  async getBusinessByUserId(userId: string): Promise<Business | null> {
    return this.businessRepository.findByUserId(userId);
  }

  async getBusinessById(id: string): Promise<Business> {
    const business = await this.businessRepository.findById(id);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  async updateBusiness(
    userId: string,
    dto: UpdateBusinessDto,
  ): Promise<Business> {
    const business = await this.businessRepository.findByUserId(userId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check registration number uniqueness if being updated
    if (
      dto.registrationNumber &&
      dto.registrationNumber !== business.registrationNumber
    ) {
      const existingByRegNum =
        await this.businessRepository.findByRegistrationNumber(
          dto.registrationNumber,
        );
      if (existingByRegNum) {
        throw new ConflictException('Registration number already exists');
      }
    }

    // Update business
    if (dto.name) {
      business.updateName(dto.name);
    }

    business.updateDetails({
      registrationNumber: dto.registrationNumber,
      industry: dto.industry,
      address: dto.address,
      city: dto.city,
      country: dto.country,
      phone: dto.phone,
      email: dto.email,
    });

    return this.businessRepository.save(business);
  }

  async approveBusiness(id: string): Promise<Business> {
    const business = await this.getBusinessById(id);

    if (business.isApproved) {
      throw new BadRequestException('Business is already approved');
    }

    business.approve();
    return this.businessRepository.save(business);
  }

  async rejectBusiness(id: string): Promise<Business> {
    const business = await this.getBusinessById(id);

    if (business.isRejected) {
      throw new BadRequestException('Business is already rejected');
    }

    business.reject();
    return this.businessRepository.save(business);
  }
}
