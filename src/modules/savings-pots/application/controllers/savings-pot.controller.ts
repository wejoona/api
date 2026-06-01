import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PinVerificationGuard } from '../../../../common/guards/pin-verification.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { User } from '../../../user/domain/entities/user.entity';
import {
  CreateSavingsPotUseCase,
  GetSavingsPotsUseCase,
  UpdateSavingsPotUseCase,
  DepositToSavingsPotUseCase,
  WithdrawFromSavingsPotUseCase,
  CancelSavingsPotUseCase,
} from '../usecases';
import {
  CreateSavingsPotDto,
  UpdateSavingsPotDto,
  DepositToSavingsPotDto,
  WithdrawFromSavingsPotDto,
  SavingsPotResponseDto,
} from '../dtos';

@ApiTags('Savings Pots')
@Controller('savings-pots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SavingsPotController {
  constructor(
    private readonly createSavingsPotUseCase: CreateSavingsPotUseCase,
    private readonly getSavingsPotsUseCase: GetSavingsPotsUseCase,
    private readonly updateSavingsPotUseCase: UpdateSavingsPotUseCase,
    private readonly depositToSavingsPotUseCase: DepositToSavingsPotUseCase,
    private readonly withdrawFromSavingsPotUseCase: WithdrawFromSavingsPotUseCase,
    private readonly cancelSavingsPotUseCase: CancelSavingsPotUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new savings pot' })
  @ApiResponse({ status: 201, description: 'Savings pot created successfully' })
  async create(
    @Body() dto: CreateSavingsPotDto,
    @CurrentUser() user: User,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.createSavingsPotUseCase.execute(dto, user.id);
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Get()
  @ApiOperation({ summary: 'Get all savings pots for current user' })
  @ApiResponse({ status: 200, description: 'Returns all savings pots' })
  async getAll(@CurrentUser() user: User): Promise<SavingsPotResponseDto[]> {
    const savingsPots = await this.getSavingsPotsUseCase.execute(user.id);
    return savingsPots.map(SavingsPotResponseDto.fromEntity);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active savings pots for current user' })
  @ApiResponse({ status: 200, description: 'Returns active savings pots' })
  async getActive(@CurrentUser() user: User): Promise<SavingsPotResponseDto[]> {
    const savingsPots = await this.getSavingsPotsUseCase.executeActive(user.id);
    return savingsPots.map(SavingsPotResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific savings pot by ID' })
  @ApiParam({ name: 'id', description: 'Savings pot UUID' })
  @ApiResponse({ status: 200, description: 'Returns the savings pot' })
  @ApiResponse({ status: 404, description: 'Savings pot not found' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.getSavingsPotsUseCase.executeOne(id, user.id);
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a savings pot' })
  @ApiParam({ name: 'id', description: 'Savings pot UUID' })
  @ApiResponse({ status: 200, description: 'Savings pot updated successfully' })
  @ApiResponse({ status: 404, description: 'Savings pot not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavingsPotDto,
    @CurrentUser() user: User,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.updateSavingsPotUseCase.execute(
      id,
      dto,
      user.id,
    );
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Post(':id/deposit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PinVerificationGuard)
  @ApiOperation({ summary: 'Deposit funds to a savings pot' })
  @ApiParam({ name: 'id', description: 'Savings pot UUID' })
  @ApiResponse({ status: 200, description: 'Deposit successful' })
  @ApiResponse({ status: 404, description: 'Savings pot not found' })
  async deposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DepositToSavingsPotDto,
    @CurrentUser() user: User,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.depositToSavingsPotUseCase.execute(
      id,
      dto,
      user.id,
    );
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PinVerificationGuard)
  @ApiOperation({ summary: 'Withdraw funds from a savings pot' })
  @ApiParam({ name: 'id', description: 'Savings pot UUID' })
  @ApiResponse({ status: 200, description: 'Withdrawal successful' })
  @ApiResponse({ status: 404, description: 'Savings pot not found' })
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawFromSavingsPotDto,
    @CurrentUser() user: User,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.withdrawFromSavingsPotUseCase.execute(
      id,
      dto,
      user.id,
    );
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Post(':id/withdraw-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PinVerificationGuard)
  @ApiOperation({ summary: 'Withdraw all funds from a savings pot' })
  @ApiParam({ name: 'id', description: 'Savings pot UUID' })
  @ApiResponse({ status: 200, description: 'Full withdrawal successful' })
  @ApiResponse({ status: 404, description: 'Savings pot not found' })
  async withdrawAll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.withdrawFromSavingsPotUseCase.executeAll(
      id,
      user.id,
    );
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/delete a savings pot' })
  @ApiParam({ name: 'id', description: 'Savings pot UUID' })
  @ApiResponse({
    status: 200,
    description: 'Savings pot cancelled successfully',
  })
  @ApiResponse({ status: 404, description: 'Savings pot not found' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.cancelSavingsPotUseCase.execute(id, user.id);
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }
}
