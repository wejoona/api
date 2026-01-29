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
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/user/application/domain/entities/user.entity';
import { ApiKeyService } from '../services/api-key.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { UpdateApiKeyDto } from '../dto/update-api-key.dto';
import {
  ApiKeyResponseDto,
  ApiKeyCreatedResponseDto,
} from '../dto/api-key-response.dto';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Create a new API key for the current user
   */
  @Post()
  async create(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: User,
  ): Promise<ApiKeyCreatedResponseDto> {
    const { apiKey, rawKey } = await this.apiKeyService.createApiKey(
      dto,
      user.id,
    );
    return ApiKeyCreatedResponseDto.fromEntityWithKey(apiKey, rawKey);
  }

  /**
   * Get all API keys for the current user
   */
  @Get()
  async getAll(@CurrentUser() user: User): Promise<ApiKeyResponseDto[]> {
    const apiKeys = await this.apiKeyService.getApiKeysByUserId(user.id);
    return apiKeys.map((key) => ApiKeyResponseDto.fromEntity(key));
  }

  /**
   * Get a specific API key by ID
   */
  @Get(':id')
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyService.getApiKeyById(id, user.id);
    return ApiKeyResponseDto.fromEntity(apiKey);
  }

  /**
   * Update an API key
   */
  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiKeyDto,
    @CurrentUser() user: User,
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyService.updateApiKey(id, dto, user.id);
    return ApiKeyResponseDto.fromEntity(apiKey);
  }

  /**
   * Revoke (deactivate) an API key
   */
  @Post(':id/revoke')
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyService.revokeApiKey(id, user.id);
    return ApiKeyResponseDto.fromEntity(apiKey);
  }

  /**
   * Regenerate an API key (new key, same settings)
   */
  @Post(':id/regenerate')
  async regenerate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ApiKeyCreatedResponseDto> {
    const { apiKey, rawKey } = await this.apiKeyService.regenerateApiKey(
      id,
      user.id,
    );
    return ApiKeyCreatedResponseDto.fromEntityWithKey(apiKey, rawKey);
  }

  /**
   * Delete an API key permanently
   */
  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ deleted: boolean }> {
    await this.apiKeyService.deleteApiKey(id, user.id);
    return { deleted: true };
  }
}
