import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/domain/entities/user.entity';
import { SubBusinessService } from '../services/sub-business.service';
import { BusinessService } from '@/modules/business/application/services/business.service';
import { CreateSubBusinessDto } from '../dto/create-sub-business.dto';
import { UpdateSubBusinessDto } from '../dto/update-sub-business.dto';

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Sub-Business')
@Controller('sub-businesses')
@UseGuards(JwtAuthGuard)
export class SubBusinessController {
  constructor(
    private readonly subBusinessService: SubBusinessService,
    private readonly businessService: BusinessService,
  ) {}

  private async getBusinessIdForUser(userId: string): Promise<string> {
    const business = await this.businessService.getBusinessByUserId(userId);
    if (!business) {
      throw new NotFoundException(
        'No business profile found for current user. Please create a business profile first.',
      );
    }
    return business.id;
  }

  @Get()
  async getAll(@CurrentUser() user: User) {
    const businessId = await this.getBusinessIdForUser(user.id);
    return this.subBusinessService.getSubBusinessesByBusinessId(businessId);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateSubBusinessDto) {
    const businessId = await this.getBusinessIdForUser(user.id);

    if (!dto.walletId) {
      throw new BadRequestException(
        'walletId is required to create a sub-business',
      );
    }

    return this.subBusinessService.createSubBusiness(
      businessId,
      dto.walletId,
      dto,
    );
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.subBusinessService.getSubBusinessById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSubBusinessDto) {
    return this.subBusinessService.updateSubBusiness(id, dto);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.subBusinessService.activateSubBusiness(id);
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.subBusinessService.deactivateSubBusiness(id);
  }

  @Post(':id/suspend')
  async suspend(@Param('id') id: string) {
    return this.subBusinessService.suspendSubBusiness(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.subBusinessService.deleteSubBusiness(id);
    return { success: true };
  }
}
