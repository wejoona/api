import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/domain/entities/user.entity';
import { BusinessService } from '../services/business.service';
import { CreateBusinessDto } from '../dto/create-business.dto';
import { UpdateBusinessDto } from '../dto/update-business.dto';

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
@ApiTags('Business')
@Controller('business')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: User) {
    return this.businessService.getBusinessByUserId(user.id);
  }

  @Post('profile')
  async createOrUpdateProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateBusinessDto,
  ) {
    const existing = await this.businessService.getBusinessByUserId(user.id);

    if (existing) {
      return this.businessService.updateBusiness(user.id, dto);
    }

    return this.businessService.createBusiness(user.id, dto);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessService.updateBusiness(user.id, dto);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string) {
    return this.businessService.approveBusiness(id);
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string) {
    return this.businessService.rejectBusiness(id);
  }
}
