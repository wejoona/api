import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import {
  BeneficiaryService,
  BeneficiaryResponse,
} from '../services/beneficiary.service';
import { CreateBeneficiaryDto } from '../dto/requests/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from '../dto/requests/update-beneficiary.dto';
import { BeneficiaryAccountType } from '../../domain/entities/beneficiary.entity';

interface UserPayload {
  id: string;
  phone: string;
  walletId?: string;
}

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Beneficiaries')
@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
export class BeneficiaryController {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  @Get()
  async getBeneficiaries(
    @CurrentUser() user: UserPayload,
    @Query('type') accountType?: BeneficiaryAccountType,
    @Query('favorites') favorites?: string,
    @Query('recent') recent?: string,
    @Query('limit') limit?: string,
  ): Promise<BeneficiaryResponse[]> {
    const walletId = user.walletId;
    if (!walletId) {
      return [];
    }

    if (favorites === 'true') {
      return this.beneficiaryService.getFavoriteBeneficiaries(walletId);
    }

    if (recent === 'true') {
      const recentLimit = limit ? parseInt(limit, 10) : 10;
      return this.beneficiaryService.getRecentBeneficiaries(
        walletId,
        recentLimit,
      );
    }

    if (accountType) {
      return this.beneficiaryService.getBeneficiariesByType(
        walletId,
        accountType,
      );
    }

    return this.beneficiaryService.getBeneficiaries(walletId);
  }

  @Get(':id')
  async getBeneficiary(
    @Param('id', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<BeneficiaryResponse> {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    const beneficiary = await this.beneficiaryService.getBeneficiary(
      walletId,
      beneficiaryId,
    );

    return {
      id: beneficiary.id,
      walletId: beneficiary.walletId,
      name: beneficiary.name,
      phoneE164: beneficiary.phoneE164,
      accountType: beneficiary.accountType,
      beneficiaryUserId: beneficiary.beneficiaryUserId,
      beneficiaryWalletAddress: beneficiary.beneficiaryWalletAddress,
      bankCode: beneficiary.bankCode,
      bankAccountNumber: beneficiary.bankAccountNumber,
      mobileMoneyProvider: beneficiary.mobileMoneyProvider,
      isFavorite: beneficiary.isFavorite,
      isVerified: beneficiary.isVerified,
      transferCount: beneficiary.transferCount,
      totalTransferred: beneficiary.totalTransferred,
      lastTransferAt: beneficiary.lastTransferAt,
      createdAt: beneficiary.createdAt,
    };
  }

  @Post()
  async createBeneficiary(
    @Body() dto: CreateBeneficiaryDto,
    @CurrentUser() user: UserPayload,
  ): Promise<BeneficiaryResponse> {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    const beneficiary = await this.beneficiaryService.createBeneficiary({
      walletId,
      ...dto,
    });

    return {
      id: beneficiary.id,
      walletId: beneficiary.walletId,
      name: beneficiary.name,
      phoneE164: beneficiary.phoneE164,
      accountType: beneficiary.accountType,
      beneficiaryUserId: beneficiary.beneficiaryUserId,
      beneficiaryWalletAddress: beneficiary.beneficiaryWalletAddress,
      bankCode: beneficiary.bankCode,
      bankAccountNumber: beneficiary.bankAccountNumber,
      mobileMoneyProvider: beneficiary.mobileMoneyProvider,
      isFavorite: beneficiary.isFavorite,
      isVerified: beneficiary.isVerified,
      transferCount: beneficiary.transferCount,
      totalTransferred: beneficiary.totalTransferred,
      lastTransferAt: beneficiary.lastTransferAt,
      createdAt: beneficiary.createdAt,
    };
  }

  @Put(':id')
  async updateBeneficiary(
    @Param('id', ParseUUIDPipe) beneficiaryId: string,
    @Body() dto: UpdateBeneficiaryDto,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    await this.beneficiaryService.updateBeneficiary(
      walletId,
      beneficiaryId,
      dto,
    );
    return { success: true, message: 'Beneficiary updated successfully' };
  }

  @Post(':id/favorite')
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; isFavorite: boolean }> {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    const beneficiary = await this.beneficiaryService.toggleFavorite(
      walletId,
      beneficiaryId,
    );
    return { success: true, isFavorite: beneficiary.isFavorite };
  }

  @Delete(':id')
  async deleteBeneficiary(
    @Param('id', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    const walletId = user.walletId;
    if (!walletId) {
      throw new Error('User has no wallet');
    }

    await this.beneficiaryService.deleteBeneficiary(walletId, beneficiaryId);
    return { success: true, message: 'Beneficiary deleted successfully' };
  }
}
