# Session Module

Persistent session tracking for the USDC Wallet backend, enabling multi-device session management, security audit trails, and proper logout-all functionality.

## Overview

The Session module supplements Redis-based JWT session management with persistent database storage. It provides:

- Persistent session tracking across application restarts
- Session list view for users (see all active devices)
- Logout from all devices functionality
- Security audit trail with IP, user agent, and location
- Automatic cleanup of expired sessions

## Architecture

### Domain Layer
- **Session Entity**: Core business logic for session lifecycle
- **SessionRepository Interface**: Abstract repository contract

### Infrastructure Layer
- **SessionOrmEntity**: TypeORM entity for database persistence
- **TypeOrmSessionRepository**: PostgreSQL implementation
- **SessionMapper**: Domain <-> ORM mapping

### Application Layer
- **SessionService**: Business logic for session operations
- **SessionController**: REST API endpoints
- **DTOs**: Request/response validation and serialization

## Database Schema

```sql
CREATE TABLE "auth"."sessions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "device_id" uuid,
  "refresh_token_hash" varchar(255) NOT NULL,
  "ip_address" varchar(45),
  "user_agent" text,
  "location" varchar(100),
  "is_active" boolean DEFAULT true,
  "last_activity_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "revoked_reason" varchar(100),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "FK_sessions_user" FOREIGN KEY ("user_id")
    REFERENCES "auth"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_sessions_device" FOREIGN KEY ("device_id")
    REFERENCES "auth"."devices"("id") ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX "IDX_sessions_refresh_token_hash" ON "auth"."sessions" ("refresh_token_hash");
CREATE INDEX "IDX_sessions_user_active" ON "auth"."sessions" ("user_id", "is_active") WHERE "is_active" = true;
CREATE INDEX "IDX_sessions_user_id" ON "auth"."sessions" ("user_id");
CREATE INDEX "IDX_sessions_expires_at" ON "auth"."sessions" ("expires_at") WHERE "is_active" = true;
```

## API Endpoints

### GET /api/v1/sessions
Get active sessions for the current user.

**Authentication**: Required (JWT)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "deviceId": "uuid",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "location": "Abidjan, CI",
    "isActive": true,
    "lastActivityAt": "2024-01-28T10:00:00Z",
    "expiresAt": "2024-02-04T10:00:00Z",
    "createdAt": "2024-01-28T10:00:00Z"
  }
]
```

### GET /api/v1/sessions/all
Get all sessions (including revoked) for the current user.

**Authentication**: Required (JWT)

**Response**: `200 OK` (same format as above)

### DELETE /api/v1/sessions/:id
Revoke a specific session.

**Authentication**: Required (JWT)

**Body** (optional):
```json
{
  "reason": "user_logout"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

**Errors**:
- `404`: Session not found
- `403`: Session does not belong to user

### DELETE /api/v1/sessions
Revoke all sessions (logout from all devices).

**Authentication**: Required (JWT)

**Body** (optional):
```json
{
  "reason": "security_concern"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "3 session(s) revoked successfully",
  "count": 3
}
```

## Usage Examples

### Creating a Session

```typescript
import { SessionService } from '@modules/session/application/services/session.service';

@Injectable()
export class AuthService {
  constructor(private readonly sessionService: SessionService) {}

  async login(user: User, refreshToken: string, req: Request) {
    // Create session record
    await this.sessionService.createSession({
      userId: user.id,
      deviceId: user.deviceId,
      refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      location: this.getLocationFromIp(req.ip),
      expiresInSeconds: 7 * 24 * 60 * 60, // 7 days
    });
  }
}
```

### Validating Refresh Token

```typescript
async refreshAccessToken(refreshToken: string) {
  // Validate token and update last activity
  const session = await this.sessionService.validateRefreshToken(refreshToken);

  if (!session) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  // Generate new access token
  return this.generateAccessToken(session.userId);
}
```

### Revoking Sessions

```typescript
// Logout current session
await this.sessionService.revokeSession(userId, sessionId);

// Logout all devices
await this.sessionService.revokeAllSessions(userId, 'user_logout');

// Revoke all sessions for a device (when device is untrusted)
await this.sessionService.revokeSessionsByDevice(deviceId, 'device_untrusted');
```

## Security Features

### Token Hashing
Refresh tokens are hashed using SHA-256 before storage, preventing token theft if the database is compromised.

### Session Validation
Sessions are validated on each token refresh:
- Active status check
- Expiration check
- Last activity timestamp update

### Automatic Cleanup
A scheduled job runs every hour to mark expired sessions as inactive:
```typescript
@Cron(CronExpression.EVERY_HOUR)
async cleanupExpiredSessions() {
  await this.sessionService.cleanupExpiredSessions();
}
```

### Audit Trail
Every session tracks:
- IP address
- User agent (browser/device info)
- Location (derived from IP)
- Creation time
- Last activity time
- Revocation time and reason

## Revocation Reasons

Standard revocation reasons for audit purposes:

- `user_logout`: User logged out manually
- `logout_all`: User logged out from all devices
- `device_revoked`: Device was untrusted or removed
- `device_untrusted`: Device failed security check
- `security_concern`: Suspicious activity detected
- `expired`: Session expired naturally
- `password_changed`: User changed password
- `account_locked`: Account was locked/suspended

## Integration with Auth Flow

### Login Flow
1. User authenticates with credentials
2. Generate access token (JWT, 15 min expiry)
3. Generate refresh token (random, 7 day expiry)
4. **Create session record** with hashed refresh token
5. Store refresh token in Redis
6. Return tokens to client

### Token Refresh Flow
1. Client sends refresh token
2. Validate token in Redis
3. **Validate session in database**
4. Update last activity timestamp
5. Generate new access token
6. Return new access token

### Logout Flow
1. Client requests logout
2. Invalidate token in Redis
3. **Revoke session in database**
4. Return success

### Logout All Flow
1. Client requests logout from all devices
2. Invalidate all tokens in Redis for user
3. **Revoke all sessions in database**
4. Return count of revoked sessions

## Performance Considerations

### Indexes
- `refresh_token_hash`: O(1) token validation
- `user_id + is_active`: Fast active session queries
- `expires_at`: Efficient cleanup job

### Caching
- Session validation uses database (source of truth)
- Consider Redis cache for high-frequency lookups
- Last activity updates are batched

### Connection Pooling
TypeORM connection pool handles concurrent session operations efficiently.

## Testing

Run unit tests:
```bash
npm test -- session.service.spec.ts
```

Run integration tests:
```bash
npm run test:e2e -- session
```

## Monitoring

Key metrics to track:
- Active sessions per user (detect anomalies)
- Session creation rate (detect brute force)
- Token validation failures (detect token theft)
- Expired session cleanup count
- Average session duration

## Future Enhancements

- [ ] Geo-blocking based on location
- [ ] Concurrent session limits per user
- [ ] Session activity analytics
- [ ] Push notifications for new sessions
- [ ] Trusted device management
- [ ] Session fingerprinting
