import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VelocityRuleService } from '../services/velocity-rule.service';
import {
  CreateVelocityRuleDto,
  UpdateVelocityRuleDto,
  VelocityRuleResponseDto,
  ListVelocityRulesQueryDto,
} from '../dto/velocity-rule.dto';
import {
  VelocityRuleType,
  UserTier,
} from '../../domain/entities/velocity-rule.entity';

/**
 * Velocity Rule Controller
 *
 * REST API for managing velocity rules.
 * These endpoints are typically used by admin/compliance dashboards.
 */
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Compliance - Velocity Rules')
@Controller('compliance/velocity-rules')
// @UseGuards(JwtAuthGuard, AdminGuard) // Uncomment when auth is integrated
export class VelocityRuleController {
  constructor(private readonly velocityRuleService: VelocityRuleService) {}

  /**
   * Create a new velocity rule
   */
  @Post()
  async createRule(
    @Body() dto: CreateVelocityRuleDto,
  ): Promise<VelocityRuleResponseDto> {
    return this.velocityRuleService.createRule(dto);
  }

  /**
   * Get all velocity rules
   */
  @Get()
  async getAllRules(
    @Query() query: ListVelocityRulesQueryDto,
  ): Promise<VelocityRuleResponseDto[]> {
    if (query.tier && query.ruleType) {
      // Both tier and type specified - use combined filter
      const rules = await this.velocityRuleService.getRulesForTier(query.tier);
      return rules.filter((r) => r.ruleType === query.ruleType);
    }

    if (query.tier) {
      return this.velocityRuleService.getRulesForTier(query.tier);
    }

    if (query.ruleType) {
      return this.velocityRuleService.getRulesByType(query.ruleType);
    }

    return this.velocityRuleService.getAllRules(query.activeOnly ?? false);
  }

  /**
   * Get a velocity rule by ID
   */
  @Get(':id')
  async getRule(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VelocityRuleResponseDto> {
    return this.velocityRuleService.getRule(id);
  }

  /**
   * Update a velocity rule
   */
  @Put(':id')
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVelocityRuleDto,
  ): Promise<VelocityRuleResponseDto> {
    return this.velocityRuleService.updateRule(id, dto);
  }

  /**
   * Delete a velocity rule
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.velocityRuleService.deleteRule(id);
  }

  /**
   * Get rules for a specific user tier
   */
  @Get('tier/:tier')
  async getRulesForTier(
    @Param('tier') tier: UserTier,
  ): Promise<VelocityRuleResponseDto[]> {
    return this.velocityRuleService.getRulesForTier(tier);
  }

  /**
   * Get rules by type
   */
  @Get('type/:ruleType')
  async getRulesByType(
    @Param('ruleType') ruleType: VelocityRuleType,
  ): Promise<VelocityRuleResponseDto[]> {
    return this.velocityRuleService.getRulesByType(ruleType);
  }
}
