# HTTP Request/Response Logging System

## Overview

The `LoggingInterceptor` provides comprehensive, structured logging for all HTTP requests and responses in the JoonaPay USDC Wallet backend. It features automatic sensitive data sanitization, correlation ID tracking, performance monitoring, and environment-specific log levels.

## Features

### 1. Structured JSON Logging
All logs are output in JSON format for easy parsing by log aggregation tools (Datadog, CloudWatch, ELK, etc.):

```json
{
  "type": "http_request",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-29T10:30:45.123Z",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "path": "/wallet/transfer",
  "ip": "192.168.1.100",
  "userAgent": "JoonaPay-Mobile/1.0.0",
  "userId": "user-123",
  "statusCode": 200,
  "duration": 145,
  "durationMs": "145ms"
}
```

### 2. Correlation IDs for Request Tracing
Every request gets a unique correlation ID that follows the request through the entire system:

- **Auto-generated**: UUID v4 if no ID provided
- **Client-provided**: Honors `X-Correlation-ID` or `X-Request-ID` headers
- **Response headers**: Returns ID in both `X-Request-ID` and `X-Correlation-ID` headers
- **Cross-service tracking**: Pass the ID to external services for distributed tracing

```bash
# Example: Client sends correlation ID
curl -H "X-Correlation-ID: my-custom-id" https://api.joonapay.com/api/v1/wallet

# Response includes:
# X-Request-ID: my-custom-id
# X-Correlation-ID: my-custom-id
```

### 3. Automatic Sensitive Data Sanitization

Protects sensitive information by automatically redacting:

#### Request Body & Query Parameters
- `password`, `confirmPassword`, `newPassword`, `oldPassword`
- `pin`, `pinHash`, `pinCode`
- `token`, `accessToken`, `refreshToken`
- `otp`, `otpCode`, `verificationCode`
- `secret`, `apiKey`, `privateKey`, `mnemonic`, `seed`
- `cvv`, `cardNumber`, `accountNumber`, `iban`
- `ssn`, `taxId`

#### Request Headers
- `authorization`
- `cookie`
- `x-api-key`
- `x-circle-api-key`

#### URL Query Parameters
- `token`, `key`, `secret`, `password`, `pin`

Example:
```json
// Original request body:
{
  "email": "user@example.com",
  "password": "supersecret123",
  "pin": "1234"
}

// Logged as:
{
  "email": "user@example.com",
  "password": "[REDACTED]",
  "pin": "[REDACTED]"
}
```

### 4. Environment-Based Log Levels

#### Development Mode (`NODE_ENV=development`)
- **Request logs**: `log` level with full details
- **Includes**: sanitized headers, query params, body, user email
- **Stack traces**: Full error stack traces
- **Success responses**: `log` level

#### Production Mode (`NODE_ENV=production`)
- **Request logs**: `debug` level (minimal noise)
- **Includes**: only field names, not values
- **Stack traces**: Omitted for security
- **Success responses**: `debug` level
- **Errors**: Always logged at `error` level

### 5. Performance Monitoring

#### Request Duration Tracking
Every request is timed and logged with millisecond precision:

```json
{
  "duration": 145,
  "durationMs": "145ms"
}
```

#### Slow Request Detection
Requests taking longer than 1000ms are automatically flagged:

```json
{
  "type": "http_slow_response",
  "duration": 1234,
  "warning": "Request exceeded 1000ms threshold"
}
```

#### Log Levels Based on Status
- `2xx`: `debug` (prod) or `log` (dev)
- `4xx`: `warn` (client errors)
- `5xx`: `error` (server errors)
- `>1000ms`: `warn` (slow requests)

### 6. User Tracking

Automatically captures authenticated user information:

```json
{
  "userId": "user-123",
  "userEmail": "user@example.com"  // Only in development
}
```

Works with JWT authentication where user is attached to request:
```typescript
request['user'] = { id: 'user-123', email: 'user@example.com' };
```

### 7. IP Address Detection

Handles various proxy configurations:

1. `X-Forwarded-For` header (first IP)
2. `X-Real-IP` header
3. `request.ip`
4. `request.socket.remoteAddress`
5. Fallback: `'unknown'`

## Integration

### Already Integrated
The interceptor is already configured globally in `/src/main.ts`:

```typescript
app.useGlobalInterceptors(
  new LoggingInterceptor(),
  new MetricsInterceptor(metricsService),
  new VersionHeaderInterceptor(),
);
```

No additional setup required - all endpoints are automatically logged.

### Accessing Correlation ID in Controllers

The correlation ID is attached to the request object:

```typescript
@Post('transfer')
async transfer(@Req() request: Request) {
  const correlationId = request['requestId'];
  this.logger.log(`Processing transfer: ${correlationId}`);
  // ... transfer logic
}
```

### Passing Correlation ID to Services

```typescript
// In controller
const result = await this.walletService.transfer({
  correlationId: request['requestId'],
  amount: dto.amount,
  recipientId: dto.recipientId,
});

// In service (for external API calls)
async transfer(data: TransferDto) {
  const response = await this.httpService.post('https://api.circle.com/transfers', {
    // ... transfer data
  }, {
    headers: {
      'X-Correlation-ID': data.correlationId,
    },
  });
}
```

## Log Types

### 1. Request Log (`http_request`)
Logged when request arrives:

```json
{
  "type": "http_request",
  "correlationId": "uuid",
  "timestamp": "ISO-8601",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "path": "/wallet/transfer",
  "ip": "1.2.3.4",
  "userAgent": "JoonaPay-Mobile/1.0.0",
  "userId": "user-123",
  "userEmail": "user@example.com",  // dev only
  "queryParams": ["page", "limit"],  // prod: field names only
  "bodyFields": ["amount", "recipientId"],  // prod: field names only
  "contentType": "application/json"
}
```

### 2. Response Log (`http_response`)
Logged on successful response:

```json
{
  "type": "http_response",
  "correlationId": "uuid",
  "timestamp": "ISO-8601",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "statusCode": 200,
  "duration": 145,
  "durationMs": "145ms",
  "userId": "user-123",
  "hasData": true,  // dev only
  "dataType": "object",  // dev only
  "responseSize": 1234  // dev only
}
```

### 3. Error Log (`http_error`)
Logged when request fails:

```json
{
  "type": "http_error",
  "correlationId": "uuid",
  "timestamp": "ISO-8601",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "statusCode": 400,
  "duration": 45,
  "durationMs": "45ms",
  "userId": "user-123",
  "error": {
    "name": "BadRequestException",
    "message": "Insufficient funds",
    "code": "INSUFFICIENT_FUNDS",
    "stack": "...",  // dev only
    "details": {}  // dev only
  }
}
```

### 4. Slow Response Log (`http_slow_response`)
Logged when response takes >1000ms:

```json
{
  "type": "http_slow_response",
  "correlationId": "uuid",
  "timestamp": "ISO-8601",
  "method": "POST",
  "url": "/api/v1/wallet/transfer",
  "statusCode": 200,
  "duration": 1234,
  "durationMs": "1234ms",
  "userId": "user-123",
  "warning": "Request exceeded 1000ms threshold"
}
```

## Querying Logs

### Using grep (local development)
```bash
# Find all requests for a specific correlation ID
grep "correlationId\":\"550e8400" logs/app.log

# Find all slow requests
grep "http_slow_response" logs/app.log

# Find all errors
grep "http_error" logs/app.log

# Find requests by user
grep "userId\":\"user-123" logs/app.log
```

### Using jq (structured queries)
```bash
# Parse and pretty-print logs
cat logs/app.log | jq 'select(.type == "http_request")'

# Find requests with duration > 500ms
cat logs/app.log | jq 'select(.duration > 500)'

# Count requests by method
cat logs/app.log | jq 'select(.type == "http_request") | .method' | sort | uniq -c
```

### CloudWatch Insights
```sql
-- Find slow requests
fields @timestamp, method, url, duration, userId
| filter type = "http_slow_response"
| sort duration desc

-- Error rate by endpoint
fields url, statusCode
| filter type = "http_error"
| stats count() by url

-- Trace request through system
fields @timestamp, type, method, url, statusCode, duration
| filter correlationId = "550e8400-e29b-41d4-a716-446655440000"
| sort @timestamp asc
```

### Datadog
```
type:http_error status:>=500
type:http_slow_response duration:>1000
@correlationId:"550e8400-e29b-41d4-a716-446655440000"
```

## Testing

Run the test suite:
```bash
npm run test -- logging.interceptor.spec.ts
```

Test coverage includes:
- Correlation ID generation and propagation
- Sensitive data sanitization (passwords, PINs, tokens)
- Request/response logging
- Error handling and logging
- IP address extraction
- User tracking
- Performance timing

## Security Considerations

### What is Logged
- Request metadata (method, URL, IP, user agent)
- User ID (never passwords or tokens)
- Response status codes and duration
- Error messages (not sensitive error details)
- Sanitized request/response structure

### What is NOT Logged
- Passwords, PINs, tokens, API keys
- Full request/response bodies in production
- Sensitive headers (authorization, cookies)
- Credit card numbers, SSNs, tax IDs
- Private keys, mnemonics, seeds

### GDPR Compliance
- User emails only logged in development
- IP addresses logged for security auditing (legitimate interest)
- Correlation IDs are temporary (not PII)
- No persistent user tracking beyond session

## Performance Impact

The interceptor is highly optimized:
- **Minimal overhead**: ~1-2ms per request
- **Async logging**: Non-blocking JSON stringification
- **Lazy sanitization**: Only in development mode
- **No external dependencies**: Pure TypeScript

## Troubleshooting

### Logs not appearing
1. Check `NODE_ENV` - production logs use `debug` level
2. Verify logger configuration in NestJS
3. Check if interceptor is registered in `main.ts`

### Correlation ID not propagating
1. Verify response headers include `X-Request-ID`
2. Check if client is sending correlation ID header
3. Ensure external services receive correlation ID

### Sensitive data still in logs
1. Add field name to `sensitiveFields` array in interceptor
2. Check if field name uses different casing
3. Verify sanitization logic in `sanitizeObject()` method

## Future Enhancements

- [ ] OpenTelemetry integration for distributed tracing
- [ ] Async logging with queue for better performance
- [ ] Configurable log retention policies
- [ ] Log sampling for high-traffic endpoints
- [ ] Custom log formatters (JSON, plain text, etc.)
- [ ] Integration with external logging services (Sentry, Loggly)
- [ ] Performance metrics aggregation (P50, P95, P99)
- [ ] Request/response body logging toggle per endpoint

## Related Files

- `/src/common/interceptors/logging.interceptor.ts` - Main implementation
- `/src/common/interceptors/logging.interceptor.spec.ts` - Test suite
- `/src/common/logger/typeorm-logger.ts` - Database query logging
- `/src/main.ts` - Global interceptor registration
- `/src/config/configuration.ts` - Environment configuration

## Support

For questions or issues, contact the backend team or refer to:
- NestJS Interceptors: https://docs.nestjs.com/interceptors
- Structured Logging Best Practices: https://www.datadoghq.com/blog/structured-logging/
