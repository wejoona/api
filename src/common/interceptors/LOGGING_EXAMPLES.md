# Logging Interceptor - Example Outputs

## Development Mode Examples

### 1. Simple GET Request

**Request:**
```bash
GET /api/v1/wallet/balance
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Log:**
```json
{
  "type": "http_request",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-29T10:30:45.123Z",
  "method": "GET",
  "url": "/api/v1/wallet/balance",
  "path": "/wallet/balance",
  "ip": "192.168.1.100",
  "userAgent": "JoonaPay-Mobile/1.0.0 (iOS 16.0; iPhone14,2)",
  "userId": "user-123",
  "userEmail": "john.doe@example.com",
  "headers": {
    "host": "localhost:3000",
    "connection": "keep-alive",
    "content-type": "application/json",
    "user-agent": "JoonaPay-Mobile/1.0.0",
    "authorization": "[REDACTED]",
    "accept": "*/*"
  },
  "query": {},
  "body": null,
  "hasBody": false
}
```

**Response Log:**
```json
{
  "type": "http_response",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-29T10:30:45.268Z",
  "method": "GET",
  "url": "/api/v1/wallet/balance",
  "statusCode": 200,
  "duration": 145,
  "durationMs": "145ms",
  "userId": "user-123",
  "hasData": true,
  "dataType": "object",
  "responseSize": 234
}
```

---

### 2. POST Request with Sensitive Data

**Request:**
```bash
POST /api/v1/wallet/transfer
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Pin-Token: pin-token-xyz

{
  "amount": 100.50,
  "recipientId": "user-456",
  "pin": "123456",
  "description": "Lunch money"
}
```

**Request Log (Notice PIN is sanitized):**
```json
{
  "type": "http_request",
  "correlationId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "timestamp": "2024-01-29T10:31:00.000Z",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "path": "/wallet/transfer",
  "ip": "192.168.1.100",
  "userAgent": "JoonaPay-Mobile/1.0.0",
  "userId": "user-123",
  "userEmail": "john.doe@example.com",
  "headers": {
    "host": "localhost:3000",
    "content-type": "application/json",
    "authorization": "[REDACTED]",
    "x-pin-token": "[REDACTED]",
    "user-agent": "JoonaPay-Mobile/1.0.0"
  },
  "query": {},
  "body": {
    "amount": 100.50,
    "recipientId": "user-456",
    "pin": "[REDACTED]",
    "description": "Lunch money"
  },
  "hasBody": true
}
```

**Response Log:**
```json
{
  "type": "http_response",
  "correlationId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "timestamp": "2024-01-29T10:31:00.523Z",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "statusCode": 201,
  "duration": 523,
  "durationMs": "523ms",
  "userId": "user-123",
  "hasData": true,
  "dataType": "object",
  "responseSize": 456
}
```

---

### 3. Authentication Request

**Request:**
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "+2250123456789",
  "password": "MySecurePassword123!",
  "deviceId": "device-abc-123"
}
```

**Request Log (Password sanitized):**
```json
{
  "type": "http_request",
  "correlationId": "abc12345-6789-0def-ghij-klmnopqrstuv",
  "timestamp": "2024-01-29T10:32:00.000Z",
  "method": "POST",
  "url": "/api/v1/auth/login",
  "path": "/auth/login",
  "ip": "41.203.123.45",
  "userAgent": "JoonaPay-Mobile/1.0.0",
  "userId": null,
  "userEmail": null,
  "headers": {
    "content-type": "application/json",
    "user-agent": "JoonaPay-Mobile/1.0.0"
  },
  "query": {},
  "body": {
    "phone": "+2250123456789",
    "password": "[REDACTED]",
    "deviceId": "device-abc-123"
  },
  "hasBody": true
}
```

---

### 4. Slow Request (>1000ms)

**Response Log with Warning:**
```json
{
  "type": "http_slow_response",
  "correlationId": "slow-request-123",
  "timestamp": "2024-01-29T10:33:01.567Z",
  "method": "POST",
  "url": "/api/v1/wallet/withdrawal",
  "statusCode": 200,
  "duration": 1567,
  "durationMs": "1567ms",
  "userId": "user-123",
  "warning": "Request exceeded 1000ms threshold",
  "hasData": true,
  "dataType": "object",
  "responseSize": 789
}
```

---

### 5. Client Error (400 Bad Request)

**Request:**
```bash
POST /api/v1/wallet/transfer
Content-Type: application/json

{
  "amount": -50,
  "recipientId": "user-456"
}
```

**Error Log:**
```json
{
  "type": "http_error",
  "correlationId": "error-request-789",
  "timestamp": "2024-01-29T10:34:00.123Z",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "statusCode": 400,
  "duration": 45,
  "durationMs": "45ms",
  "userId": "user-123",
  "error": {
    "name": "BadRequestException",
    "message": "Amount must be greater than 0",
    "code": "INVALID_AMOUNT",
    "stack": "BadRequestException: Amount must be greater than 0\n    at WalletService.transfer (wallet.service.ts:123:15)\n    at async WalletController.transfer (wallet.controller.ts:45:20)",
    "details": {
      "statusCode": 400,
      "message": "Amount must be greater than 0",
      "error": "Bad Request"
    }
  }
}
```

---

### 6. Server Error (500 Internal Server Error)

**Error Log:**
```json
{
  "type": "http_error",
  "correlationId": "server-error-456",
  "timestamp": "2024-01-29T10:35:00.789Z",
  "method": "GET",
  "url": "/api/v1/wallet/transactions",
  "statusCode": 500,
  "duration": 234,
  "durationMs": "234ms",
  "userId": "user-123",
  "error": {
    "name": "InternalServerErrorException",
    "message": "Database connection failed",
    "code": "DB_CONNECTION_ERROR",
    "stack": "Error: Database connection failed\n    at Connection.connect (pg-connection.ts:67:11)\n    at async TransactionService.list (transaction.service.ts:89:5)",
    "details": {
      "statusCode": 500,
      "message": "Internal server error"
    }
  }
}
```

---

### 7. Request with Query Parameters

**Request:**
```bash
GET /api/v1/wallet/transactions?page=2&limit=20&status=completed&startDate=2024-01-01
Authorization: Bearer token
```

**Request Log:**
```json
{
  "type": "http_request",
  "correlationId": "query-request-123",
  "timestamp": "2024-01-29T10:36:00.000Z",
  "method": "GET",
  "url": "/api/v1/wallet/transactions?page=2&limit=20&status=completed&startDate=2024-01-01",
  "path": "/wallet/transactions",
  "ip": "192.168.1.100",
  "userAgent": "JoonaPay-Mobile/1.0.0",
  "userId": "user-123",
  "userEmail": "john.doe@example.com",
  "headers": {
    "authorization": "[REDACTED]",
    "user-agent": "JoonaPay-Mobile/1.0.0"
  },
  "query": {
    "page": "2",
    "limit": "20",
    "status": "completed",
    "startDate": "2024-01-01"
  },
  "body": null,
  "hasBody": false
}
```

---

### 8. Nested Sensitive Data

**Request:**
```bash
POST /api/v1/user/register
Content-Type: application/json

{
  "phone": "+2250123456789",
  "email": "user@example.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "pin": "1234"
  },
  "credentials": {
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }
}
```

**Request Log (All sensitive fields sanitized recursively):**
```json
{
  "type": "http_request",
  "correlationId": "nested-data-456",
  "timestamp": "2024-01-29T10:37:00.000Z",
  "method": "POST",
  "url": "/api/v1/user/register",
  "path": "/user/register",
  "ip": "41.203.123.45",
  "userAgent": "JoonaPay-Mobile/1.0.0",
  "userId": null,
  "userEmail": null,
  "headers": {
    "content-type": "application/json"
  },
  "query": {},
  "body": {
    "phone": "+2250123456789",
    "email": "user@example.com",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "pin": "[REDACTED]"
    },
    "credentials": {
      "password": "[REDACTED]",
      "confirmPassword": "[REDACTED]"
    }
  },
  "hasBody": true
}
```

---

## Production Mode Examples

### 1. Simple Request (Minimal Logging)

**Request Log:**
```json
{
  "type": "http_request",
  "correlationId": "prod-request-123",
  "timestamp": "2024-01-29T10:38:00.000Z",
  "method": "GET",
  "url": "/api/v1/wallet/balance",
  "path": "/wallet/balance",
  "ip": "52.23.45.67",
  "userAgent": "JoonaPay-Mobile/1.0.0",
  "userId": "user-123",
  "userEmail": null,
  "queryParams": [],
  "bodyFields": [],
  "contentType": "application/json"
}
```

**Response Log (Success - DEBUG level):**
```json
{
  "type": "http_response",
  "correlationId": "prod-request-123",
  "timestamp": "2024-01-29T10:38:00.145Z",
  "method": "GET",
  "url": "/api/v1/wallet/balance",
  "statusCode": 200,
  "duration": 145,
  "durationMs": "145ms",
  "userId": "user-123"
}
```

---

### 2. Request with Body (Field Names Only)

**Request:**
```bash
POST /api/v1/wallet/transfer
{
  "amount": 100,
  "recipientId": "user-456",
  "pin": "1234",
  "description": "Payment"
}
```

**Request Log (Production):**
```json
{
  "type": "http_request",
  "correlationId": "prod-transfer-789",
  "timestamp": "2024-01-29T10:39:00.000Z",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "path": "/wallet/transfer",
  "ip": "52.23.45.67",
  "userAgent": "JoonaPay-Mobile/1.0.0",
  "userId": "user-123",
  "userEmail": null,
  "queryParams": [],
  "bodyFields": ["amount", "recipientId", "pin", "description"],
  "contentType": "application/json"
}
```

---

### 3. Error (No Stack Trace in Production)

**Error Log:**
```json
{
  "type": "http_error",
  "correlationId": "prod-error-456",
  "timestamp": "2024-01-29T10:40:00.234Z",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "statusCode": 500,
  "duration": 234,
  "durationMs": "234ms",
  "userId": "user-123",
  "error": {
    "name": "InternalServerErrorException",
    "message": "Database connection failed",
    "code": "DB_CONNECTION_ERROR"
  }
}
```

---

## Correlation ID Tracing Example

### Scenario: Transfer Request Through System

**1. Client Request**
```bash
POST /api/v1/wallet/transfer
X-Correlation-ID: client-generated-uuid-123
```

**2. Backend Entry (Logging Interceptor)**
```json
{
  "type": "http_request",
  "correlationId": "client-generated-uuid-123",
  "timestamp": "2024-01-29T10:41:00.000Z",
  "method": "POST",
  "url": "/api/v1/wallet/transfer"
}
```

**3. Service Layer**
```typescript
// WalletService logs with same correlation ID
this.logger.log({
  correlationId: "client-generated-uuid-123",
  message: "Initiating transfer",
  amount: 100,
  recipient: "user-456"
});
```

**4. External API Call (Circle)**
```typescript
// HTTP request to Circle includes correlation ID
POST https://api.circle.com/v1/transfers
Headers:
  X-Correlation-ID: client-generated-uuid-123
```

**5. Circle Webhook Response**
```json
{
  "correlationId": "client-generated-uuid-123",
  "event": "transfer.completed",
  "transferId": "circle-transfer-789"
}
```

**6. Response to Client**
```json
HTTP/1.1 201 Created
X-Request-ID: client-generated-uuid-123
X-Correlation-ID: client-generated-uuid-123

{
  "success": true,
  "transferId": "transfer-123"
}
```

Now you can trace the entire request through all systems using:
```bash
# Search all logs for this correlation ID
grep "client-generated-uuid-123" logs/*.log

# CloudWatch Insights
fields @timestamp, @message
| filter correlationId = "client-generated-uuid-123"
| sort @timestamp asc
```

---

## IP Address Handling Examples

### 1. Direct Connection
```json
{
  "ip": "192.168.1.100"
}
```

### 2. Behind Proxy (X-Forwarded-For)
```bash
Request Headers:
  X-Forwarded-For: 1.2.3.4, 5.6.7.8, 9.10.11.12

Log:
{
  "ip": "1.2.3.4"  // First IP (original client)
}
```

### 3. Behind Load Balancer (X-Real-IP)
```bash
Request Headers:
  X-Real-IP: 52.23.45.67

Log:
{
  "ip": "52.23.45.67"
}
```

---

## Performance Metrics Summary

Aggregating logs to calculate performance metrics:

```bash
# Average response time by endpoint
cat logs/app.log | jq -r 'select(.type == "http_response") | "\(.url) \(.duration)"' | awk '{sum[$1]+=$2; count[$1]++} END {for (url in sum) print url, sum[url]/count[url]}'

# P95 response time
cat logs/app.log | jq -r 'select(.type == "http_response") | .duration' | sort -n | awk '{a[NR]=$1} END {print a[int(NR*0.95)]}'

# Error rate by status code
cat logs/app.log | jq -r 'select(.type == "http_error") | .statusCode' | sort | uniq -c
```
