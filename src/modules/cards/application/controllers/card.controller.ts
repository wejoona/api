import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { User } from '../../../user/application/domain/entities/user.entity';
import { CardService } from '../services/card.service';
import { CreateCardDto } from '../dto/create-card.dto';
import { UpdateSpendingLimitDto } from '../dto/update-card.dto';
import { CardResponseDto, CardListResponseDto } from '../dto/card-response.dto';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
@ApiTags('Cards')
@Controller('cards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get()
  @ApiOperation({ summary: 'List all cards for current user' })
  @ApiResponse({
    status: 200,
    description: 'Cards retrieved',
    type: CardListResponseDto,
  })
  async getCards(@CurrentUser() user: User): Promise<CardListResponseDto> {
    const cards = await this.cardService.getCards(user.id);
    const available = this.cardService.isIssuingEnabled();
    return CardListResponseDto.fromEntities(cards, {
      available,
      provider: this.cardService.getIssuingProvider(),
      reason: available ? null : 'card_issuing_unavailable',
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new virtual card' })
  @ApiResponse({
    status: 201,
    description: 'Card created',
    type: CardResponseDto,
  })
  async createCard(
    @Body() dto: CreateCardDto,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.createCard(user.id, dto);
    // Include sensitive data on creation
    return CardResponseDto.fromEntity(card, true);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get card transaction history' })
  async getCardTransactions(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.cardService.getCardTransactions(id, user.id, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get card details' })
  @ApiResponse({
    status: 200,
    description: 'Card details',
    type: CardResponseDto,
  })
  async getCard(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.getCard(id, user.id);
    // Never return full card number on GET — only masked
    return CardResponseDto.fromEntity(card, false);
  }

  @Put(':id/freeze')
  @ApiOperation({ summary: 'Freeze a card' })
  async freezeCard(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.freezeCard(id, user.id);
    return CardResponseDto.fromEntity(card, false);
  }

  @Put(':id/unfreeze')
  @ApiOperation({ summary: 'Unfreeze a card' })
  async unfreezeCard(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.unfreezeCard(id, user.id);
    return CardResponseDto.fromEntity(card, false);
  }

  @Put(':id/limit')
  @ApiOperation({ summary: 'Update card spending limit' })
  async updateLimit(
    @Param('id') id: string,
    @Body() dto: UpdateSpendingLimitDto,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.updateSpendingLimit(id, user.id, dto);
    return CardResponseDto.fromEntity(card, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a card permanently' })
  @ApiResponse({ status: 204, description: 'Card cancelled' })
  async cancelCard(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.cardService.cancelCard(id, user.id);
  }
}
