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
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { User } from '../../../user/application/domain/entities/user.entity';
import { CardService } from '../services/card.service';
import { CreateCardDto } from '../dto/create-card.dto';
import { UpdateSpendingLimitDto } from '../dto/update-card.dto';
import { CardResponseDto, CardListResponseDto } from '../dto/card-response.dto';

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Cards')
@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get()
  async getCards(@CurrentUser() user: User): Promise<CardListResponseDto> {
    const cards = await this.cardService.getCards(user.id);
    return CardListResponseDto.fromEntities(cards);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCard(
    @Body() dto: CreateCardDto,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.createCard(user.id, dto);
    // Include sensitive data on creation
    return CardResponseDto.fromEntity(card, true);
  }

  @Get(':id')
  async getCard(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.getCard(id, user.id);
    // Include sensitive data for detail view
    return CardResponseDto.fromEntity(card, true);
  }

  @Put(':id/freeze')
  async freezeCard(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.freezeCard(id, user.id);
    return CardResponseDto.fromEntity(card, false);
  }

  @Put(':id/unfreeze')
  async unfreezeCard(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CardResponseDto> {
    const card = await this.cardService.unfreezeCard(id, user.id);
    return CardResponseDto.fromEntity(card, false);
  }

  @Put(':id/limit')
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
  async cancelCard(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.cardService.cancelCard(id, user.id);
  }
}
