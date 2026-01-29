# Device Module Implementation - Phase 2

## Overview
This document summarizes the implementation of Phase 2 of the database schema enhancements for JoonaPay - the `auth.devices` table and associated module.

## Implemented Features

### 1. Database Schema
- **Table:** `auth.devices`
- **Schema:** `auth`
- **Migration:** `1741100000000-CreateDevicesTable.ts`

#### Schema Details
```sql
CREATE TABLE "auth"."devices" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "device_identifier" varchar(255) NOT NULL,
  "brand" varchar(100),
  "model" varchar(100),
  "os" varchar(50),
  "os_version" varchar(50),
  "app_version" varchar(50),
  "platform" "auth"."device_platform" DEFAULT 'android',
  "fcm_token" varchar(500),
  "is_trusted" boolean DEFAULT false,
  "trusted_at" timestamp,
  "is_active" boolean DEFAULT true,
  "last_login_at" timestamp,
  "last_ip_address" varchar(45),
  "login_count" integer DEFAULT 0,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "UQ_devices_user_device" UNIQUE ("user_id", "device_identifier"),
  CONSTRAINT "FK_devices_user" FOREIGN KEY ("user_id")
    REFERENCES "auth"."users"("id") ON DELETE CASCADE
);
```

#### Indexes
- `IDX_devices_fcm_token` - Partial index for FCM token lookups (push notifications)
- `IDX_devices_user_active` - Partial index for user's active devices
- `IDX_devices_user_id` - Index for user lookups

### 2. Module Structure (Clean Architecture)

```
src/modules/device/
├── device.module.ts              # NestJS module definition
├── index.ts                      # Public exports
│
├── domain/                       # Business logic layer
│   ├── entities/
│   │   ├── device.entity.ts      # Domain entity with business rules
│   │   └── index.ts
│   └── repositories/
│       ├── device.repository.ts  # Repository interface
│       └── index.ts
│
├── infrastructure/               # Technical implementation
│   ├── orm-entities/
│   │   ├── device.orm-entity.ts  # TypeORM entity
│   │   └── index.ts
│   ├── mappers/
│   │   ├── device.mapper.ts      # Domain ↔ ORM mapper
│   │   └── index.ts
│   └── repositories/
│       ├── device.repository.ts  # Repository implementation
│       └── index.ts
│
└── application/                  # Application layer
    ├── controllers/
    │   ├── device.controller.ts  # REST endpoints
    │   └── index.ts
    ├── services/
    │   ├── device.service.ts     # Application service
    │   └── index.ts
    └── dto/
        ├── index.ts
        ├── requests/
        │   ├── register-device.dto.ts
        │   ├── update-fcm-token.dto.ts
        │   └── index.ts
        └── responses/
            ├── device-response.dto.ts
            ├── device-action-response.dto.ts
            └── index.ts
```

### 3. API Endpoints

All endpoints require JWT authentication (`@UseGuards(JwtAuthGuard)`).

#### POST `/api/v1/devices/register`
Register or update the current device.

**Request Body:**
```typescript
{
  deviceIdentifier: string;      // Required: Device fingerprint
  brand?: string;                // Optional: e.g., "Samsung"
  model?: string;                // Optional: e.g., "Galaxy S23"
  os?: string;                   // Optional: e.g., "Android"
  osVersion?: string;            // Optional: e.g., "13.0"
  appVersion?: string;           // Optional: e.g., "1.2.3"
  platform?: 'ios'|'android'|'web';
  fcmToken?: string;             // Optional: FCM push token
  metadata?: Record<string, any>; // Optional: Additional data
}
```

**Response:**
```typescript
{
  id: string;
  deviceIdentifier: string;
  displayName: string;
  brand: string | null;
  model: string | null;
  os: string | null;
  osVersion: string | null;
  platform: 'ios' | 'android' | 'web';
  isTrusted: boolean;
  trustedAt: Date | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  lastIpAddress: string | null;
  loginCount: number;
  createdAt: Date;
}
```

#### POST `/api/v1/devices/fcm-token`
Update FCM token for push notifications.

**Request Body:**
```typescript
{
  deviceIdentifier: string;
  fcmToken: string;
}
```

#### GET `/api/v1/devices`
Get active devices for the current user.

**Response:** Array of `DeviceResponseDto`

#### GET `/api/v1/devices/all`
Get all devices (including inactive) for the current user.

**Response:** Array of `DeviceResponseDto`

#### POST `/api/v1/devices/:id/trust`
Trust a device (skip OTP for future logins from this device).

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### POST `/api/v1/devices/:id/untrust`
Untrust a device (require OTP for future logins).

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### DELETE `/api/v1/devices/:id`
Revoke/deactivate a specific device.

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

#### DELETE `/api/v1/devices`
Revoke all devices (logout from all devices).

**Response:**
```typescript
{
  success: boolean;
  message: string;
  count: number;
}
```

### 4. Domain Entity Features

The `Device` entity includes the following business methods:

```typescript
class Device {
  // Getters for all properties
  get displayName(): string;        // Human-readable device name
  get isTrusted(): boolean;
  get isActive(): boolean;
  get loginCount(): number;

  // Business methods
  trust(): void;                     // Mark device as trusted
  untrust(): void;                   // Remove trust status
  activate(): void;                  // Re-activate device
  deactivate(): void;                // Revoke device
  recordLogin(ipAddress?: string): void;  // Track login
  updateFcmToken(token: string): void;    // Update push token
  updateAppVersion(version: string): void; // Update app version
  updateMetadata(metadata: Record<string, unknown>): void;

  // Factory methods
  static create(props): Device;      // Create new device
  static reconstitute(props): Device; // Restore from DB
}
```

### 5. Repository Methods

```typescript
abstract class DeviceRepository {
  abstract findById(id: string): Promise<Device | null>;
  abstract findByUserIdAndIdentifier(userId: string, deviceIdentifier: string): Promise<Device | null>;
  abstract findByUserId(userId: string): Promise<Device[]>;
  abstract findActiveByUserId(userId: string): Promise<Device[]>;
  abstract findByFcmToken(fcmToken: string): Promise<Device | null>;
  abstract save(device: Device): Promise<Device>;
  abstract delete(id: string): Promise<void>;
  abstract deactivateAllForUser(userId: string): Promise<number>;
  abstract countActiveDevices(userId: string): Promise<number>;
}
```

### 6. Service Methods

```typescript
class DeviceService {
  registerDevice(params): Promise<Device>;
  getUserDevices(userId): Promise<DeviceResponse[]>;
  getActiveDevices(userId): Promise<DeviceResponse[]>;
  trustDevice(userId, deviceId): Promise<Device>;
  untrustDevice(userId, deviceId): Promise<Device>;
  revokeDevice(userId, deviceId): Promise<void>;
  revokeAllDevices(userId): Promise<number>;
  updateFcmToken(userId, deviceIdentifier, fcmToken): Promise<Device | null>;
  findByFcmToken(fcmToken): Promise<Device | null>;
  countActiveDevices(userId): Promise<number>;
}
```

## Security Features

1. **User Isolation:** All operations are scoped to the authenticated user
2. **Ownership Validation:** Service validates device ownership before trust/revoke
3. **Unique Constraint:** One device per user (user_id + device_identifier)
4. **Cascade Delete:** Devices are deleted when user is deleted
5. **IP Tracking:** Records last IP address for security monitoring
6. **Login Counter:** Tracks login frequency per device

## Use Cases

### 1. Device Registration (Login Flow)
When a user logs in, the app should call `POST /devices/register` to:
- Register new device (first login)
- Update existing device (subsequent logins)
- Record login timestamp and IP
- Update FCM token if provided

### 2. Trust Management
- **Trust Device:** After successful OTP verification, allow user to trust device
- **Untrust Device:** User can remove trust if suspicious activity detected

### 3. Device Management
- **View Devices:** User can see all devices that have accessed their account
- **Revoke Device:** User can logout specific devices remotely
- **Logout All:** User can logout all devices (security measure)

### 4. Push Notifications
- FCM tokens stored per device
- Use `findByFcmToken()` to target specific devices
- Token updates handled via `POST /devices/fcm-token`

## Migration Instructions

### Run Migration
```bash
cd usdc-wallet
npm run migration:run
```

### Verify Tables
```bash
npm run migration:show
```

### Rollback (if needed)
```bash
npm run migration:revert
```

## Testing

### Manual Testing with curl

#### 1. Register Device
```bash
curl -X POST http://localhost:3000/api/v1/devices/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIdentifier": "test-device-123",
    "brand": "Samsung",
    "model": "Galaxy S23",
    "os": "Android",
    "osVersion": "13.0",
    "appVersion": "1.0.0",
    "platform": "android",
    "fcmToken": "test-fcm-token"
  }'
```

#### 2. Get Devices
```bash
curl -X GET http://localhost:3000/api/v1/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 3. Trust Device
```bash
curl -X POST http://localhost:3000/api/v1/devices/{DEVICE_ID}/trust \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 4. Revoke Device
```bash
curl -X DELETE http://localhost:3000/api/v1/devices/{DEVICE_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Integration Points

### With Auth Module
- Device registration should be called during login flow
- Trusted devices can skip OTP verification
- New devices require OTP before trust

### With Notification Module
- Use FCM tokens for push notifications
- Query devices by `findByFcmToken()`
- Update tokens via `POST /devices/fcm-token`

### With Session Module (Future)
- Link sessions to devices
- Revoke sessions when device is revoked
- Track concurrent sessions per device

## Database Queries

### Find user's active devices
```sql
SELECT * FROM auth.devices
WHERE user_id = $1 AND is_active = true
ORDER BY last_login_at DESC;
```

### Find device by FCM token
```sql
SELECT * FROM auth.devices
WHERE fcm_token = $1 AND is_active = true;
```

### Count active devices per user
```sql
SELECT user_id, COUNT(*) as device_count
FROM auth.devices
WHERE is_active = true
GROUP BY user_id;
```

## Files Created/Modified

### Created Files
1. `/src/modules/device/application/dto/requests/register-device.dto.ts`
2. `/src/modules/device/application/dto/requests/update-fcm-token.dto.ts`
3. `/src/modules/device/application/dto/requests/index.ts`
4. `/src/modules/device/application/dto/responses/device-response.dto.ts`
5. `/src/modules/device/application/dto/responses/device-action-response.dto.ts`
6. `/src/modules/device/application/dto/responses/index.ts`
7. `/src/modules/device/application/dto/index.ts`

### Modified Files
1. `/src/modules/device/application/controllers/device.controller.ts` - Added DTOs, Swagger docs, register endpoint

### Existing Files (Already Implemented)
1. `/src/database/migrations/1741100000000-CreateDevicesTable.ts`
2. `/src/modules/device/device.module.ts`
3. `/src/modules/device/domain/entities/device.entity.ts`
4. `/src/modules/device/domain/repositories/device.repository.ts`
5. `/src/modules/device/infrastructure/orm-entities/device.orm-entity.ts`
6. `/src/modules/device/infrastructure/mappers/device.mapper.ts`
7. `/src/modules/device/infrastructure/repositories/device.repository.ts`
8. `/src/modules/device/application/services/device.service.ts`

## Status

✅ **Complete** - Phase 2 Device Module Implementation

- [x] Database migration created
- [x] Domain entity with business logic
- [x] Repository pattern implementation
- [x] Application service layer
- [x] REST API controller with all endpoints
- [x] DTOs with validation
- [x] Swagger/OpenAPI documentation
- [x] Module registered in AppModule
- [x] Code compiles successfully

## Next Steps

1. **Run Migration:** Execute migration in development/staging/production
2. **Integration Testing:** Test with actual mobile app
3. **Auth Integration:** Update login flow to register devices
4. **OTP Integration:** Implement device trust checks in OTP flow
5. **Notification Integration:** Use FCM tokens for push notifications
6. **Monitoring:** Add metrics for device registration/trust events
7. **Admin Dashboard:** Add device management UI for support team

## Notes

- The module follows NestJS Clean Architecture patterns
- All code uses TypeScript strict mode
- Proper error handling with custom exceptions
- Repository pattern allows easy testing with mocks
- Domain entity encapsulates all business rules
- DTOs provide API validation and documentation
- Indexes optimized for common query patterns
