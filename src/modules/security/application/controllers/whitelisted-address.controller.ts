import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import {
  CreateWhitelistedAddressDto,
  VerifyWhitelistedAddressDto,
  UpdateWhitelistedAddressDto,
  WhitelistedAddressResponse,
  WhitelistedAddressListResponse,
  CheckAddressResponse,
} from '../dto';
import { WhitelistedAddressService } from '../services';

@ApiTags('Security - Address Whitelist')
@Controller('security/addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WhitelistedAddressController {
  constructor(
    private readonly whitelistedAddressService: WhitelistedAddressService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new address to whitelist' })
  @ApiResponse({ status: 201, type: WhitelistedAddressResponse })
  @ApiResponse({ status: 409, description: 'Address already whitelisted' })
  async addAddress(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateWhitelistedAddressDto,
  ): Promise<WhitelistedAddressResponse> {
    const address = await this.whitelistedAddressService.addAddress({
      userId: req.user.id,
      address: dto.address,
      label: dto.label,
      addressType: dto.addressType,
      network: dto.network,
    });

    return WhitelistedAddressResponse.fromDomain(address);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a whitelisted address with PIN' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, type: WhitelistedAddressResponse })
  @ApiResponse({
    status: 400,
    description: 'Address already verified or PIN not set',
  })
  @ApiResponse({ status: 403, description: 'Invalid PIN or account locked' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async verifyAddress(
    @Request() req: AuthenticatedRequest,
    @Param('id') addressId: string,
    @Body() dto: VerifyWhitelistedAddressDto,
  ): Promise<WhitelistedAddressResponse> {
    const address = await this.whitelistedAddressService.verifyAddress({
      addressId,
      userId: req.user.id,
      pin: dto.pin,
    });

    return WhitelistedAddressResponse.fromDomain(address);
  }

  @Get()
  @ApiOperation({ summary: 'Get all whitelisted addresses' })
  @ApiResponse({ status: 200, type: WhitelistedAddressListResponse })
  async getAddresses(
    @Request() req: AuthenticatedRequest,
  ): Promise<WhitelistedAddressListResponse> {
    const addresses = await this.whitelistedAddressService.getAddresses(
      req.user.id,
    );
    return WhitelistedAddressListResponse.fromDomain(addresses);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active (verified) whitelisted addresses' })
  @ApiResponse({ status: 200, type: WhitelistedAddressListResponse })
  async getActiveAddresses(
    @Request() req: AuthenticatedRequest,
  ): Promise<WhitelistedAddressListResponse> {
    const addresses = await this.whitelistedAddressService.getActiveAddresses(
      req.user.id,
    );
    return WhitelistedAddressListResponse.fromDomain(addresses);
  }

  @Get('check')
  @ApiOperation({
    summary: 'Check if an address is whitelisted and what restrictions apply',
  })
  @ApiResponse({ status: 200, type: CheckAddressResponse })
  async checkAddress(
    @Request() req: AuthenticatedRequest,
    @Query('address') address: string,
  ): Promise<CheckAddressResponse> {
    return this.whitelistedAddressService.checkAddress(req.user.id, address);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific whitelisted address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, type: WhitelistedAddressResponse })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async getAddress(
    @Request() req: AuthenticatedRequest,
    @Param('id') addressId: string,
  ): Promise<WhitelistedAddressResponse> {
    const address = await this.whitelistedAddressService.getAddressById(
      addressId,
      req.user.id,
    );
    return WhitelistedAddressResponse.fromDomain(address);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a whitelisted address label' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, type: WhitelistedAddressResponse })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async updateAddress(
    @Request() req: AuthenticatedRequest,
    @Param('id') addressId: string,
    @Body() dto: UpdateWhitelistedAddressDto,
  ): Promise<WhitelistedAddressResponse> {
    const address = await this.whitelistedAddressService.updateLabel(
      addressId,
      req.user.id,
      dto.label,
    );
    return WhitelistedAddressResponse.fromDomain(address);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a whitelisted address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address revoked' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async revokeAddress(
    @Request() req: AuthenticatedRequest,
    @Param('id') addressId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.whitelistedAddressService.revokeAddress(addressId, req.user.id);
    return { success: true, message: 'Address revoked successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a whitelisted address' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 204, description: 'Address deleted' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteAddress(
    @Request() req: AuthenticatedRequest,
    @Param('id') addressId: string,
  ): Promise<void> {
    await this.whitelistedAddressService.deleteAddress(addressId, req.user.id);
  }
}
