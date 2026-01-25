# BCEAO Compliance Engine - System Flow Diagrams

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        JoonaPay USDC Wallet                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API Requests
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BCEAO Compliance Engine                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   BCEAO      │  │   AML/CFT    │  │     SAR      │           │
│  │  Reporting   │  │   Service    │  │  Generator   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────┐                            │
│                   │   Compliance    │                            │
│                   │    Dashboard    │                            │
│                   └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                       │
│                                                                   │
│  compliance_reports │ suspicious_activity_reports │ alerts      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                            BCEAO API                             │
│                    (Regulatory Submission)                       │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Transaction Screening Flow

```
User Transaction Request
         │
         ▼
┌─────────────────────┐
│  Transaction API    │
│  POST /transfer     │
└─────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  TransactionScreeningGuard          │
│  (if BCEAO_COMPLIANCE_ENABLED)      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  AMLCFTService.analyzeTransaction() │
└─────────────────────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────┐   ┌─────────────────┐
│  Velocity   │   │  Structuring    │
│   Check     │   │    Detection    │
└─────────────┘   └─────────────────┘
         │                 │
         ▼                 ▼
┌─────────────┐   ┌─────────────────┐
│  Geographic │   │  PEP Screening  │
│    Risk     │   │                 │
└─────────────┘   └─────────────────┘
         │                 │
         └────────┬────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Calculate     │
         │  Risk Score    │
         │   (0-100)      │
         └────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
   Score < 75          Score >= 75
        │                   │
        ▼                   ▼
┌─────────────┐    ┌──────────────┐
│  APPROVED   │    │   BLOCKED    │
│  Continue   │    │  Create SAR  │
└─────────────┘    └──────────────┘
        │                   │
        ▼                   ▼
┌─────────────┐    ┌──────────────┐
│  Execute    │    │  Reject API  │
│ Transaction │    │   Request    │
└─────────────┘    └──────────────┘
```

## 3. Structuring Detection Algorithm

```
User Transaction History (24-hour window)
         │
         ▼
┌─────────────────────────────────────┐
│  Fetch Recent Transactions          │
│  - Last 24 hours                    │
│  - Status: completed                │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Calculate Statistics               │
│  - Total amount                     │
│  - Transaction count                │
│  - Average amount                   │
│  - Standard deviation               │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check Indicators                   │
│  1. Consistent amounts? (low σ)     │
│  2. Below threshold? (<1M XOF)      │
│  3. High frequency? (>= 3 txs)      │
│  4. Total exceeds threshold?        │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Calculate Confidence Score         │
│  - Consistent amounts: +40          │
│  - Below threshold: +40             │
│  - High frequency: +20              │
│  = Confidence (0-100)               │
└─────────────────────────────────────┘
         │
         ▼
    Confidence > 70?
         │
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Create │ │  Pass  │
│  SAR   │ │        │
└────────┘ └────────┘
```

## 4. Daily Report Generation Flow

```
        00:00 WAT
           │
           ▼
    ┌──────────────┐
    │ Cron Trigger │
    └──────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ BCEAOReportingService           │
│ .generateDailyReport()          │
└─────────────────────────────────┘
           │
           ├──────────────────────┐
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│ Define Period    │   │  Fetch Users     │
│ Yesterday        │   │  Created         │
│ 00:00 - 23:59    │   │  Yesterday       │
└──────────────────┘   └──────────────────┘
           │                      │
           ▼                      │
┌──────────────────────────────┐  │
│  Query All Transactions      │  │
│  WHERE created_at BETWEEN    │  │
│  periodStart AND periodEnd   │  │
└──────────────────────────────┘  │
           │                      │
           ├──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Calculate Metrics              │
│  - Total volume (USDC & XOF)    │
│  - Transaction counts by type   │
│  - Cross-border count           │
│  - Large transactions (>1M XOF) │
│  - Unique users                 │
│  - Suspicious activities        │
└─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Identify Flagged Transactions  │
│  - Large (>1M XOF)              │
│  - Cross-border                 │
│  - Failed/Blocked               │
└─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Create Report Entity           │
│  - Status: DRAFT                │
│  - Store all metrics            │
│  - Generated by: system         │
└─────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Save to Database               │
│  compliance_reports table       │
└─────────────────────────────────┘
           │
           ▼
      Report Ready
     (pending review)
```

## 5. SAR Lifecycle Flow

```
Suspicious Activity Detected
         │
    ┌────┴────┐
    │         │
Automated   Manual
  Flag       Flag
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────────────────────┐
│  Create SAR (Status: DRAFT)     │
│  - User details snapshot        │
│  - Transaction IDs              │
│  - Generated narrative          │
│  - Risk score & level           │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Compliance Officer Notified    │
│  (via email/slack/dashboard)    │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Status: UNDER_INVESTIGATION    │
│  - Officer assigned             │
│  - Investigation started        │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Investigation Activities       │
│  - Review transactions          │
│  - Contact user (if needed)     │
│  - Gather documentation         │
│  - Update investigation notes   │
└─────────────────────────────────┘
         │
         ▼
    Decision Point
         │
    ┌────┴────────────┐
    │                 │
    ▼                 ▼
File with        Dismiss as
  BCEAO        False Positive
    │                 │
    ▼                 ▼
┌──────────┐    ┌──────────┐
│ Submit   │    │ Status:  │
│ to BCEAO │    │DISMISSED │
└──────────┘    └──────────┘
    │                 │
    ▼                 │
┌──────────┐          │
│ Status:  │          │
│SUBMITTED │          │
│          │          │
│Reference:│          │
│SAR-BCEAO │          │
│-2026-... │          │
└──────────┘          │
    │                 │
    ▼                 │
Within 48 Hours      │
    │                 │
    ▼                 │
┌──────────┐          │
│ Status:  │          │
│ CLOSED   │◄─────────┘
└──────────┘
```

## 6. Alert Resolution Flow

```
Alert Triggered
(Medium/High/Critical Risk)
         │
         ▼
┌─────────────────────────────────┐
│  Create Alert Record            │
│  - Alert type                   │
│  - Severity level               │
│  - User & transaction IDs       │
│  - Description                  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Emit Event                     │
│  'compliance.alert.created'     │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Notification Service           │
│  - Email compliance officers    │
│  - Slack notification           │
│  - Dashboard update             │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Officer Reviews Alert          │
│  GET /alerts/:id                │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Acknowledge Alert              │
│  POST /alerts/:id/acknowledge   │
│  (acknowledged_at timestamp)    │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Investigation                  │
│  - Review transaction history   │
│  - Check user profile           │
│  - Analyze patterns             │
└─────────────────────────────────┘
         │
         ▼
    Decision Point
         │
    ┌────┴──────────┐
    │               │
    ▼               ▼
False Positive   Suspicious
    │               │
    ▼               ▼
┌──────────┐   ┌──────────┐
│ Resolve  │   │ Escalate │
│ Alert    │   │ to SAR   │
│          │   │          │
│escalate  │   │escalate  │
│ToSar:    │   │ToSar:    │
│false     │   │true      │
└──────────┘   └──────────┘
    │               │
    ▼               ▼
 Closed      Create SAR
              (Full Investigation)
```

## 7. Weekly Report Workflow

```
Sunday 00:00 WAT
       │
       ▼
┌────────────────┐
│ Cron Trigger   │
│ Weekly Report  │
└────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Calculate Date Range    │
│ Last 7 days             │
│ (Sunday to Saturday)    │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Aggregate Metrics       │
│ - Sum all daily reports │
│ - Calculate trends      │
│ - Identify patterns     │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Generate Weekly Report  │
│ - Status: DRAFT         │
│ - Type: weekly          │
└─────────────────────────┘
       │
       ▼
Monday Morning
       │
       ▼
┌─────────────────────────┐
│ Compliance Officer      │
│ Reviews Report          │
│ - Verify metrics        │
│ - Add notes             │
│ - Approve               │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Submit to BCEAO         │
│ (if required)           │
└─────────────────────────┘
```

## 8. Real-time Screening Decision Tree

```
                    Transaction Request
                            │
                            ▼
                   ┌─────────────────┐
                   │ BCEAO Enabled?  │
                   └─────────────────┘
                            │
                    ┌───────┴───────┐
                    │               │
                   YES              NO
                    │               │
                    │               ▼
                    │         Allow (skip screening)
                    │
                    ▼
            ┌──────────────┐
            │ Check Amount │
            └──────────────┘
                    │
            ┌───────┴────────────┐
            │                    │
      Amount > 1M XOF      Amount <= 1M XOF
            │                    │
            ▼                    ▼
      Flag: large_tx        Continue checks
            │                    │
            │                    │
            └────────┬───────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Velocity Check   │
            │ (last 60 min)    │
            └──────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
      Count > 5         Count <= 5
            │                 │
            ▼                 ▼
      Flag: velocity    Continue checks
            │                 │
            │                 │
            └────────┬────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Structuring Check│
            │ (last 24 hours)  │
            └──────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
      Confidence > 70   Confidence <= 70
            │                 │
            ▼                 ▼
      Flag: structuring Continue checks
            │                 │
            │                 │
            └────────┬────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Geographic Risk  │
            └──────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
      High/Critical      Low/Medium
            │                 │
            ▼                 ▼
      Flag: geo_risk    Continue checks
            │                 │
            │                 │
            └────────┬────────┘
                     │
                     ▼
            ┌──────────────────┐
            │ Calculate Total  │
            │   Risk Score     │
            └──────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   Score < 25   Score 25-74  Score >= 75
        │            │            │
        ▼            ▼            ▼
    ┌──────┐    ┌─────────┐  ┌────────┐
    │ LOW  │    │ MED/HIGH│  │CRITICAL│
    │ALLOW │    │  ALLOW  │  │ BLOCK  │
    │      │    │+ Review │  │+ SAR   │
    └──────┘    └─────────┘  └────────┘
```

## 9. Monthly Report Submission Workflow

```
1st of Month, 00:00 WAT
         │
         ▼
┌───────────────────────┐
│ Auto-Generate Report  │
│ For Previous Month    │
└───────────────────────┘
         │
         ▼
Day 1-5: Review Period
         │
         ▼
┌───────────────────────┐
│ Compliance Officer    │
│ Reviews Draft         │
│ - Verify metrics      │
│ - Check flagged TXs   │
│ - Add commentary      │
└───────────────────────┘
         │
         ▼
┌───────────────────────┐
│ PUT /reports/:id/     │
│      approve          │
│ Status: APPROVED      │
└───────────────────────┘
         │
         ▼
Day 5-9: Preparation
         │
         ▼
┌───────────────────────┐
│ Senior Officer        │
│ Final Review          │
│ - Sign off report     │
│ - Prepare submission  │
└───────────────────────┘
         │
         ▼
┌───────────────────────┐
│ POST /reports/:id/    │
│      submit           │
│ Status: SUBMITTED     │
└───────────────────────┘
         │
         ▼
┌───────────────────────┐
│ BCEAO API Call        │
│ (when integrated)     │
└───────────────────────┘
         │
         ▼
┌───────────────────────┐
│ Receive Reference #   │
│ BCEAO-2026-01-M-XXXX  │
└───────────────────────┘
         │
         ▼
Before Day 10
         │
         ▼
   ✅ Submitted
  (Deadline met)
```

## 10. Compliance Dashboard Data Flow

```
Admin/Officer Loads Dashboard
         │
         ▼
┌─────────────────────────────────┐
│ GET /compliance/dashboard       │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ ComplianceDashboardService      │
└─────────────────────────────────┘
         │
         ├──────────────────┬──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Fetch Recent │   │ Count Open   │   │ Get Risk     │
│   Reports    │   │   Alerts     │   │   Trends     │
└──────────────┘   └──────────────┘   └──────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Aggregate    │   │ Count Active │   │ Calculate    │
│  Metrics     │   │    SARs      │   │ Daily Scores │
└──────────────┘   └──────────────┘   └──────────────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Compile         │
                   │ Dashboard Data  │
                   └─────────────────┘
                            │
                            ▼
                    Return to Client
                            │
                            ▼
┌─────────────────────────────────────────────┐
│            Dashboard Display                 │
│                                              │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Health Score │  │ Open Alerts  │         │
│  │    87.5%     │  │      12      │         │
│  └──────────────┘  └──────────────┘         │
│                                              │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ Pending SARs │  │   Reports    │         │
│  │      3       │  │Pending: 2    │         │
│  └──────────────┘  └──────────────┘         │
│                                              │
│  ┌────────────────────────────────┐         │
│  │      Risk Trend Chart          │         │
│  │  │                             │         │
│  │ 50│    ┌──┐                    │         │
│  │  │    │  │  ┌──┐               │         │
│  │ 25│──┐ │  │  │  │               │         │
│  │  │  │ │  └──┘  └──             │         │
│  │ 0└──┴─┴───────────────>        │         │
│  │   Mon Tue Wed Thu Fri          │         │
│  └────────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

## 11. Batch Analysis Flow

```
POST /compliance/analysis/batch
         │
         ▼
┌─────────────────────────────────┐
│ Get Active Users                │
│ (transactions in last 7 days)   │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Chunk Users                     │
│ (100 users per chunk)           │
└─────────────────────────────────┘
         │
         ▼
    For Each Chunk
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 User 1   User 2 ... User 100
    │         │         │
    └────┬────┴────┬────┘
         │         │
         ▼         ▼
┌──────────┐ ┌──────────┐
│ Detect   │ │ Detect   │
│ Patterns │ │ Patterns │
└──────────┘ └──────────┘
         │         │
         └────┬────┘
              │
              ▼
      Patterns Found?
              │
         ┌────┴────┐
         │         │
        YES        NO
         │         │
         ▼         ▼
   ┌─────────┐  Skip
   │ Create  │
   │ Alert   │
   └─────────┘
         │
         ▼
   Confidence > 85?
         │
    ┌────┴────┐
    │         │
   YES        NO
    │         │
    ▼         ▼
Create SAR  Alert Only
    │         │
    └────┬────┘
         │
         ▼
  Next User Chunk
         │
         ▼
   All Users Complete
         │
         ▼
┌─────────────────────────┐
│ Return Summary          │
│ - Users analyzed        │
│ - Alerts generated      │
│ - High-risk users       │
└─────────────────────────┘
```

## 12. Event-Driven Architecture

```
┌─────────────────────────────────────────────────┐
│              Event Emitter (NestJS)              │
└─────────────────────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│compliance. │  │compliance. │  │compliance. │
│alert.      │  │sar.        │  │sar.        │
│created     │  │created     │  │submitted   │
└────────────┘  └────────────┘  └────────────┘
       │               │               │
       ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│Notification│  │Notification│  │Audit Log   │
│Service     │  │Service     │  │Service     │
│            │  │            │  │            │
│Send Email  │  │Send Email  │  │Log         │
│to Officers │  │to Senior   │  │Submission  │
└────────────┘  └────────────┘  └────────────┘
```

## 13. Data Retention & Archival

```
Compliance Data Created
         │
         ▼
    Active Period
    (0-7 years)
         │
         ▼
┌─────────────────────────┐
│ Nightly Archive Job     │
│ Check if > 7 years old  │
└─────────────────────────┘
         │
         ▼
    Age > 7 years?
         │
    ┌────┴────┐
    │         │
   YES        NO
    │         │
    ▼         ▼
┌────────┐  Keep
│ Soft   │  Active
│ Delete │
│        │
│Set     │
│archived│
│_at     │
└────────┘
    │
    ▼
┌────────────────────────┐
│ Move to Cold Storage   │
│ (S3 Glacier)           │
│ - Encrypted            │
│ - Versioned            │
│ - Multi-region         │
└────────────────────────┘
    │
    ▼
Retained for Legal/Audit
(Accessible but not in primary DB)
```

## 14. Integration with Transaction Flow

```
User Creates Transfer
         │
         ▼
┌─────────────────────────┐
│ Transfer Controller     │
│ @UseGuards(             │
│   TransactionScreening  │
│   Guard)                │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Guard.canActivate()     │
│ - Extract userId        │
│ - Extract amount        │
│ - Extract recipientId   │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ AMLCFTService           │
│ .analyzeTransaction()   │
└─────────────────────────┘
         │
         ▼
    Risk Assessment
         │
    ┌────┴─────────────┐
    │                  │
Approved=false   Approved=true
    │                  │
    ▼                  │
┌────────┐             │
│ Throw  │             │
│ 403    │             │
│Forbidden│            │
└────────┘             │
                       │
              ┌────────┴─────────┐
              │                  │
        Manual Review      Auto-Approve
         Required               │
              │                  │
              ▼                  ▼
       ┌──────────┐      ┌──────────┐
       │ Status:  │      │ Execute  │
       │ pending_ │      │Transfer  │
       │ review   │      │          │
       └──────────┘      └──────────┘
              │                  │
              ▼                  │
       ┌──────────┐              │
       │ Notify   │              │
       │Compliance│              │
       │ Officer  │              │
       └──────────┘              │
                                 │
                                 ▼
                          Transfer Complete
```

## 15. System Health Monitoring

```
┌─────────────────────────────────────────────┐
│           Prometheus Metrics                 │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Reports   │ │   SARs    │ │  Alerts   │
│ Generated │ │  Created  │ │   Open    │
│  Counter  │ │  Counter  │ │  Gauge    │
└───────────┘ └───────────┘ └───────────┘
        │           │           │
        └───────────┼───────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              Grafana Dashboard               │
│                                              │
│  ┌─────────────────────────────────┐        │
│  │     Daily Reports Generated      │        │
│  │  │ ▂▄█▆▃▅▇█▅▄▆█▄▃▅▇▆▄▃▅█▆        │        │
│  └─────────────────────────────────┘        │
│                                              │
│  ┌─────────────────────────────────┐        │
│  │       Open Alerts by Severity    │        │
│  │  Critical: ■■ (2)                │        │
│  │  High:     ■■■■■ (5)             │        │
│  │  Medium:   ■■■■■■■■ (8)          │        │
│  └─────────────────────────────────┘        │
│                                              │
│  ┌─────────────────────────────────┐        │
│  │    Average Response Time (p95)   │        │
│  │         245ms                    │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
                    │
                    ▼
            Alert on Anomalies
                    │
                    ▼
┌─────────────────────────────────────────────┐
│             AlertManager                     │
│                                              │
│  IF compliance_alerts_open > 20              │
│  THEN notify ops team                        │
│                                              │
│  IF sar_age_hours > 48                       │
│  THEN page compliance officer                │
└─────────────────────────────────────────────┘
```

## Legend

```
┌─────────┐
│ Process │  - Processing step or service
└─────────┘

┌─────────┐
│Database │  - Data storage
└─────────┘

    │
    ▼         - Data/control flow

Decision
    │
┌───┴───┐
│       │     - Conditional branch
▼       ▼
```

## Diagrams Usage

These diagrams are useful for:

1. **Developer Onboarding** - Understanding system flow
2. **Compliance Training** - Explaining workflows
3. **Architecture Reviews** - System design discussions
4. **Troubleshooting** - Identifying failure points
5. **Documentation** - Technical specifications
6. **Presentations** - Stakeholder communication

## Tools for Visualization

Recommended tools to view/edit these diagrams:

- **Mermaid**: Online editor at mermaid.live
- **ASCII Flow**: asciiflow.com
- **PlantUML**: plantuml.com
- **Draw.io**: app.diagrams.net

## References

- Architecture: ARCHITECTURE.md
- API Docs: API_DOCUMENTATION.md
- Deployment: DEPLOYMENT.md
- Quick Start: QUICKSTART.md
