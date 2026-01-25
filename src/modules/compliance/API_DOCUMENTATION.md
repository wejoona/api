# BCEAO Compliance Engine - API Documentation

## Base URL

```
Production: https://api.joonapay.com/api/v1/compliance
Staging: https://staging-api.joonapay.com/api/v1/compliance
Development: http://localhost:3000/api/v1/compliance
```

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <jwt_token>
```

Required roles: `admin` or `compliance_officer`

## Dashboard Endpoints

### GET /dashboard

Get comprehensive compliance dashboard overview.

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Request:**
```bash
GET /compliance/dashboard?days=30
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "period": {
    "start": "2025-12-26T00:00:00.000Z",
    "end": "2026-01-25T00:00:00.000Z"
  },
  "metrics": {
    "totalDeposits": 1250000.50,
    "totalWithdrawals": 850000.25,
    "totalTransfers": 425000.75,
    "totalInternalTransfers": 325000.50,
    "totalExternalTransfers": 100000.25,
    "totalCrossBorderTransactions": 42,
    "totalVolume": 2525001.50,
    "totalVolumeXof": 1515000900.00,
    "averageTransactionSize": 2500.50,
    "largeTransactions": 15,
    "activeUsers": 1250,
    "newUsers": 85,
    "suspiciousActivities": 3,
    "blockedTransactions": 2
  },
  "openAlerts": 12,
  "pendingSARs": 3,
  "pendingReports": 2,
  "recentSARs": [...],
  "recentAlerts": [...],
  "riskTrends": [
    {
      "date": "2026-01-20",
      "riskScore": 23.5,
      "alertCount": 5
    }
  ]
}
```

---

### GET /dashboard/health

Get compliance health score.

**Request:**
```bash
GET /compliance/dashboard/health
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "score": 87.5,
  "rating": "good",
  "factors": [
    {
      "name": "Report Submission Timeliness",
      "score": 95.0,
      "weight": 0.3
    },
    {
      "name": "Alert Resolution Rate",
      "score": 82.5,
      "weight": 0.25
    },
    {
      "name": "SAR Filing Rate",
      "score": 90.0,
      "weight": 0.2
    },
    {
      "name": "False Positive Control",
      "score": 85.0,
      "weight": 0.15
    },
    {
      "name": "Backlog Management",
      "score": 100.0,
      "weight": 0.1
    }
  ]
}
```

---

### GET /dashboard/activity

Get recent compliance activity.

**Query Parameters:**
- `hours` (optional): Number of hours to analyze (default: 24)

**Request:**
```bash
GET /compliance/dashboard/activity?hours=24
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "newAlerts": 8,
  "newSARs": 2,
  "reportsGenerated": 1,
  "highRiskTransactions": 3
}
```

---

### GET /dashboard/pending

Get pending items requiring action.

**Request:**
```bash
GET /compliance/dashboard/pending
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "pendingReports": [
    {
      "id": "report-uuid",
      "reportType": "daily",
      "periodStart": "2026-01-24T00:00:00.000Z",
      "periodEnd": "2026-01-24T23:59:59.999Z",
      "status": "pending_review",
      "createdAt": "2026-01-25T00:00:05.000Z"
    }
  ],
  "openAlerts": [
    {
      "id": "alert-uuid",
      "alertType": "velocity_anomaly",
      "severity": "high",
      "userId": "user-uuid",
      "title": "HIGH risk transaction detected",
      "createdAt": "2026-01-25T10:30:00.000Z"
    }
  ],
  "activeSARs": [
    {
      "id": "sar-uuid",
      "userId": "user-uuid",
      "triggerReason": "structuring",
      "riskLevel": "high",
      "status": "under_investigation",
      "detectedAt": "2026-01-23T15:45:00.000Z"
    }
  ]
}
```

## Report Endpoints

### GET /reports

List compliance reports.

**Query Parameters:**
- `type` (optional): Filter by report type (`daily`, `weekly`, `monthly`, `suspicious`)
- `limit` (optional): Number of reports to return (default: 50)

**Request:**
```bash
GET /compliance/reports?type=daily&limit=10
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "reportType": "daily",
    "periodStart": "2026-01-24T00:00:00.000Z",
    "periodEnd": "2026-01-24T23:59:59.999Z",
    "totalTransactions": 1523,
    "totalVolume": 125000.50,
    "totalVolumeXof": 75000300.00,
    "crossBorderCount": 12,
    "largeTransactionCount": 3,
    "status": "submitted",
    "bceaoReference": "BCEAO-2026-01-D-0042",
    "submittedAt": "2026-01-25T08:30:00.000Z",
    "createdAt": "2026-01-25T00:00:05.000Z"
  }
]
```

---

### GET /reports/:reportId

Get specific compliance report.

**Request:**
```bash
GET /compliance/reports/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "reportType": "daily",
  "periodStart": "2026-01-24T00:00:00.000Z",
  "periodEnd": "2026-01-24T23:59:59.999Z",
  "totalTransactions": 1523,
  "totalVolume": 125000.50,
  "totalVolumeXof": 75000300.00,
  "crossBorderCount": 12,
  "crossBorderVolume": 8500.25,
  "largeTransactionCount": 3,
  "flaggedTransactions": [
    "tx-uuid-1",
    "tx-uuid-2",
    "tx-uuid-3"
  ],
  "uniqueUsers": 842,
  "newUsers": 23,
  "suspiciousActivityCount": 1,
  "status": "submitted",
  "reportData": {
    "metrics": {...},
    "largeTransactions": [...],
    "crossBorderTransactions": [...]
  },
  "bceaoReference": "BCEAO-2026-01-D-0042",
  "generatedBy": "system",
  "submittedBy": "officer-uuid",
  "submittedAt": "2026-01-25T08:30:00.000Z",
  "createdAt": "2026-01-25T00:00:05.000Z",
  "updatedAt": "2026-01-25T08:30:00.000Z"
}
```

---

### POST /reports/generate

Generate ad-hoc compliance report.

**Request:**
```bash
POST /compliance/reports/generate
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-01-31T23:59:59.999Z"
}
```

**Response:**
```json
{
  "id": "report-uuid",
  "reportType": "monthly",
  "periodStart": "2026-01-01T00:00:00.000Z",
  "periodEnd": "2026-01-31T23:59:59.999Z",
  "status": "pending_review",
  "generatedBy": "admin-uuid",
  "createdAt": "2026-01-25T14:30:00.000Z"
}
```

---

### PUT /reports/:reportId/approve

Approve report for submission to BCEAO.

**Request:**
```bash
PUT /compliance/reports/550e8400-e29b-41d4-a716-446655440000/approve
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "notes": "Report reviewed and approved for submission"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "approved",
  "reviewedBy": "officer-uuid",
  "notes": "Report reviewed and approved for submission",
  "updatedAt": "2026-01-25T14:35:00.000Z"
}
```

---

### POST /reports/:reportId/submit

Submit report to BCEAO.

**Request:**
```bash
POST /compliance/reports/550e8400-e29b-41d4-a716-446655440000/submit
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted",
  "submittedBy": "officer-uuid",
  "submittedAt": "2026-01-25T14:40:00.000Z",
  "bceaoReference": "BCEAO-2026-01-D-0042"
}
```

---

### GET /reports/:reportId/export

Export report in regulatory format.

**Request:**
```bash
GET /compliance/reports/550e8400-e29b-41d4-a716-446655440000/export
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "reportMetadata": {
    "reportId": "550e8400-e29b-41d4-a716-446655440000",
    "reportType": "daily",
    "periodStart": "2026-01-24T00:00:00.000Z",
    "periodEnd": "2026-01-24T23:59:59.999Z",
    "generatedAt": "2026-01-25T00:00:05.000Z",
    "submittedAt": "2026-01-25T08:30:00.000Z",
    "bceaoReference": "BCEAO-2026-01-D-0042"
  },
  "summary": {
    "totalTransactions": 1523,
    "totalVolumeUsdc": 125000.50,
    "totalVolumeXof": 75000300.00,
    "crossBorderTransactions": 12,
    "crossBorderVolume": 8500.25,
    "largeTransactions": 3,
    "uniqueUsers": 842,
    "newUsers": 23,
    "suspiciousActivities": 1
  },
  "detailedMetrics": {...},
  "flaggedTransactions": [...],
  "complianceOfficer": {
    "generatedBy": "system",
    "reviewedBy": "officer-uuid",
    "submittedBy": "officer-uuid"
  }
}
```

## SAR Endpoints

### POST /sars

Create manual Suspicious Activity Report.

**Request:**
```bash
POST /compliance/sars
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "userId": "user-uuid",
  "transactionIds": [
    "tx-uuid-1",
    "tx-uuid-2",
    "tx-uuid-3"
  ],
  "narrative": "User conducted 5 transactions totaling 950,000 XOF within 6 hours. Each transaction was just below the 1M XOF reporting threshold. Amounts were suspiciously consistent: 190K, 190K, 190K, 190K, 190K. Pattern suggests deliberate structuring to evade reporting. User account is only 3 days old. Recommend filing SAR with BCEAO.",
  "riskScore": 85
}
```

**Response:**
```json
{
  "id": "sar-uuid",
  "userId": "user-uuid",
  "transactionIds": ["tx-uuid-1", "tx-uuid-2", "tx-uuid-3"],
  "triggerReason": "manual_flag",
  "riskScore": 85,
  "riskLevel": "critical",
  "narrative": "User conducted 5 transactions...",
  "detectionMethod": "manual",
  "detectedAt": "2026-01-25T14:45:00.000Z",
  "status": "under_investigation",
  "investigatedBy": "officer-uuid",
  "investigationStartedAt": "2026-01-25T14:45:00.000Z",
  "userPhone": "+225XXXXXXXX",
  "userCountryCode": "CI",
  "userKycStatus": "approved",
  "userAccountAgeDays": 3,
  "totalAmount": 1583.33,
  "totalAmountXof": 950000.00,
  "transactionCount": 3,
  "createdAt": "2026-01-25T14:45:00.000Z"
}
```

---

### GET /sars

List Suspicious Activity Reports.

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `under_investigation`, `submitted`, `closed`, `dismissed`)
- `limit` (optional): Number of SARs to return (default: 50)

**Request:**
```bash
GET /compliance/sars?status=under_investigation&limit=10
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
[
  {
    "id": "sar-uuid",
    "userId": "user-uuid",
    "triggerReason": "structuring",
    "riskScore": 82,
    "riskLevel": "high",
    "status": "under_investigation",
    "detectedAt": "2026-01-23T15:30:00.000Z",
    "investigatedBy": "officer-uuid",
    "transactionCount": 5,
    "totalAmount": 1666.67,
    "totalAmountXof": 1000000.00
  }
]
```

---

### GET /sars/:sarId

Get specific SAR details.

**Request:**
```bash
GET /compliance/sars/sar-uuid
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "id": "sar-uuid",
  "userId": "user-uuid",
  "transactionIds": ["tx-1", "tx-2", "tx-3", "tx-4", "tx-5"],
  "triggerReason": "structuring",
  "riskScore": 82,
  "riskLevel": "high",
  "narrative": "SUSPICIOUS ACTIVITY DETECTED\n\nSubject: User +225XXXXXXXX...",
  "detectionMethod": "automated",
  "detectedAt": "2026-01-23T15:30:00.000Z",
  "status": "under_investigation",
  "userPhone": "+225XXXXXXXX",
  "userFirstName": "Jean",
  "userLastName": "Kouassi",
  "userCountryCode": "CI",
  "userKycStatus": "approved",
  "userAccountAgeDays": 3,
  "totalAmount": 1666.67,
  "totalAmountXof": 1000000.00,
  "transactionCount": 5,
  "investigatedBy": "officer-uuid",
  "investigationNotes": "Pattern consistent with structuring. Verified user identity. Recommend filing.",
  "investigationStartedAt": "2026-01-23T16:00:00.000Z",
  "patternIndicators": {
    "consistentAmounts": true,
    "belowThreshold": true,
    "averageAmount": 333.33,
    "standardDeviation": 5.2
  },
  "createdAt": "2026-01-23T15:30:00.000Z",
  "updatedAt": "2026-01-24T10:15:00.000Z"
}
```

---

### PUT /sars/:sarId/investigation

Update SAR investigation notes.

**Request:**
```bash
PUT /compliance/sars/sar-uuid/investigation
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "notes": "Contacted user for explanation. User claimed normal business activity but could not provide invoices or contracts. Transactions align with structuring pattern. Recommend proceeding with BCEAO filing."
}
```

**Response:**
```json
{
  "id": "sar-uuid",
  "status": "under_investigation",
  "investigatedBy": "officer-uuid",
  "investigationNotes": "Contacted user for explanation...",
  "updatedAt": "2026-01-25T15:00:00.000Z"
}
```

---

### POST /sars/:sarId/submit

Submit SAR to BCEAO.

**Request:**
```bash
POST /compliance/sars/sar-uuid/submit
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "id": "sar-uuid",
  "status": "submitted",
  "submittedBy": "officer-uuid",
  "submittedAt": "2026-01-25T15:10:00.000Z",
  "bceaoReference": "SAR-BCEAO-2026-01-00123"
}
```

---

### POST /sars/:sarId/close

Close SAR investigation.

**Request:**
```bash
POST /compliance/sars/sar-uuid/close
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "reason": "SAR filed with BCEAO. Reference: SAR-BCEAO-2026-01-00123. Investigation complete."
}
```

**Response:**
```json
{
  "id": "sar-uuid",
  "status": "closed",
  "closedBy": "officer-uuid",
  "closedAt": "2026-01-25T15:15:00.000Z",
  "closedReason": "SAR filed with BCEAO..."
}
```

---

### POST /sars/:sarId/dismiss

Dismiss SAR as false positive.

**Request:**
```bash
POST /compliance/sars/sar-uuid/dismiss
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "reason": "False positive. User provided documentation proving legitimate business activity. Multiple invoices verified. Pattern was coincidental timing of customer payments."
}
```

**Response:**
```json
{
  "id": "sar-uuid",
  "status": "dismissed",
  "closedBy": "officer-uuid",
  "closedAt": "2026-01-25T15:20:00.000Z",
  "closedReason": "False positive. User provided documentation..."
}
```

---

### GET /sars/:sarId/export

Export SAR in regulatory format.

**Request:**
```bash
GET /compliance/sars/sar-uuid/export
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "sarMetadata": {
    "sarId": "sar-uuid",
    "bceaoReference": "SAR-BCEAO-2026-01-00123",
    "status": "submitted",
    "detectedAt": "2026-01-23T15:30:00.000Z",
    "submittedAt": "2026-01-25T15:10:00.000Z"
  },
  "subject": {
    "userId": "user-uuid",
    "phone": "+225XXXXXXXX",
    "firstName": "Jean",
    "lastName": "Kouassi",
    "countryCode": "CI",
    "kycStatus": "approved",
    "accountAgeDays": 3
  },
  "suspiciousActivity": {
    "triggerReason": "structuring",
    "riskScore": 82,
    "riskLevel": "high",
    "detectionMethod": "automated",
    "narrative": "SUSPICIOUS ACTIVITY DETECTED..."
  },
  "transactions": [
    {
      "id": "tx-uuid-1",
      "type": "transfer_external",
      "amount": 333.33,
      "currency": "USDC",
      "status": "completed",
      "timestamp": "2026-01-23T10:00:00.000Z"
    }
  ],
  "investigation": {
    "investigatedBy": "officer-uuid",
    "investigationStartedAt": "2026-01-23T16:00:00.000Z",
    "investigationNotes": "Pattern consistent with structuring...",
    "submittedBy": "officer-uuid"
  },
  "financialSummary": {
    "transactionCount": 5,
    "totalAmountUsdc": 1666.67,
    "totalAmountXof": 1000000.00
  }
}
```

## Alert Endpoints

### GET /alerts

List compliance alerts.

**Query Parameters:**
- `severity` (optional): Filter by severity (`low`, `medium`, `high`, `critical`)
- `limit` (optional): Number of alerts to return (default: 50)

**Request:**
```bash
GET /compliance/alerts?severity=high&limit=20
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
[
  {
    "id": "alert-uuid",
    "alertType": "velocity_anomaly",
    "severity": "high",
    "userId": "user-uuid",
    "transactionId": "tx-uuid",
    "title": "HIGH risk transaction detected",
    "description": "Risk score: 65. Flags: velocity_exceeded, round_amount",
    "resolved": false,
    "acknowledgedAt": null,
    "metadata": {
      "riskScore": 65,
      "flags": ["velocity_exceeded", "round_amount"]
    },
    "createdAt": "2026-01-25T10:30:00.000Z"
  }
]
```

---

### POST /alerts/:alertId/acknowledge

Acknowledge alert (officer has seen it).

**Request:**
```bash
POST /compliance/alerts/alert-uuid/acknowledge
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "id": "alert-uuid",
  "acknowledgedAt": "2026-01-25T15:30:00.000Z",
  "acknowledgedBy": "officer-uuid"
}
```

---

### POST /alerts/:alertId/resolve

Resolve alert with decision.

**Request:**
```bash
POST /compliance/alerts/alert-uuid/resolve
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "resolution": "Reviewed user transaction history. Velocity spike due to legitimate payroll processing. User is registered business. No further action required.",
  "escalateToSar": false
}
```

**Response:**
```json
{
  "id": "alert-uuid",
  "resolved": true,
  "resolvedAt": "2026-01-25T15:35:00.000Z",
  "resolvedBy": "officer-uuid",
  "resolution": "Reviewed user transaction history...",
  "escalatedToSar": false
}
```

**Example - Escalate to SAR:**
```bash
POST /compliance/alerts/alert-uuid/resolve
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "resolution": "Unable to verify legitimate business purpose. Pattern remains suspicious. Escalating to full SAR investigation.",
  "escalateToSar": true
}
```

## Risk Assessment Endpoints

### GET /users/:userId/risk-profile

Get comprehensive user risk profile.

**Request:**
```bash
GET /compliance/users/user-uuid/risk-profile
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "overallRiskScore": 45,
  "riskLevel": "medium",
  "flags": [
    "2_recent_alerts",
    "high_velocity"
  ],
  "recentAlerts": [
    {
      "id": "alert-uuid-1",
      "alertType": "velocity_anomaly",
      "severity": "medium",
      "createdAt": "2026-01-24T10:00:00.000Z"
    }
  ],
  "transactionVelocity": {
    "userId": "user-uuid",
    "timeWindow": 60,
    "transactionCount": 6,
    "totalAmount": 3000.50,
    "averageAmount": 500.08,
    "threshold": 5,
    "exceeded": true,
    "riskScore": 30
  },
  "structuringRisk": {
    "userId": "user-uuid",
    "detectionPeriod": {
      "start": "2026-01-24T10:00:00.000Z",
      "end": "2026-01-25T10:00:00.000Z"
    },
    "totalAmount": 5000.00,
    "transactionCount": 5,
    "averageAmount": 1000.00,
    "standardDeviation": 50.5,
    "consistentAmounts": true,
    "belowThreshold": true,
    "riskScore": 65,
    "confidence": 75
  }
}
```

---

### POST /users/:userId/analyze

Run comprehensive AML analysis on user.

**Request:**
```bash
POST /compliance/users/user-uuid/analyze
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "userId": "user-uuid",
  "analyzedAt": "2026-01-25T15:45:00.000Z",
  "velocity": {
    "timeWindow": 60,
    "transactionCount": 3,
    "exceeded": false,
    "riskScore": 15
  },
  "structuring": {
    "confidence": 25,
    "riskScore": 20,
    "consistentAmounts": false,
    "belowThreshold": true
  },
  "patterns": [
    {
      "userId": "user-uuid",
      "patternType": "round_amount",
      "confidence": 70,
      "indicators": [
        "4 of 5 transactions (80%) are round amounts"
      ]
    }
  ]
}
```

---

### POST /analysis/batch

Run batch AML analysis on all active users.

**Query Parameters:**
- `daysBack` (optional): Number of days to analyze (default: 7)

**Request:**
```bash
POST /compliance/analysis/batch?daysBack=7
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "usersAnalyzed": 1245,
  "alertsGenerated": 23,
  "highRiskUsers": 5
}
```

## Export Endpoints

### POST /export/summary

Export compliance summary for management/auditors.

**Request:**
```bash
POST /compliance/export/summary
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "startDate": "2026-01-01T00:00:00.000Z",
  "endDate": "2026-01-31T23:59:59.999Z"
}
```

**Response:**
```json
{
  "period": {
    "start": "2026-01-01T00:00:00.000Z",
    "end": "2026-01-31T23:59:59.999Z"
  },
  "complianceHealth": {
    "score": 87.5,
    "rating": "good",
    "factors": [...]
  },
  "reportingMetrics": {
    "totalReports": 31,
    "pendingReports": 1,
    "submittedReports": 30,
    "averageProcessingTimeHours": 8.5,
    "reportsByType": {
      "daily": 31,
      "weekly": 4,
      "monthly": 1
    }
  },
  "sarMetrics": {
    "totalSARs": 12,
    "openSARs": 3,
    "submittedSARs": 7,
    "dismissedSARs": 2,
    "averageRiskScore": 68.5,
    "sarsByTrigger": {
      "structuring": 5,
      "velocity_anomaly": 3,
      "manual_flag": 4
    },
    "sarsByRiskLevel": {
      "medium": 2,
      "high": 7,
      "critical": 3
    }
  },
  "alertMetrics": {
    "totalAlerts": 156,
    "openAlerts": 12,
    "resolvedAlerts": 144,
    "bySeverity": {
      "low": 85,
      "medium": 52,
      "high": 16,
      "critical": 3
    }
  },
  "generatedAt": "2026-01-25T15:50:00.000Z"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "userId",
      "message": "userId must be a valid UUID"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Insufficient permissions. Compliance officer role required."
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Not Found",
  "error": "Report 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Report generation failed"
}
```

## Rate Limiting

All compliance endpoints are rate-limited:

- **Standard endpoints**: 100 requests/minute
- **Export endpoints**: 10 requests/minute
- **Batch analysis**: 1 request/5 minutes

Headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706194800
```

## Webhooks (Future)

BCEAO may send webhooks for:

### Report Acknowledgment

```json
POST /webhooks/bceao/report-acknowledgment
{
  "reportReference": "BCEAO-2026-01-D-0042",
  "status": "acknowledged",
  "acknowledgedAt": "2026-01-25T09:00:00.000Z",
  "bceaoOfficer": "Inspector XYZ"
}
```

### SAR Response

```json
POST /webhooks/bceao/sar-response
{
  "sarReference": "SAR-BCEAO-2026-01-00123",
  "status": "accepted",
  "caseNumber": "BCEAO-CASE-2026-456",
  "responseDate": "2026-01-26T10:00:00.000Z",
  "requiresFollowUp": false
}
```

## Best Practices

### 1. Error Handling

Always wrap compliance calls in try-catch:

```typescript
try {
  const assessment = await amlCftService.analyzeTransaction(userId, amount);
  // Handle result
} catch (error) {
  logger.error('Compliance screening failed', error);
  // Fail-open: allow transaction but log for review
  await createManualReviewTask(userId, amount);
}
```

### 2. Async Processing

Use background jobs for heavy operations:

```typescript
// Don't block user requests
@Post('analysis/batch')
async runBatchAnalysis() {
  // Queue job for background processing
  await this.queueService.add('batch-analysis', { daysBack: 7 });
  return { message: 'Batch analysis queued' };
}
```

### 3. Caching

Cache expensive operations:

```typescript
@Cacheable({ ttl: 300 }) // 5 minutes
async getUserRiskProfile(userId: string) {
  // Expensive calculation
}
```

### 4. Pagination

Always paginate large result sets:

```typescript
GET /compliance/alerts?page=1&limit=50
```

### 5. Audit Logging

Log all compliance actions:

```typescript
async submitReport(reportId: string, officerId: string) {
  const report = await this.submit(reportId, officerId);

  await this.auditService.log({
    action: 'REPORT_SUBMITTED',
    actor: officerId,
    resource: reportId,
    timestamp: new Date(),
  });

  return report;
}
```

## Testing Examples

### cURL Examples

**Get Dashboard:**
```bash
curl -X GET "http://localhost:3000/api/v1/compliance/dashboard?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create Manual SAR:**
```bash
curl -X POST "http://localhost:3000/api/v1/compliance/sars" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "transactionIds": ["tx-1", "tx-2"],
    "narrative": "Suspicious activity detected...",
    "riskScore": 75
  }'
```

**Submit Report:**
```bash
curl -X POST "http://localhost:3000/api/v1/compliance/reports/report-uuid/submit" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Postman Collection

Import the Postman collection from:
```
/Users/macbook/JoonaPay/USDC-Wallet/usdc-wallet/src/modules/compliance/postman/compliance-api.postman_collection.json
```

## Versioning

Current API version: `v1`

Breaking changes will be released under new version (`v2`, etc.) with deprecation notices.
