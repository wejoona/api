# BCEAO Compliance Engine

Comprehensive regulatory compliance module for JoonaPay USDC Wallet, implementing BCEAO (Central Bank of West African States) requirements and FATF recommendations.

## Overview

The Compliance Engine provides automated AML/CFT monitoring, regulatory reporting, and suspicious activity detection for operations in the West African Economic and Monetary Union (WAEMU/UEMOA).

### Regulatory Framework

- **BCEAO**: Central Bank of West African States directives
- **FATF**: Financial Action Task Force recommendations (R.10, R.11, R.20, R.21)
- **WAEMU/UEMOA**: AML/CFT standards for member states
- **Retention**: 7-year data retention mandate

### WAEMU Member States

- Benin (BJ)
- Burkina Faso (BF)
- Ivory Coast/Côte d'Ivoire (CI)
- Guinea-Bissau (GW)
- Mali (ML)
- Niger (NE)
- Senegal (SN)
- Togo (TG)

## Architecture

```
compliance/
├── domain/
│   └── compliance.types.ts          # Core types and interfaces
├── application/
│   ├── services/
│   │   ├── bceao-reporting.service.ts      # Periodic BCEAO reports
│   │   ├── aml-cft.service.ts              # AML/CFT detection engine
│   │   ├── sar-generator.service.ts        # SAR generation & management
│   │   └── compliance-dashboard.service.ts # Dashboard & analytics
│   ├── controllers/
│   │   └── compliance.controller.ts        # Admin API endpoints
│   └── dto/                                # Request/response DTOs
├── infrastructure/
│   └── orm-entities/
│       ├── compliance-report.orm-entity.ts       # BCEAO reports
│       ├── suspicious-activity-report.orm-entity.ts  # SARs
│       └── compliance-alert.orm-entity.ts        # Real-time alerts
└── compliance.module.ts             # Module definition
```

## Features

### 1. BCEAO Reporting Service

Automated generation of periodic compliance reports:

- **Daily Reports**: Generated at midnight WAT
- **Weekly Reports**: Generated Sunday midnight WAT
- **Monthly Reports**: Generated 1st of month WAT
- **Ad-hoc Reports**: Manual generation for audits

**Key Metrics Tracked:**
- Total transaction volumes (USDC & XOF)
- Cross-border transaction counts
- Large transactions (>1M XOF / ~$1,600 USD)
- User activity statistics
- Suspicious activity summary

### 2. AML/CFT Detection Engine

Real-time transaction screening and pattern detection:

**Detection Capabilities:**
- **Structuring (Smurfing)**: Multiple transactions below threshold
- **Velocity Anomalies**: Abnormal transaction frequency
- **Geographic Risk**: High-risk jurisdiction involvement
- **PEP Screening**: Politically Exposed Person flagging
- **Rapid Movement**: Quick fund transfers (layering)
- **Round Amounts**: Suspiciously round transaction values

**Risk Scoring:**
- Low: 0-24
- Medium: 25-49
- High: 50-74
- Critical: 75-100

### 3. SAR Generator

Suspicious Activity Report creation and lifecycle management:

**SAR Lifecycle:**
1. **Draft**: Automated detection or manual flag
2. **Under Investigation**: Compliance officer review
3. **Submitted**: Filed with BCEAO
4. **Closed**: Investigation complete
5. **Dismissed**: False positive

**BCEAO Requirements:**
- File within 48 hours of detection
- Comprehensive narrative explanation
- Complete transaction history
- Customer due diligence data
- Risk assessment justification

### 4. Compliance Dashboard

Centralized compliance monitoring for officers:

- Real-time alerts feed
- Pending SARs requiring action
- Report submission queue
- Risk trend analysis
- Compliance health score

## API Endpoints

### Dashboard

```
GET /api/v1/compliance/dashboard?days=30
GET /api/v1/compliance/dashboard/health
GET /api/v1/compliance/dashboard/activity?hours=24
GET /api/v1/compliance/dashboard/pending
```

### BCEAO Reports

```
GET    /api/v1/compliance/reports?type=daily&limit=50
GET    /api/v1/compliance/reports/:reportId
POST   /api/v1/compliance/reports/generate
PUT    /api/v1/compliance/reports/:reportId/approve
POST   /api/v1/compliance/reports/:reportId/submit
GET    /api/v1/compliance/reports/:reportId/export
GET    /api/v1/compliance/reports/statistics?days=30
```

### Suspicious Activity Reports

```
GET    /api/v1/compliance/sars?status=draft&limit=50
GET    /api/v1/compliance/sars/:sarId
POST   /api/v1/compliance/sars
PUT    /api/v1/compliance/sars/:sarId/investigation
POST   /api/v1/compliance/sars/:sarId/submit
POST   /api/v1/compliance/sars/:sarId/close
POST   /api/v1/compliance/sars/:sarId/dismiss
GET    /api/v1/compliance/sars/:sarId/export
GET    /api/v1/compliance/sars/statistics?days=30
GET    /api/v1/compliance/users/:userId/sars
```

### Alerts

```
GET    /api/v1/compliance/alerts?severity=high&limit=50
POST   /api/v1/compliance/alerts/:alertId/acknowledge
POST   /api/v1/compliance/alerts/:alertId/resolve
```

### Risk Assessment

```
GET    /api/v1/compliance/users/:userId/risk-profile
POST   /api/v1/compliance/users/:userId/analyze
POST   /api/v1/compliance/analysis/batch?daysBack=7
```

## Configuration

Add to `.env`:

```bash
# BCEAO Compliance
BCEAO_COMPLIANCE_ENABLED=true
LARGE_TRANSACTION_THRESHOLD=1000000  # XOF
DAILY_REPORT_TIME=00:00
REPORT_RETENTION_DAYS=2555  # 7 years
AUTO_FLAG_VELOCITY_THRESHOLD=5
STRUCTURING_TIME_WINDOW=24  # hours
CROSS_BORDER_ALERT_ENABLED=true
AUTO_GENERATE_SAR=false
SAR_AUTO_GENERATION_THRESHOLD=85
XOF_TO_USDC_RATE=600

# BCEAO API (when available)
BCEAO_API_URL=https://api.bceao.int
BCEAO_API_KEY=your_api_key
BCEAO_INSTITUTION_ID=your_institution_id

# PEP Screening (optional)
PEP_SCREENING_ENABLED=false
PEP_SCREENING_PROVIDER=world-check
```

## Database Schema

### compliance_reports

```sql
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY,
  report_type VARCHAR(20) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  total_transactions INTEGER DEFAULT 0,
  total_volume DECIMAL(18,6) DEFAULT 0,
  total_volume_xof DECIMAL(18,2) DEFAULT 0,
  cross_border_count INTEGER DEFAULT 0,
  cross_border_volume DECIMAL(18,6) DEFAULT 0,
  large_transaction_count INTEGER DEFAULT 0,
  flagged_transactions JSONB DEFAULT '[]',
  unique_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  suspicious_activity_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  report_data JSONB,
  bceao_reference VARCHAR(100),
  generated_by UUID,
  reviewed_by UUID,
  submitted_by UUID,
  submitted_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_period ON compliance_reports(period_start, period_end);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX idx_compliance_reports_submitted ON compliance_reports(submitted_at);
CREATE INDEX idx_compliance_reports_archived ON compliance_reports(archived_at);
```

### suspicious_activity_reports

```sql
CREATE TABLE suspicious_activity_reports (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_ids JSONB DEFAULT '[]',
  trigger_reason VARCHAR(50) NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  narrative TEXT NOT NULL,
  detection_method VARCHAR(20) NOT NULL,
  detected_at TIMESTAMP NOT NULL,
  status VARCHAR(30) DEFAULT 'draft',
  user_phone VARCHAR(20) NOT NULL,
  user_first_name VARCHAR(100),
  user_last_name VARCHAR(100),
  user_country_code VARCHAR(3) NOT NULL,
  user_kyc_status VARCHAR(20) NOT NULL,
  user_account_age_days INTEGER NOT NULL,
  total_amount DECIMAL(18,6) DEFAULT 0,
  total_amount_xof DECIMAL(18,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  investigated_by UUID,
  investigation_notes TEXT,
  investigation_started_at TIMESTAMP,
  submitted_by UUID,
  submitted_at TIMESTAMP,
  bceao_reference VARCHAR(100),
  closed_at TIMESTAMP,
  closed_by UUID,
  closed_reason TEXT,
  pattern_indicators JSONB,
  related_sar_ids JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

CREATE INDEX idx_sar_user ON suspicious_activity_reports(user_id);
CREATE INDEX idx_sar_trigger ON suspicious_activity_reports(trigger_reason);
CREATE INDEX idx_sar_status ON suspicious_activity_reports(status);
CREATE INDEX idx_sar_risk_level ON suspicious_activity_reports(risk_level);
CREATE INDEX idx_sar_detected ON suspicious_activity_reports(detected_at);
CREATE INDEX idx_sar_submitted ON suspicious_activity_reports(submitted_at);
CREATE INDEX idx_sar_reference ON suspicious_activity_reports(bceao_reference);
CREATE INDEX idx_sar_archived ON suspicious_activity_reports(archived_at);
```

### compliance_alerts

```sql
CREATE TABLE compliance_alerts (
  id UUID PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  resolution TEXT,
  escalated_to_sar BOOLEAN DEFAULT false,
  sar_id UUID,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alert_type ON compliance_alerts(alert_type);
CREATE INDEX idx_alert_severity ON compliance_alerts(severity);
CREATE INDEX idx_alert_user ON compliance_alerts(user_id);
CREATE INDEX idx_alert_transaction ON compliance_alerts(transaction_id);
CREATE INDEX idx_alert_resolved ON compliance_alerts(resolved);
CREATE INDEX idx_alert_created ON compliance_alerts(created_at);
CREATE INDEX idx_alert_sar ON compliance_alerts(sar_id);
```

## Integration

### 1. Import Module in App Module

```typescript
import { ComplianceModule } from '@modules/compliance';

@Module({
  imports: [
    // ... other modules
    ComplianceModule,
  ],
})
export class AppModule {}
```

### 2. Real-time Transaction Screening

Integrate AML/CFT service in transaction flow:

```typescript
import { AMLCFTService } from '@modules/compliance';

@Injectable()
export class TransactionService {
  constructor(private readonly amlCftService: AMLCFTService) {}

  async createTransaction(userId: string, amount: number, recipientId?: string) {
    // Screen transaction before execution
    const riskAssessment = await this.amlCftService.analyzeTransaction(
      userId,
      amount,
      recipientId,
    );

    if (!riskAssessment.approved) {
      throw new ForbiddenException('Transaction blocked due to compliance risk');
    }

    if (riskAssessment.requiresManualReview) {
      // Hold transaction for manual review
      return this.createPendingTransaction(userId, amount, recipientId);
    }

    // Proceed with transaction
    return this.executeTransaction(userId, amount, recipientId);
  }
}
```

### 3. Listen to Compliance Events

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class NotificationService {
  @OnEvent('compliance.alert.created')
  async handleComplianceAlert(payload: { alertId: string; severity: string }) {
    // Send notification to compliance officers
    await this.notifyComplianceTeam(payload);
  }

  @OnEvent('compliance.sar.created')
  async handleSARCreated(payload: { sarId: string; userId: string }) {
    // Notify senior compliance officer
    await this.notifySeniorOfficer(payload);
  }

  @OnEvent('compliance.sar.submitted')
  async handleSARSubmitted(payload: { sarId: string; bceaoReference: string }) {
    // Log submission confirmation
    await this.logSARSubmission(payload);
  }
}
```

## Usage Examples

### Generate Daily Report Manually

```typescript
const report = await bceaoReportingService.generateDailyReport();
console.log(`Report generated: ${report.id}`);
```

### Analyze User for Suspicious Activity

```typescript
const riskProfile = await amlCftService.getUserRiskProfile(userId);

if (riskProfile.overallRiskScore > 70) {
  console.log(`High-risk user detected: ${userId}`);
  console.log(`Flags: ${riskProfile.flags.join(', ')}`);
}
```

### Create Manual SAR

```typescript
const sar = await sarGeneratorService.createManualSAR(
  userId,
  transactionIds,
  'User conducted multiple high-value transactions to different recipients...',
  officerId,
  75,
);
```

### Check Transaction Before Execution

```typescript
const assessment = await amlCftService.analyzeTransaction(
  userId,
  1500, // USDC
  recipientId,
);

if (!assessment.approved) {
  throw new Error('Transaction blocked');
}

if (assessment.requiresManualReview) {
  // Queue for manual review
  await queueForReview(transactionId, assessment);
}
```

## Scheduled Jobs

The module automatically runs the following scheduled jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Report | 00:00 WAT | Generate daily transaction summary |
| Weekly Report | Sunday 00:00 WAT | Generate weekly aggregate report |
| Monthly Report | 1st day 00:00 WAT | Generate monthly compliance report |

All jobs run in West Africa Time (WAT = UTC+0) timezone.

## Thresholds & Limits

### BCEAO Reporting Thresholds

- **Large Transaction**: 1,000,000 XOF (~$1,600 USD)
- **Cross-border**: All transactions outside WAEMU
- **Retention Period**: 7 years (2,555 days)

### AML/CFT Detection Thresholds

- **Velocity**: 5 transactions per hour (configurable)
- **Structuring Window**: 24 hours
- **Rapid Movement**: Funds out within 2 hours of deposit
- **SAR Auto-generation**: Risk score ≥ 85 (if enabled)

### Risk Levels

- **Low** (0-24): Normal activity, no action needed
- **Medium** (25-49): Monitor, log alert
- **High** (50-74): Requires manual review
- **Critical** (75-100): Auto-block or immediate escalation

## Security Considerations

### Access Control

All compliance endpoints require:
- Authentication (JWT)
- Admin or Compliance Officer role
- Audit logging of all actions

### Data Protection

- PII encryption in database
- Access logs for all SAR views
- No-tipping-off compliance (users not notified of SARs)
- Secure export formats

### Audit Trail

All compliance actions are logged:
- Report generation and submission
- SAR creation and filing
- Alert acknowledgment and resolution
- Risk assessments performed

## Monitoring & Alerts

### Real-time Alerts

Compliance officers receive alerts for:
- High/Critical risk transactions
- Multiple structuring patterns detected
- PEP transactions
- Cross-border high-value transactions

### Health Monitoring

Compliance health score tracks:
- Report submission timeliness
- Alert resolution rate
- SAR filing rate
- False positive rate
- Backlog management

## Future Enhancements

### Planned Features

1. **BCEAO API Integration**
   - Direct submission to BCEAO systems
   - Real-time acknowledgment
   - Status tracking

2. **PEP Database Integration**
   - World-Check (Refinitiv)
   - Dow Jones Risk & Compliance
   - ComplyAdvantage

3. **Advanced ML Models**
   - Behavioral biometrics
   - Network analysis (transaction graphs)
   - Predictive risk scoring

4. **Enhanced Geographic Risk**
   - Real-time sanctions list updates
   - Country risk score feeds
   - Travel pattern analysis

5. **Automated Remediation**
   - Smart hold/release mechanisms
   - Risk-based transaction limits
   - Dynamic KYC requirements

## Testing

### Unit Tests

```bash
npm run test -- compliance
```

### Integration Tests

```bash
npm run test:e2e -- compliance
```

### Manual Testing

Use Postman collection or cURL:

```bash
# Get dashboard
curl -X GET http://localhost:3000/api/v1/compliance/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Create manual SAR
curl -X POST http://localhost:3000/api/v1/compliance/sars \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "transactionIds": ["tx-id-1", "tx-id-2"],
    "narrative": "Suspicious pattern detected...",
    "riskScore": 75
  }'
```

## Compliance Best Practices

1. **Review Daily Reports**: Check daily reports each morning
2. **Investigate Alerts Promptly**: Address high/critical alerts within 24h
3. **File SARs Timely**: Submit to BCEAO within 48 hours
4. **Document Decisions**: Add notes to all investigations
5. **Regular Audits**: Weekly review of pending items
6. **Update Risk Models**: Quarterly review of thresholds
7. **Staff Training**: Ensure officers understand BCEAO requirements

## Support

For compliance-related questions:
- Technical: compliance-tech@joonapay.com
- Regulatory: compliance-officer@joonapay.com
- BCEAO liaison: regulatory@joonapay.com

## References

- [BCEAO Official Website](https://www.bceao.int)
- [FATF Recommendations](https://www.fatf-gafi.org/recommendations.html)
- [WAEMU AML/CFT Framework](https://www.uemoa.int)
- JoonaPay Compliance Policy (Internal)
