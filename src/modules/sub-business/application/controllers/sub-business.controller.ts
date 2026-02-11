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
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/domain/entities/user.entity';
import { SubBusinessService } from '../services/sub-business.service';
import { CreateSubBusinessDto } from '../dto/create-sub-business.dto';
import { UpdateSubBusinessDto } from '../dto/update-sub-business.dto';

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Sub-Business')
@Controller('sub-businesses')
@UseGuards(JwtAuthGuard)
export class SubBusinessController {
  constructor(private readonly subBusinessService: SubBusinessService) {}

  @Get()
  async getAll(@CurrentUser() _user: User) {
    // TODO: Get businessId from user's business
    // For now, this will need to be enhanced to fetch the business ID
    // from the business module based on the current user
    return [];
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateSubBusinessDto) {
    // TODO: Get businessId and walletId from request or user context
    // This is a simplified version. In production, you would:
    // 1. Get the user's business
    // 2. Create a new wallet for the sub-business
    // 3. Link them together
    throw new BadRequestException('Not implemented: requires business context');
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
