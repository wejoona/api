import {
  Controller,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { SessionService } from '../services/session.service';
import { SessionResponseDto, RevokeSessionDto } from '../dto';

interface UserPayload {
  id: string;
  phone: string;
}

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  async getActiveSessions(
    @CurrentUser() user: UserPayload,
  ): Promise<SessionResponseDto[]> {
    return this.sessionService.getActiveSessions(user.id);
  }

  @Get('all')
  async getAllSessions(
    @CurrentUser() user: UserPayload,
  ): Promise<SessionResponseDto[]> {
    return this.sessionService.getAllSessions(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: RevokeSessionDto,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    await this.sessionService.revokeSession(user.id, sessionId, dto.reason);
    return { success: true, message: 'Session revoked successfully' };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(
    @Body() dto: RevokeSessionDto,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string; count: number }> {
    const count = await this.sessionService.revokeAllSessions(
      user.id,
      dto.reason,
    );
    return {
      success: true,
      message: `${count} session(s) revoked successfully`,
      count,
    };
  }
}
