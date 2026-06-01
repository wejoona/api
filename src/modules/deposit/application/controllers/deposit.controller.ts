import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  Inject,
  forwardRef,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { Idempotent, IdempotencyGuard } from '../../../../common/middleware/idempotency';
import { DepositService } from '../services/deposit.service';
import { UserRepository } from '../../../user/infrastructure/repositories';
import { InitiateDepositDto } from '../dto/initiate-deposit.dto';
import { ConfirmDepositDto } from '../dto/confirm-deposit.dto';
import { InitiateDepositResponseDto, DepositStatusResponseDto, ProviderInfoDto } from '../dto/deposit-response.dto';
import { ListDepositsQueryDto } from '../dto/list-deposits-query.dto';

@ApiTags('Deposits')
@Controller('deposits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepositController {
  constructor(
    private readonly depositService: DepositService,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
  ) {}

  @Get('providers')
  @ApiOperation({
    summary: 'List available payment providers',
    description: 'Returns all available mobile money providers with their payment method types',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available providers',
    type: [ProviderInfoDto],
  })
  async getProviders(): Promise<ProviderInfoDto[]> {
    return this.depositService.getProviders();
  }

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(IdempotencyGuard)
  @Idempotent({ required: true })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Start a deposit',
    description: 'Initiates a mobile money deposit and returns payment instructions. Requires X-Idempotency-Key header.',
  })
  @ApiResponse({
    status: 201,
    description: 'Deposit initiated successfully',
    type: InitiateDepositResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Amount exceeds deposit limit for current KYC tier' })
  @ApiResponse({ status: 429, description: 'Too many deposit attempts' })
  async initiateDeposit(
    @Request() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) 
    dto: InitiateDepositDto,
  ): Promise<InitiateDepositResponseDto> {
    // Get user's phone number from profile for provider matching
    const user = await this.userRepository.findById(req.user.id);
    const userPhoneNumber = user?.phone;
    
    return this.depositService.initiateDeposit(req.user.id, dto, userPhoneNumber);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'Confirm deposit with OTP or trigger PUSH notification',
    description: 'Confirms a pending deposit using OTP (for Orange) or triggers status check (for MTN/Moov)',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit confirmation processed',
    type: DepositStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or OTP',
  })
  @ApiResponse({
    status: 404,
    description: 'Deposit not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Deposit already processed',
  })
  async confirmDeposit(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) 
    dto: ConfirmDepositDto,
  ): Promise<DepositStatusResponseDto> {
    return this.depositService.confirmDeposit(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get deposit status',
    description: 'Returns the current status of a deposit',
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Deposit ID',
    example: 'dep_12345678-1234-1234-1234-123456789012',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit status retrieved',
    type: DepositStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Deposit not found',
  })
  async getDeposit(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<DepositStatusResponseDto> {
    return this.depositService.getDeposit(id, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List user deposits',
    description: 'Returns paginated list of user deposits with optional status filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Deposits retrieved successfully',
    schema: {
      example: {
        deposits: [
          {
            id: 'dep_12345678-1234-1234-1234-123456789012',
            status: 'completed',
            amount: 6000,
            currency: 'XOF',
            providerCode: 'OMCI',
            paymentMethodType: 'OTP',
            createdAt: '2026-02-10T00:46:00.000Z',
            completedAt: '2026-02-10T00:51:00.000Z',
          },
        ],
        total: 5,
        hasMore: false,
      },
    },
  })
  async listDeposits(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListDepositsQueryDto,
  ): Promise<{ deposits: DepositStatusResponseDto[]; total: number; hasMore: boolean }> {
    return this.depositService.listDeposits({
      userId: req.user.id,
      status: query.status,
      limit: query.limit || 20,
      offset: query.offset || 0,
    });
  }

  // Webhook endpoint moved to DepositWebhookController (no JwtAuth, HMAC-verified)
  // Route: POST /webhooks/deposit/:providerCode
}
