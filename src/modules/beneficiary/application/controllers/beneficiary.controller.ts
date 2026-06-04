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
  BadRequestException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
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

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
@ApiTags('Beneficiaries')
@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BeneficiaryController {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  @Get()
  @ApiOperation({ summary: 'List beneficiaries with optional filters' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['internal', 'external', 'bank', 'mobile_money'],
    description: 'Filter by account type',
  })
  @ApiQuery({
    name: 'favorites',
    required: false,
    type: String,
    description: 'Set to "true" to get favorites only',
  })
  @ApiQuery({
    name: 'recent',
    required: false,
    type: String,
    description: 'Set to "true" to get recently used',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (used with recent)',
  })
  @ApiResponse({ status: 200, description: 'List of beneficiaries' })
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
  @ApiOperation({ summary: 'Get a specific beneficiary' })
  @ApiParam({ name: 'id', description: 'Beneficiary UUID' })
  @ApiResponse({ status: 200, description: 'Beneficiary details' })
  @ApiResponse({ status: 404, description: 'Beneficiary not found' })
  async getBeneficiary(
    @Param('id', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<BeneficiaryResponse> {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new beneficiary' })
  @ApiResponse({ status: 201, description: 'Beneficiary created' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 409, description: 'Duplicate beneficiary' })
  async createBeneficiary(
    @Body() dto: CreateBeneficiaryDto,
    @CurrentUser() user: UserPayload,
  ): Promise<BeneficiaryResponse> {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
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
  @ApiOperation({ summary: 'Update a beneficiary' })
  @ApiParam({ name: 'id', description: 'Beneficiary UUID' })
  @ApiResponse({ status: 200, description: 'Beneficiary updated' })
  @ApiResponse({ status: 404, description: 'Beneficiary not found' })
  async updateBeneficiary(
    @Param('id', ParseUUIDPipe) beneficiaryId: string,
    @Body() dto: UpdateBeneficiaryDto,
    @CurrentUser() user: UserPayload,
  ): Promise<
    BeneficiaryResponse & {
      success: boolean;
      message: string;
      beneficiary: BeneficiaryResponse;
      data: BeneficiaryResponse;
    }
  > {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
    }

    const beneficiary = await this.beneficiaryService.updateBeneficiary(
      walletId,
      beneficiaryId,
      dto,
    );
    const response = this.toResponse(beneficiary);
    return {
      ...response,
      success: true,
      message: 'Beneficiary updated successfully',
      beneficiary: response,
      data: response,
    };
  }

  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle beneficiary favorite status' })
  @ApiParam({ name: 'id', description: 'Beneficiary UUID' })
  @ApiResponse({ status: 200, description: 'Favorite toggled' })
  @ApiResponse({ status: 404, description: 'Beneficiary not found' })
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<
    BeneficiaryResponse & {
      success: boolean;
      isFavorite: boolean;
      beneficiary: BeneficiaryResponse;
      data: BeneficiaryResponse;
    }
  > {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
    }

    const beneficiary = await this.beneficiaryService.toggleFavorite(
      walletId,
      beneficiaryId,
    );
    const response = this.toResponse(beneficiary);
    return {
      ...response,
      success: true,
      isFavorite: beneficiary.isFavorite,
      beneficiary: response,
      data: response,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a beneficiary' })
  @ApiParam({ name: 'id', description: 'Beneficiary UUID' })
  @ApiResponse({ status: 200, description: 'Beneficiary deleted' })
  @ApiResponse({ status: 404, description: 'Beneficiary not found' })
  async deleteBeneficiary(
    @Param('id', ParseUUIDPipe) beneficiaryId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    const walletId = user.walletId;
    if (!walletId) {
      throw new BadRequestException('User has no wallet');
    }

    await this.beneficiaryService.deleteBeneficiary(walletId, beneficiaryId);
    return { success: true, message: 'Beneficiary deleted successfully' };
  }

  private toResponse(beneficiary: any): BeneficiaryResponse {
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
}
