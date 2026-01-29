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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { UserEntity } from '../../../user/domain/entities/user.entity';
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

@Controller('savings-pots')
@UseGuards(JwtAuthGuard)
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
  async create(
    @Body() dto: CreateSavingsPotDto,
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.createSavingsPotUseCase.execute(dto, user.id);
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Get()
  async getAll(
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto[]> {
    const savingsPots = await this.getSavingsPotsUseCase.execute(user.id);
    return savingsPots.map(SavingsPotResponseDto.fromEntity);
  }

  @Get('active')
  async getActive(
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto[]> {
    const savingsPots = await this.getSavingsPotsUseCase.executeActive(user.id);
    return savingsPots.map(SavingsPotResponseDto.fromEntity);
  }

  @Get(':id')
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.getSavingsPotsUseCase.executeOne(id, user.id);
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavingsPotDto,
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.updateSavingsPotUseCase.execute(
      id,
      dto,
      user.id,
    );
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Post(':id/deposit')
  async deposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DepositToSavingsPotDto,
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.depositToSavingsPotUseCase.execute(
      id,
      dto,
      user.id,
    );
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Post(':id/withdraw')
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawFromSavingsPotDto,
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.withdrawFromSavingsPotUseCase.execute(
      id,
      dto,
      user.id,
    );
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Post(':id/withdraw-all')
  async withdrawAll(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.withdrawFromSavingsPotUseCase.executeAll(
      id,
      user.id,
    );
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }

  @Delete(':id')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<SavingsPotResponseDto> {
    const savingsPot = await this.cancelSavingsPotUseCase.execute(id, user.id);
    return SavingsPotResponseDto.fromEntity(savingsPot);
  }
}
