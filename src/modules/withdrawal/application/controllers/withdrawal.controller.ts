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
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { PinVerificationGuard } from '../../../../common/guards/pin-verification.guard';
import { Idempotent, IdempotencyGuard } from '../../../../common/middleware/idempotency';
import { WithdrawalService } from '../services/withdrawal.service';
import { InitiateWithdrawalDto } from '../dto/initiate-withdrawal.dto';
import { WithdrawalResponseDto } from '../dto/withdrawal-response.dto';

@ApiTags('Withdrawals')
@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PinVerificationGuard, IdempotencyGuard)
  @Idempotent({ required: true })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Initiate a withdrawal to MoMo',
    description: 'Debits USDC from wallet and sends fiat payout via mobile money provider. Requires PIN verification.',
  })
  @ApiHeader({
    name: 'X-Pin-Token',
    description: 'PIN verification token from POST /user/pin/verify',
    required: true,
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Unique key to prevent duplicate withdrawal requests (UUID)',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal initiated successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'PIN verification required or expired' })
  @ApiResponse({ status: 422, description: 'Withdrawal amount exceeds daily limit' })
  @ApiResponse({ status: 429, description: 'Too many withdrawal attempts' })
  async initiateWithdrawal(
    @Request() req: AuthenticatedRequest,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    dto: InitiateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    return this.withdrawalService.initiateWithdrawal(req.user.id, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get withdrawal status',
    description: 'Returns the current status of a withdrawal',
  })
  @ApiParam({ name: 'id', description: 'Withdrawal ID' })
  @ApiResponse({ status: 200, type: WithdrawalResponseDto })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async getWithdrawal(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<WithdrawalResponseDto> {
    return this.withdrawalService.getWithdrawal(id, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List user withdrawals',
    description: 'Returns paginated list of user withdrawals with optional status filter',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'processing', 'completed', 'failed'], description: 'Filter by status' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of results to skip' })
  @ApiResponse({ status: 200, description: 'Paginated list of withdrawals' })
  async listWithdrawals(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ withdrawals: WithdrawalResponseDto[]; total: number; hasMore: boolean }> {
    const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
    return this.withdrawalService.listWithdrawals({
      userId: req.user.id,
      status: status as any,
      limit: safeLimit,
      offset: Math.max(offset || 0, 0),
    });
  }
}
