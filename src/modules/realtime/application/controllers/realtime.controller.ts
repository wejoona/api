import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RealtimeGateway } from '../../infrastructure/gateways/realtime.gateway';
import { ConnectedClientRepository } from '../../domain/repositories/connected-client.repository';
import { NotificationService } from '../services/notification.service';
import { SendNotificationDto } from '../dto/send-notification.dto';

@Controller('realtime')
@UseGuards(JwtAuthGuard)
export class RealtimeController {
  constructor(
    private readonly realtimeGateway: RealtimeGateway,
    private readonly connectedClientRepository: ConnectedClientRepository,
    private readonly notificationService: NotificationService,
  ) {}

  @Get('status')
  async getStatus(@CurrentUser('id') userId: string) {
    const isOnline = await this.realtimeGateway.isUserOnline(userId);
    const clients =
      await this.connectedClientRepository.getClientsByUserId(userId);

    return {
      online: isOnline,
      connections: clients.length,
      clients: clients.map((c) => ({
        socketId: c.socketId,
        deviceId: c.deviceId,
        deviceType: c.deviceType,
        connectedAt: c.connectedAt,
        lastActivity: c.lastActivity,
      })),
    };
  }

  @Get('connections/count')
  async getConnectionCount() {
    const count = await this.connectedClientRepository.getConnectionCount();
    return { count };
  }

  @Get('connections/online-users')
  async getOnlineUsers() {
    const userIds = await this.realtimeGateway.getOnlineUsers();
    return {
      count: userIds.length,
      users: userIds,
    };
  }

  @Get('connections/:userId')
  async getUserConnections(@Param('userId') userId: string) {
    const clients =
      await this.connectedClientRepository.getClientsByUserId(userId);
    const isOnline = clients.length > 0;

    return {
      userId,
      online: isOnline,
      connections: clients.length,
      clients: clients.map((c) => ({
        socketId: c.socketId,
        deviceId: c.deviceId,
        deviceType: c.deviceType,
        connectedAt: c.connectedAt,
        lastActivity: c.lastActivity,
      })),
    };
  }

  @Post('disconnect/:userId')
  async disconnectUser(
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    await this.realtimeGateway.disconnectUser(userId, body.reason);
    return {
      success: true,
      message: `All connections for user ${userId} have been disconnected`,
    };
  }

  @Post('send-notification')
  async sendNotification(@Body() dto: SendNotificationDto) {
    await this.notificationService.sendCustomNotification(
      dto.userId,
      dto.eventType,
      dto.data,
    );

    return {
      success: true,
      message: 'Notification sent',
    };
  }

  @Post('broadcast')
  async broadcast(@Body() body: { event: string; data: unknown }) {
    await this.realtimeGateway.broadcast(body.event, body.data);

    return {
      success: true,
      message: 'Broadcast sent to all clients',
    };
  }
}
