import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConnectedClient } from '../../domain/entities/connected-client.entity';
import { ConnectedClientRepository } from '../../domain/repositories/connected-client.repository';

@Injectable()
export class RedisConnectedClientRepository extends ConnectedClientRepository {
  private readonly SOCKET_TO_USER_PREFIX = 'ws:socket:';
  private readonly USER_TO_SOCKETS_PREFIX = 'ws:user:';
  private readonly CLIENT_DATA_PREFIX = 'ws:client:';
  private readonly CONNECTED_USERS_SET = 'ws:connected_users';

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    super();
  }

  async addClient(client: ConnectedClient): Promise<void> {
    const ttl = 86400; // 24 hours in seconds

    // Store socket -> user mapping
    await this.cacheManager.set(
      `${this.SOCKET_TO_USER_PREFIX}${client.socketId}`,
      client.userId,
      ttl * 1000,
    );

    // Store user -> sockets mapping (using Redis set)
    const userSocketsKey = `${this.USER_TO_SOCKETS_PREFIX}${client.userId}`;
    const existingSockets =
      (await this.cacheManager.get<string[]>(userSocketsKey)) || [];
    await this.cacheManager.set(
      userSocketsKey,
      [...existingSockets, client.socketId],
      ttl * 1000,
    );

    // Store client data
    await this.cacheManager.set(
      `${this.CLIENT_DATA_PREFIX}${client.socketId}`,
      {
        socketId: client.socketId,
        userId: client.userId,
        connectedAt: client.connectedAt.toISOString(),
        deviceId: client.deviceId,
        deviceType: client.deviceType,
        appVersion: client.appVersion,
        lastActivity: client.lastActivity.toISOString(),
      },
      ttl * 1000,
    );

    // Add to connected users set
    const connectedUsers =
      (await this.cacheManager.get<string[]>(this.CONNECTED_USERS_SET)) || [];
    if (!connectedUsers.includes(client.userId)) {
      await this.cacheManager.set(
        this.CONNECTED_USERS_SET,
        [...connectedUsers, client.userId],
        ttl * 1000,
      );
    }
  }

  async removeClient(socketId: string): Promise<void> {
    // Get user ID
    const userId = await this.cacheManager.get<string>(
      `${this.SOCKET_TO_USER_PREFIX}${socketId}`,
    );

    if (!userId) {
      return;
    }

    // Remove socket -> user mapping
    await this.cacheManager.del(`${this.SOCKET_TO_USER_PREFIX}${socketId}`);

    // Remove from user -> sockets mapping
    const userSocketsKey = `${this.USER_TO_SOCKETS_PREFIX}${userId}`;
    const sockets =
      (await this.cacheManager.get<string[]>(userSocketsKey)) || [];
    const updatedSockets = sockets.filter((s) => s !== socketId);

    if (updatedSockets.length > 0) {
      await this.cacheManager.set(userSocketsKey, updatedSockets, 86400 * 1000);
    } else {
      // No more sockets for this user
      await this.cacheManager.del(userSocketsKey);

      // Remove from connected users set
      const connectedUsers =
        (await this.cacheManager.get<string[]>(this.CONNECTED_USERS_SET)) || [];
      await this.cacheManager.set(
        this.CONNECTED_USERS_SET,
        connectedUsers.filter((u) => u !== userId),
        86400 * 1000,
      );
    }

    // Remove client data
    await this.cacheManager.del(`${this.CLIENT_DATA_PREFIX}${socketId}`);
  }

  async getClientsByUserId(userId: string): Promise<ConnectedClient[]> {
    const socketIds =
      (await this.cacheManager.get<string[]>(
        `${this.USER_TO_SOCKETS_PREFIX}${userId}`,
      )) || [];

    const clients: ConnectedClient[] = [];
    for (const socketId of socketIds) {
      const client = await this.getClientBySocketId(socketId);
      if (client) {
        clients.push(client);
      }
    }

    return clients;
  }

  async getClientBySocketId(socketId: string): Promise<ConnectedClient | null> {
    const data = await this.cacheManager.get<{
      socketId: string;
      userId: string;
      connectedAt: string;
      deviceId?: string;
      deviceType?: string;
      appVersion?: string;
      lastActivity: string;
    }>(`${this.CLIENT_DATA_PREFIX}${socketId}`);

    if (!data) {
      return null;
    }

    return ConnectedClient.create({
      socketId: data.socketId,
      userId: data.userId,
      deviceId: data.deviceId,
      deviceType: data.deviceType,
      appVersion: data.appVersion,
      lastActivity: new Date(data.lastActivity),
    });
  }

  async getUserIdBySocketId(socketId: string): Promise<string | null> {
    return (
      (await this.cacheManager.get<string>(
        `${this.SOCKET_TO_USER_PREFIX}${socketId}`,
      )) || null
    );
  }

  async removeAllClientsByUserId(userId: string): Promise<void> {
    const socketIds =
      (await this.cacheManager.get<string[]>(
        `${this.USER_TO_SOCKETS_PREFIX}${userId}`,
      )) || [];

    for (const socketId of socketIds) {
      await this.removeClient(socketId);
    }
  }

  async getAllConnectedUserIds(): Promise<string[]> {
    return (
      (await this.cacheManager.get<string[]>(this.CONNECTED_USERS_SET)) || []
    );
  }

  async getConnectionCount(): Promise<number> {
    const users = await this.getAllConnectedUserIds();
    return users.length;
  }

  async getActiveClients(
    idleTimeoutMs: number = 300000,
  ): Promise<ConnectedClient[]> {
    const userIds = await this.getAllConnectedUserIds();
    const activeClients: ConnectedClient[] = [];

    for (const userId of userIds) {
      const clients = await this.getClientsByUserId(userId);
      const active = clients.filter((c) => !c.isIdle(idleTimeoutMs));
      activeClients.push(...active);
    }

    return activeClients;
  }
}
