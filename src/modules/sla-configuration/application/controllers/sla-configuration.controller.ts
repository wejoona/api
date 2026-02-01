import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { SlaConfigurationService } from '../services/sla-configuration.service';
import {
  CreateSlaConfigurationDto,
  UpdateSlaConfigurationDto,
  SlaConfigurationResponseDto,
} from '../dto/sla-configuration.dto';

@Controller('admin/sla-configurations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class SlaConfigurationController {
  constructor(private readonly slaConfigService: SlaConfigurationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSlaConfigurationDto,
  ): Promise<SlaConfigurationResponseDto> {
    return this.slaConfigService.create(dto);
  }

  @Get()
  async findAll(): Promise<SlaConfigurationResponseDto[]> {
    return this.slaConfigService.findAll();
  }

  @Get('active')
  async findAllActive(): Promise<SlaConfigurationResponseDto[]> {
    return this.slaConfigService.findAllActive();
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
  ): Promise<SlaConfigurationResponseDto> {
    return this.slaConfigService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSlaConfigurationDto,
  ): Promise<SlaConfigurationResponseDto> {
    return this.slaConfigService.update(id, dto);
  }

  @Put(':id/activate')
  async activate(
    @Param('id') id: string,
  ): Promise<SlaConfigurationResponseDto> {
    return this.slaConfigService.activate(id);
  }

  @Put(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
  ): Promise<SlaConfigurationResponseDto> {
    return this.slaConfigService.deactivate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.slaConfigService.delete(id);
  }
}
