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
  @UseGuards(IdempotencyGuard)
  @Idempotent({ required: true })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Initiate a withdrawal to MoMo',
    description: 'Debits USDC from wallet and sends fiat payout via mobile money provider',
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal initiated successfully',
    type: WithdrawalResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient balance' })
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
    description: 'Returns paginated list of user withdrawals',
  })
  async listWithdrawals(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ withdrawals: WithdrawalResponseDto[]; total: number; hasMore: boolean }> {
    return this.withdrawalService.listWithdrawals({
      userId: req.user.id,
      status: status as any,
      limit: limit || 20,
      offset: offset || 0,
    });
  }
}
