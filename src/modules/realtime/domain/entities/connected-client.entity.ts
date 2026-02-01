export interface ConnectedClientProps {
  socketId: string;
  userId: string;
  connectedAt: Date;
  deviceId?: string;
  deviceType?: string;
  appVersion?: string;
  lastActivity?: Date;
}

export class ConnectedClient {
  readonly socketId: string;
  readonly userId: string;
  readonly connectedAt: Date;
  readonly deviceId?: string;
  readonly deviceType?: string;
  readonly appVersion?: string;
  lastActivity: Date;

  private constructor(props: ConnectedClientProps) {
    this.socketId = props.socketId;
    this.userId = props.userId;
    this.connectedAt = props.connectedAt;
    this.deviceId = props.deviceId;
    this.deviceType = props.deviceType;
    this.appVersion = props.appVersion;
    this.lastActivity = props.lastActivity || props.connectedAt;
  }

  static create(
    props: Omit<ConnectedClientProps, 'connectedAt'>,
  ): ConnectedClient {
    return new ConnectedClient({
      ...props,
      connectedAt: new Date(),
    });
  }

  updateActivity(): void {
    this.lastActivity = new Date();
  }

  isIdle(idleTimeoutMs: number = 300000): boolean {
    // Default 5 minutes
    const now = new Date();
    return now.getTime() - this.lastActivity.getTime() > idleTimeoutMs;
  }

  getConnectionDuration(): number {
    const now = new Date();
    return now.getTime() - this.connectedAt.getTime();
  }
}
