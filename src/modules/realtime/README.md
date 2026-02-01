# Realtime Module - WebSocket Notifications

WebSocket-based real-time notification system using Socket.IO for pushing transaction updates, balance changes, and notifications to connected clients.

## Architecture

```
realtime/
├── application/
│   ├── controllers/          # REST endpoints for management
│   │   └── realtime.controller.ts
│   ├── services/            # Notification service (event listeners)
│   │   └── notification.service.ts
│   └── dto/                 # Data Transfer Objects
│       └── send-notification.dto.ts
│
├── domain/
│   ├── entities/            # Domain entities
│   │   └── connected-client.entity.ts
│   ├── repositories/        # Repository interfaces
│   │   └── connected-client.repository.ts
│   └── events/              # Domain events
│       └── notification.event.ts
│
├── infrastructure/
│   ├── gateways/            # WebSocket gateway
│   │   └── realtime.gateway.ts
│   ├── adapters/            # External adapters
│   │   └── redis-connected-client.repository.ts
│   └── guards/              # WebSocket guards
│       └── ws-jwt.guard.ts
│
└── realtime.module.ts       # Module definition
```

## Features

- JWT-based WebSocket authentication
- Automatic event-based notifications via EventEmitter
- User connection tracking via Redis
- Multi-device support (multiple connections per user)
- Real-time balance updates
- Transaction status updates
- Security alerts
- KYC status notifications
- Session management
- Device verification notifications

## WebSocket Connection

### Connection URL
```
ws://localhost:3000/ws
```

### Authentication

Clients must provide JWT token during connection:

**Option 1: Auth handshake**
```javascript
const socket = io('http://localhost:3000/ws', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

**Option 2: Authorization header**
```javascript
const socket = io('http://localhost:3000/ws', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

### Client Metadata (Optional)
```javascript
const socket = io('http://localhost:3000/ws', {
  auth: { token: 'jwt-token' },
  query: {
    deviceId: 'device-123',
    deviceType: 'mobile',
    appVersion: '1.0.0'
  }
});
```

## Client Events

### Connection Events

**`connected`** - Sent when client successfully connects
```javascript
socket.on('connected', (data) => {
  console.log('Connected:', data);
  // { socketId: 'abc123', userId: 'user-id', timestamp: '2026-01-30...' }
});
```

**`force_disconnect`** - Sent before server disconnects the client
```javascript
socket.on('force_disconnect', (data) => {
  console.log('Disconnected:', data);
  // { reason: 'Session expired', timestamp: '2026-01-30...' }
});
```

### Subscribing to Channels

Clients can subscribe to specific event channels:

```javascript
socket.emit('subscribe', {
  channels: ['transactions', 'balance', 'security']
});

socket.on('subscribed', (data) => {
  console.log('Subscribed to:', data.channels);
});
```

Unsubscribe:
```javascript
socket.emit('unsubscribe', {
  channels: ['transactions']
});
```

### Ping/Pong (Heartbeat)

```javascript
socket.emit('ping');

socket.on('pong', (data) => {
  console.log('Server time:', data.timestamp);
});
```

## Notification Events

### Transaction Events

**`transaction.created`**
```javascript
socket.on('transaction.created', (data) => {
  // {
  //   transactionId: 'txn-123',
  //   amount: 100,
  //   currency: 'XOF',
  //   status: 'pending',
  //   direction: 'outbound',
  //   recipientName: 'John Doe',
  //   timestamp: '2026-01-30...'
  // }
});
```

**`transaction.completed`**
```javascript
socket.on('transaction.completed', (data) => {
  // Same structure as transaction.created
});
```

**`transaction.failed`**
```javascript
socket.on('transaction.failed', (data) => {
  // Same structure as transaction.created
});
```

### Transfer Events

**`transfer.received`**
```javascript
socket.on('transfer.received', (data) => {
  // {
  //   transactionId: 'txn-123',
  //   amount: 500,
  //   currency: 'XOF',
  //   direction: 'inbound',
  //   senderName: 'Jane Smith',
  //   timestamp: '2026-01-30...'
  // }
});
```

**`transfer.sent`**
```javascript
socket.on('transfer.sent', (data) => {
  // Similar to transfer.received
});
```

### Balance Events

**`balance.updated`**
```javascript
socket.on('balance.updated', (data) => {
  // {
  //   balance: 5000,
  //   currency: 'XOF',
  //   previousBalance: 4500,
  //   change: 500,
  //   timestamp: '2026-01-30...'
  // }
});
```

### Deposit/Withdrawal Events

**`deposit.completed`**
```javascript
socket.on('deposit.completed', (data) => {
  // Transaction structure
});
```

**`withdrawal.completed`**
```javascript
socket.on('withdrawal.completed', (data) => {
  // Transaction structure
});
```

### KYC Events

**`kyc.status_updated`**
```javascript
socket.on('kyc.status_updated', (data) => {
  // {
  //   status: 'approved',
  //   previousStatus: 'submitted',
  //   message: 'Your KYC has been approved',
  //   timestamp: '2026-01-30...'
  // }
});
```

### Security Events

**`security.alert`**
```javascript
socket.on('security.alert', (data) => {
  // {
  //   alertType: 'suspicious_login',
  //   message: 'Login from new device detected',
  //   severity: 'high',
  //   requiresAction: true,
  //   timestamp: '2026-01-30...'
  // }
});
```

**`account.suspended`**
```javascript
socket.on('account.suspended', (data) => {
  // Security notification structure
  // Client will be disconnected after this event
});
```

**`session.expired`**
```javascript
socket.on('session.expired', (data) => {
  // Client will be disconnected after this event
});
```

**`device.verified`**
```javascript
socket.on('device.verified', (data) => {
  // Device verification confirmation
});
```

### User Status Events

**`user:online`** - Broadcast when a user comes online
```javascript
socket.on('user:online', (data) => {
  // { userId: 'user-id' }
});
```

**`user:offline`** - Broadcast when a user goes offline
```javascript
socket.on('user:offline', (data) => {
  // { userId: 'user-id' }
});
```

## REST API Endpoints

### Get Connection Status

**GET** `/realtime/status`
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/realtime/status
```

Response:
```json
{
  "online": true,
  "connections": 2,
  "clients": [
    {
      "socketId": "abc123",
      "deviceId": "device-1",
      "deviceType": "mobile",
      "connectedAt": "2026-01-30T10:00:00Z",
      "lastActivity": "2026-01-30T10:05:00Z"
    }
  ]
}
```

### Get Connection Count

**GET** `/realtime/connections/count`
```bash
curl http://localhost:3000/realtime/connections/count
```

### Get Online Users

**GET** `/realtime/connections/online-users`
```bash
curl http://localhost:3000/realtime/connections/online-users
```

### Get User Connections

**GET** `/realtime/connections/:userId`
```bash
curl http://localhost:3000/realtime/connections/user-123
```

### Disconnect User

**POST** `/realtime/disconnect/:userId`
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"reason": "Maintenance"}' \
  http://localhost:3000/realtime/disconnect/user-123
```

### Send Custom Notification

**POST** `/realtime/send-notification`
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "eventType": "custom.event",
    "data": {"message": "Custom notification"}
  }' \
  http://localhost:3000/realtime/send-notification
```

### Broadcast to All Clients

**POST** `/realtime/broadcast`
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "event": "maintenance.scheduled",
    "data": {"message": "Maintenance in 1 hour"}
  }' \
  http://localhost:3000/realtime/broadcast
```

## Backend Usage

### Emitting Events

The system automatically listens to EventEmitter events. Simply emit events from your services:

```typescript
// In your transfer service
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TransferService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createTransfer(dto: CreateTransferDto, userId: string) {
    // ... create transfer logic

    // Emit event - will automatically notify via WebSocket
    this.eventEmitter.emit('transaction.created',
      new TransactionNotificationEvent({
        type: NotificationEventType.TRANSACTION_CREATED,
        userId,
        transactionId: transfer.id,
        amount: transfer.amount,
        currency: 'XOF',
        status: 'pending',
        direction: 'outbound',
        recipientName: recipient.name,
      })
    );
  }
}
```

### Using NotificationService Directly

```typescript
import { NotificationService } from '@/modules/realtime/application/services/notification.service';

@Injectable()
export class WalletService {
  constructor(private readonly notificationService: NotificationService) {}

  async updateBalance(userId: string, newBalance: number, oldBalance: number) {
    // ... update balance logic

    // Send notification
    await this.notificationService.sendBalanceNotification({
      userId,
      balance: newBalance,
      currency: 'XOF',
      previousBalance: oldBalance,
    });
  }
}
```

### Using RealtimeGateway Directly

```typescript
import { RealtimeGateway } from '@/modules/realtime/infrastructure/gateways/realtime.gateway';

@Injectable()
export class SecurityService {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  async suspendUser(userId: string, reason: string) {
    // ... suspend user logic

    // Disconnect all user sessions
    await this.realtimeGateway.disconnectUser(userId, reason);
  }

  async checkUserOnlineStatus(userId: string): Promise<boolean> {
    return await this.realtimeGateway.isUserOnline(userId);
  }
}
```

## Event Types Reference

```typescript
enum NotificationEventType {
  // Transactions
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',

  // Balance
  BALANCE_UPDATED = 'balance.updated',

  // Transfers
  TRANSFER_RECEIVED = 'transfer.received',
  TRANSFER_SENT = 'transfer.sent',

  // Deposits/Withdrawals
  DEPOSIT_COMPLETED = 'deposit.completed',
  WITHDRAWAL_COMPLETED = 'withdrawal.completed',

  // KYC
  KYC_STATUS_UPDATED = 'kyc.status_updated',

  // Security
  ACCOUNT_SUSPENDED = 'account.suspended',
  ACCOUNT_UNSUSPENDED = 'account.unsuspended',
  SESSION_EXPIRED = 'session.expired',
  DEVICE_VERIFIED = 'device.verified',
  SECURITY_ALERT = 'security.alert',
}
```

## Connection Management

### Redis Storage

All active connections are tracked in Redis with the following keys:

- `ws:socket:{socketId}` - Maps socket ID to user ID
- `ws:user:{userId}` - Maps user ID to array of socket IDs
- `ws:client:{socketId}` - Stores client metadata
- `ws:connected_users` - Set of all connected user IDs

### Multi-Device Support

Users can have multiple simultaneous connections (e.g., mobile app + web app). Notifications are sent to all connected devices.

### Idle Detection

Clients are considered idle after 5 minutes of inactivity. Use the REST API to check active connections.

## Security Considerations

1. **JWT Authentication**: All connections must authenticate with valid JWT
2. **User Isolation**: Users only receive their own notifications
3. **Rate Limiting**: Consider implementing rate limiting for connection attempts
4. **CORS**: Configure CORS properly in production
5. **Transport Security**: Use WSS (WebSocket Secure) in production

## Production Configuration

### Environment Variables

```env
# WebSocket CORS origins (comma-separated)
WS_CORS_ORIGINS=https://app.joonapay.com,https://dashboard.joonapay.com

# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
```

### CORS Configuration

Update the gateway decorator in production:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
```

### Load Balancing

When using multiple server instances, use Socket.IO Redis adapter for horizontal scaling:

```bash
npm install @socket.io/redis-adapter
```

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

afterInit(server: Server) {
  const pubClient = new Redis(redisConfig);
  const subClient = pubClient.duplicate();

  server.adapter(createAdapter(pubClient, subClient));
}
```

## Testing

### Test Connection with Socket.IO Client

```bash
npm install socket.io-client
```

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3000/ws', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected!');
});

socket.on('balance.updated', (data) => {
  console.log('Balance updated:', data);
});

socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Pong:', data);
});
```

## Monitoring

Track WebSocket metrics:

- Total connections
- Connections per user
- Message throughput
- Connection duration
- Disconnection reasons

Use the REST endpoints to monitor real-time connection status.

## Troubleshooting

### Connection Fails
- Verify JWT token is valid
- Check CORS configuration
- Ensure Redis is running
- Check server logs for authentication errors

### Notifications Not Received
- Verify user is connected (`GET /realtime/status`)
- Check event type matches exactly
- Ensure EventEmitter is emitting events correctly
- Verify user ID matches

### Multiple Devices Not Working
- Check Redis connection
- Verify repository is storing multiple socket IDs per user
- Review connection tracking logic
