import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { SessionService, SessionResponse } from '../services/session.service';

interface UserPayload {
  id: string;
  phone: string;
}

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  async getActiveSessions(
    @CurrentUser() user: UserPayload,
  ): Promise<SessionResponse[]> {
    return this.sessionService.getActiveSessions(user.id);
  }

  @Get('all')
  async getAllSessions(
    @CurrentUser() user: UserPayload,
  ): Promise<SessionResponse[]> {
    return this.sessionService.getAllSessions(user.id);
  }

  @Delete(':id')
  async revokeSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    await this.sessionService.revokeSession(user.id, sessionId);
    return { success: true, message: 'Session revoked successfully' };
  }

  @Delete()
  async revokeAllSessions(
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string; count: number }> {
    const count = await this.sessionService.revokeAllSessions(user.id);
    return {
      success: true,
      message: `${count} session(s) revoked successfully`,
      count,
    };
  }
}
