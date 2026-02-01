import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SubBusinessRepository } from '../../domain/repositories/sub-business.repository';
import { SubBusiness } from '../../domain/entities/sub-business.entity';
import { CreateSubBusinessDto } from '../dto/create-sub-business.dto';
import { UpdateSubBusinessDto } from '../dto/update-sub-business.dto';

@Injectable()
export class SubBusinessService {
  constructor(private readonly subBusinessRepository: SubBusinessRepository) {}

  async createSubBusiness(
    businessId: string,
    walletId: string,
    dto: CreateSubBusinessDto,
  ): Promise<SubBusiness> {
    // Check if wallet is already assigned to another sub-business
    const existing = await this.subBusinessRepository.findByWalletId(walletId);
    if (existing) {
      throw new ConflictException(
        'Wallet is already assigned to another sub-business',
      );
    }

    const subBusiness = SubBusiness.create({
      businessId,
      walletId,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      permissions: dto.permissions,
      spendingLimit: dto.spendingLimit,
    });

    return this.subBusinessRepository.save(subBusiness);
  }

  async getSubBusinessesByBusinessId(
    businessId: string,
  ): Promise<SubBusiness[]> {
    return this.subBusinessRepository.findByBusinessId(businessId);
  }

  async getSubBusinessById(id: string): Promise<SubBusiness> {
    const subBusiness = await this.subBusinessRepository.findById(id);
    if (!subBusiness) {
      throw new NotFoundException('Sub-business not found');
    }
    return subBusiness;
  }

  async updateSubBusiness(
    id: string,
    dto: UpdateSubBusinessDto,
  ): Promise<SubBusiness> {
    const subBusiness = await this.getSubBusinessById(id);

    if (dto.name) {
      subBusiness.updateName(dto.name);
    }

    if (dto.description !== undefined) {
      subBusiness.updateDescription(dto.description);
    }

    if (dto.type) {
      subBusiness.updateType(dto.type);
    }

    if (dto.permissions) {
      subBusiness.updatePermissions(dto.permissions);
    }

    if (dto.spendingLimit !== undefined) {
      subBusiness.updateSpendingLimit(dto.spendingLimit);
    }

    return this.subBusinessRepository.save(subBusiness);
  }

  async activateSubBusiness(id: string): Promise<SubBusiness> {
    const subBusiness = await this.getSubBusinessById(id);
    subBusiness.activate();
    return this.subBusinessRepository.save(subBusiness);
  }

  async deactivateSubBusiness(id: string): Promise<SubBusiness> {
    const subBusiness = await this.getSubBusinessById(id);
    subBusiness.deactivate();
    return this.subBusinessRepository.save(subBusiness);
  }

  async suspendSubBusiness(id: string): Promise<SubBusiness> {
    const subBusiness = await this.getSubBusinessById(id);
    subBusiness.suspend();
    return this.subBusinessRepository.save(subBusiness);
  }

  async deleteSubBusiness(id: string): Promise<void> {
    const subBusiness = await this.getSubBusinessById(id);
    await this.subBusinessRepository.delete(subBusiness.id);
  }
}
