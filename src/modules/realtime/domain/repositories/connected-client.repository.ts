import { ConnectedClient } from '../entities/connected-client.entity';

export abstract class ConnectedClientRepository {
  abstract addClient(client: ConnectedClient): Promise<void>;
  abstract removeClient(socketId: string): Promise<void>;
  abstract getClientsByUserId(userId: string): Promise<ConnectedClient[]>;
  abstract getClientBySocketId(
    socketId: string,
  ): Promise<ConnectedClient | null>;
  abstract getUserIdBySocketId(socketId: string): Promise<string | null>;
  abstract removeAllClientsByUserId(userId: string): Promise<void>;
  abstract getAllConnectedUserIds(): Promise<string[]>;
  abstract getConnectionCount(): Promise<number>;
  abstract getActiveClients(idleTimeoutMs?: number): Promise<ConnectedClient[]>;
}
