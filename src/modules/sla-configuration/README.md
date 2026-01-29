# SLA Configuration Module

Service Level Agreement (SLA) configuration and tracking system for support tickets, KYC submissions, and other time-sensitive operations.

## Overview

This module provides:
- **SLA Configuration Management**: Define response and resolution time targets
- **Automatic SLA Tracking**: Monitor compliance and detect breaches
- **Escalation System**: Auto-escalate when SLA thresholds are reached
- **Metrics & Reporting**: Track SLA compliance rates

## Features

### SLA Configuration
- Category-based SLAs (support, KYC, transactions, security, etc.)
- Priority-based response times (urgent, high, medium, low)
- Configurable response, resolution, and escalation times
- Business hours vs. 24/7 support options

### SLA Tracking
- Real-time breach detection
- Automatic escalation notifications
- Event-driven alerts
- SLA metrics calculation

### Integration
- Support ticket system integration
- KYC verification workflow integration
- Event-driven architecture for notifications

## Database Schema

```sql
CREATE TABLE system.sla_configurations (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL,
  category varchar(50) NOT NULL,
  priority varchar(20) NOT NULL,
  response_time_minutes integer NOT NULL,
  resolution_time_minutes integer NOT NULL,
  escalation_after_minutes integer,
  is_active boolean DEFAULT true,
  business_hours_only boolean DEFAULT false,
  created_at timestamp,
  updated_at timestamp,
  UNIQUE(category, priority)
);
```

## API Endpoints

### Admin Endpoints (Requires ADMIN role)

#### Create SLA Configuration
```
POST /admin/sla-configurations
```
```json
{
  "name": "Critical Support - Immediate Response",
  "category": "support",
  "priority": "urgent",
  "responseTimeMinutes": 15,
  "resolutionTimeMinutes": 120,
  "escalationAfterMinutes": 60,
  "businessHoursOnly": false
}
```

#### Get All SLA Configurations
```
GET /admin/sla-configurations
```

#### Get Active SLA Configurations
```
GET /admin/sla-configurations/active
```

#### Get SLA Configuration by ID
```
GET /admin/sla-configurations/:id
```

#### Update SLA Configuration
```
PUT /admin/sla-configurations/:id
```
```json
{
  "responseTimeMinutes": 30,
  "resolutionTimeMinutes": 240
}
```

#### Activate/Deactivate SLA
```
PUT /admin/sla-configurations/:id/activate
PUT /admin/sla-configurations/:id/deactivate
```

#### Delete SLA Configuration
```
DELETE /admin/sla-configurations/:id
```

## Usage Examples

### Check SLA Status for a Ticket

```typescript
import { SlaConfigurationService } from '@/modules/sla-configuration';

// Inject service
constructor(private readonly slaService: SlaConfigurationService) {}

// Check if SLA is breached
async checkTicketSla(ticket: SupportTicket) {
  const result = await this.slaService.checkSlaBreached(
    SlaCategory.SUPPORT,
    SlaPriority.HIGH,
    ticket.createdAt,
    ticket.firstResponseAt,
    ticket.resolvedAt,
    ticket.escalatedAt,
  );

  if (result.isResponseBreached) {
    // Send alert - response SLA breached
  }

  if (result.isResolutionBreached) {
    // Send alert - resolution SLA breached
  }

  if (result.shouldEscalate) {
    // Auto-escalate ticket
  }
}
```

### Assign SLA to New Ticket

```typescript
import { SupportSlaService } from '@/modules/support/application/services/support-sla.service';

// Inject service
constructor(private readonly supportSlaService: SupportSlaService) {}

// After creating a ticket
async createTicket(dto: CreateTicketDto) {
  const ticket = await this.supportService.createTicket(dto);

  // Assign SLA configuration
  await this.supportSlaService.assignSlaToNewTicket(ticket);

  return ticket;
}
```

### Get SLA Metrics for a Ticket

```typescript
const metrics = await this.supportSlaService.getTicketSlaMetrics(ticketId);

console.log({
  responseTimeMs: metrics.responseTimeMs,
  resolutionTimeMs: metrics.resolutionTimeMs,
  slaResponseTimeMet: metrics.slaResponseTimeMet,
  slaResolutionTimeMet: metrics.slaResolutionTimeMet,
  slaConfig: metrics.slaConfig,
});
```

## Default SLA Configurations

### Support Tickets
- **Urgent**: 15min response, 2h resolution, 1h escalation (24/7)
- **High**: 1h response, 4h resolution, 2h escalation (24/7)
- **Medium**: 4h response, 24h resolution, 8h escalation (business hours)
- **Low**: 24h response, 72h resolution, 36h escalation (business hours)

### KYC Verification
- **Urgent**: 1h response, 4h resolution, 2h escalation (24/7)
- **High**: 4h response, 12h resolution, 6h escalation (24/7)
- **Medium**: 12h response, 24h resolution, 12h escalation (business hours)
- **Low**: 24h response, 48h resolution, 24h escalation (business hours)

### Security Incidents
- **Urgent**: 5min response, 1h resolution, 30min escalation (24/7)
- **High**: 30min response, 2h resolution, 1h escalation (24/7)
- **Medium**: 2h response, 8h resolution, 4h escalation (24/7)

### Transaction Disputes
- **Urgent**: 30min response, 4h resolution, 2h escalation (24/7)
- **High**: 2h response, 8h resolution, 4h escalation (24/7)
- **Medium**: 8h response, 48h resolution, 24h escalation (business hours)

## Events

### SLA Breach Event
```typescript
{
  event: 'sla.breached',
  data: {
    entityId: 'ticket-id',
    entityType: 'support_ticket',
    category: 'support',
    priority: 'high',
    breachType: 'response', // 'response' | 'resolution' | 'escalation'
    createdAt: Date,
    breachedAt: Date,
    timeElapsedMs: 3600000,
    slaTimeMs: 1800000
  }
}
```

### SLA Assignment Event
```typescript
{
  event: 'ticket.sla.assigned',
  data: {
    ticketId: 'ticket-id',
    slaConfigId: 'config-id',
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 240
  }
}
```

## Monitoring & Alerts

The SLA tracking service runs a cron job every 10 minutes to check for SLA breaches:

```typescript
@Cron(CronExpression.EVERY_10_MINUTES)
async checkAllSlas() {
  // Queries open tickets and pending KYC submissions
  // Checks their SLA status
  // Emits breach events for notification system
}
```

## Architecture

```
sla-configuration/
├── domain/
│   ├── entities/
│   │   └── sla-configuration.entity.ts
│   └── repositories/
│       └── sla-configuration.repository.ts
├── infrastructure/
│   ├── orm-entities/
│   │   └── sla-configuration.orm-entity.ts
│   ├── repositories/
│   │   └── sla-configuration.repository.ts
│   └── mappers/
│       └── sla-configuration.mapper.ts
├── application/
│   ├── controllers/
│   │   └── sla-configuration.controller.ts
│   ├── services/
│   │   ├── sla-configuration.service.ts
│   │   └── sla-tracking.service.ts
│   └── dto/
│       └── sla-configuration.dto.ts
└── sla-configuration.module.ts
```

## Migration

Run the migration to create the SLA configurations table:

```bash
npm run migration:run
```

This will create the table and seed default SLA configurations.

## Testing

```bash
# Unit tests
npm run test -- sla-configuration

# E2E tests
npm run test:e2e -- sla-configuration
```

## Future Enhancements

- [ ] Business hours calculation (exclude weekends/holidays)
- [ ] SLA pause functionality (for waiting on customer)
- [ ] Advanced reporting dashboard
- [ ] SLA configuration versioning
- [ ] Custom SLA rules engine
- [ ] Integration with compliance reporting
