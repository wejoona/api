import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConnectedClientRepository } from '../../domain/repositories/connected-client.repository';
import { ConnectedClient } from '../../domain/entities/connected-client.entity';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

interface SocketWithUser extends Socket {
  userId?: string;
  deviceId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure based on environment
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly connectedClientRepository: ConnectedClientRepository,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // Set up middleware for authentication
    server.use(async (socket: SocketWithUser, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token not provided'));
        }

        const jwtSecret = this.configService.get<string>('jwt.secret');
        const payload = await this.jwtService.verifyAsync(token, {
          secret: jwtSecret,
        });

        socket.userId = payload.id || payload.sub;
        socket.deviceId = socket.handshake.query.deviceId as string;
        next();
      } catch (error) {
        this.logger.error(`WebSocket authentication failed: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  async handleConnection(socket: SocketWithUser) {
    try {
      const userId = socket.userId;
      if (!userId) {
        socket.disconnect();
        return;
      }

      this.logger.log(`Client connected: ${socket.id} (User: ${userId})`);

      // Join user-specific room
      socket.join(`user:${userId}`);

      // Track connection
      const client = ConnectedClient.create({
        socketId: socket.id,
        userId,
        deviceId: socket.deviceId,
        deviceType: socket.handshake.query.deviceType as string,
        appVersion: socket.handshake.query.appVersion as string,
      });

      await this.connectedClientRepository.addClient(client);

      // Send connection confirmation
      socket.emit('connected', {
        socketId: socket.id,
        userId,
        timestamp: new Date().toISOString(),
      });

      // Broadcast user online status to their contacts (optional)
      this.server.emit('user:online', { userId });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: SocketWithUser) {
    try {
      const userId = socket.userId;
      this.logger.log(`Client disconnected: ${socket.id} (User: ${userId})`);

      await this.connectedClientRepository.removeClient(socket.id);

      // Check if user has any other connections
      if (userId) {
        const userClients =
          await this.connectedClientRepository.getClientsByUserId(userId);
        if (userClients.length === 0) {
          // User is completely offline
          this.server.emit('user:offline', { userId });
        }
      }
    } catch (error) {
      this.logger.error(`Disconnection error: ${error.message}`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() _socket: SocketWithUser): {
    event: string;
    data: unknown;
  } {
    return {
      event: 'pong',
      data: { timestamp: new Date().toISOString() },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() socket: SocketWithUser,
    @MessageBody() data: { channels: string[] },
  ): Promise<{ event: string; data: unknown }> {
    const userId = socket.userId;
    if (!userId) {
      return {
        event: 'error',
        data: { message: 'Unauthorized' },
      };
    }

    // Subscribe to requested channels (e.g., 'transactions', 'balance', etc.)
    for (const channel of data.channels) {
      socket.join(`${userId}:${channel}`);
    }

    this.logger.log(
      `User ${userId} subscribed to channels: ${data.channels.join(', ')}`,
    );

    return {
      event: 'subscribed',
      data: { channels: data.channels },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() socket: SocketWithUser,
    @MessageBody() data: { channels: string[] },
  ): Promise<{ event: string; data: unknown }> {
    const userId = socket.userId;
    if (!userId) {
      return {
        event: 'error',
        data: { message: 'Unauthorized' },
      };
    }

    // Unsubscribe from channels
    for (const channel of data.channels) {
      socket.leave(`${userId}:${channel}`);
    }

    this.logger.log(
      `User ${userId} unsubscribed from channels: ${data.channels.join(', ')}`,
    );

    return {
      event: 'unsubscribed',
      data: { channels: data.channels },
    };
  }

  // Public method to send notifications to a user
  async sendToUser(
    userId: string,
    event: string,
    data: unknown,
  ): Promise<void> {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Sent event '${event}' to user ${userId}`);
  }

  // Public method to send notifications to specific channel
  async sendToChannel(
    userId: string,
    channel: string,
    event: string,
    data: unknown,
  ): Promise<void> {
    this.server.to(`${userId}:${channel}`).emit(event, data);
    this.logger.debug(
      `Sent event '${event}' to user ${userId} on channel ${channel}`,
    );
  }

  // Broadcast to all connected clients
  async broadcast(event: string, data: unknown): Promise<void> {
    this.server.emit(event, data);
    this.logger.debug(`Broadcast event '${event}' to all clients`);
  }

  // Get online users
  async getOnlineUsers(): Promise<string[]> {
    return this.connectedClientRepository.getAllConnectedUserIds();
  }

  // Check if user is online
  async isUserOnline(userId: string): Promise<boolean> {
    const clients =
      await this.connectedClientRepository.getClientsByUserId(userId);
    return clients.length > 0;
  }

  // Disconnect all sessions for a user
  async disconnectUser(userId: string, reason?: string): Promise<void> {
    const clients =
      await this.connectedClientRepository.getClientsByUserId(userId);

    for (const client of clients) {
      const socket = this.server.sockets.sockets.get(client.socketId);
      if (socket) {
        socket.emit('force_disconnect', {
          reason: reason || 'Session terminated',
          timestamp: new Date().toISOString(),
        });
        socket.disconnect(true);
      }
    }

    await this.connectedClientRepository.removeAllClientsByUserId(userId);
  }
}
