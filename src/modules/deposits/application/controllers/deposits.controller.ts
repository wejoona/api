import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { DepositService } from '../domain/services/deposit.service';
import { InitiateDepositDto } from '../dto/requests/initiate-deposit.dto';
import { ConfirmDepositDto } from '../dto/requests/confirm-deposit.dto';
import { DepositResponseDto, DepositProviderDto } from '../dto/responses/deposit-response.dto';

@ApiTags('Deposits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositService: DepositService) {}

  @Get('providers')
  @ApiOperation({ summary: 'List available deposit providers' })
  @ApiResponse({ status: 200, type: [DepositProviderDto] })
  async getProviders(): Promise<DepositProviderDto[]> {
    return this.depositService.getProviders();
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a deposit (mobile money → USDC)' })
  @ApiResponse({ status: 201, type: DepositResponseDto })
  async initiate(@CurrentUser() user: any, @Body() dto: InitiateDepositDto): Promise<DepositResponseDto> {
    return this.depositService.initiate(user.userId, dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a deposit (submit OTP or acknowledge push)' })
  @ApiResponse({ status: 200, type: DepositResponseDto })
  async confirm(@CurrentUser() user: any, @Body() dto: ConfirmDepositDto): Promise<DepositResponseDto> {
    return this.depositService.confirm(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deposit status' })
  @ApiResponse({ status: 200, type: DepositResponseDto })
  async getStatus(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string): Promise<DepositResponseDto> {
    return this.depositService.getStatus(user.userId, id);
  }
}
