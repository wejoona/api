# GDPR Compliance Guide

## Overview

This document outlines how JoonaPay complies with the General Data Protection Regulation (GDPR), specifically focusing on data retention, user rights, and privacy controls.

## GDPR Rights Implementation

### Article 17: Right to Erasure ("Right to be Forgotten")

**Implementation Status:** ✅ Fully Implemented

Users can request deletion of their personal data through:
1. In-app account deletion request
2. Email request to privacy@joonapay.com
3. Admin-initiated deletion (for support cases)

**Process:**
1. User submits deletion request
2. 30-day grace period begins (allows cancellation)
3. Automated deletion process:
   - Anonymize user profile data
   - Delete sessions and authentication tokens
   - Anonymize transaction metadata (amounts preserved for compliance)
   - Archive KYC documents (required by AML regulations)
   - Delete contact lists and preferences

**Exceptions (Legal Grounds for Retention):**
- Transaction records: 7 years (financial regulation)
- KYC documents: 7 years (AML/KYC compliance)
- Audit logs: 7 years (fraud prevention)

### Article 15: Right of Access

**Implementation Status:** 🔄 Planned

Users can request a copy of their personal data.

**Planned Implementation:**
```http
GET /users/me/data-export
Authorization: Bearer {user-token}
```

Returns JSON with:
- Profile information
- Transaction history
- Contact list
- Settings and preferences
- Authentication logs

### Article 16: Right to Rectification

**Implementation Status:** ✅ Implemented

Users can update their personal information through:
- In-app profile editor
- API endpoints for profile updates

Audited changes include:
- Name
- Email
- Phone number (requires verification)
- Address

### Article 18: Right to Restriction of Processing

**Implementation Status:** 🔄 Planned

Users can request temporary suspension of data processing.

**Planned Implementation:**
- Account freeze functionality
- Temporary halt of marketing communications
- Restriction flags in user profile

### Article 20: Right to Data Portability

**Implementation Status:** 🔄 Planned

Users can export their data in machine-readable format (JSON).

**Planned Export Format:**
```json
{
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+225XXXXXXXX"
  },
  "transactions": [...],
  "contacts": [...],
  "exportedAt": "2026-01-29T00:00:00Z"
}
```

## Data Processing Principles

### 1. Purpose Limitation

Data is collected only for specified, explicit purposes:

| Data Type | Purpose | Legal Basis |
|-----------|---------|------------|
| Name, Phone | Account creation, authentication | Contract |
| Email | Communication, password reset | Contract |
| KYC Documents | Identity verification, AML compliance | Legal obligation |
| Transaction History | Financial services, fraud prevention | Contract, Legal obligation |
| Device Info | Security, fraud detection | Legitimate interest |
| Location | Service delivery, compliance | Contract |

### 2. Data Minimization

Only collect data necessary for service provision:
- ✅ Phone number (required for authentication)
- ✅ Name (required for KYC)
- ✅ KYC documents (legal requirement)
- ❌ Social media profiles (not collected)
- ❌ Biometric data (only used locally, never stored)

### 3. Storage Limitation

Automated retention policies ensure data is not kept longer than necessary:
- Sessions: 90 days
- Verification codes: 24 hours
- Read notifications: 90 days
- Inactive devices: 180 days

Exception: Financial records retained 7 years per regulation.

### 4. Accuracy

Users can update their information at any time.
Automated verification for critical data (phone, email).

### 5. Integrity and Confidentiality

Security measures:
- ✅ Encryption in transit (TLS 1.3)
- ✅ Encryption at rest (AES-256)
- ✅ PIN hashing (bcrypt)
- ✅ Session management with secure tokens
- ✅ Device attestation
- ✅ Fraud detection
- ✅ Regular security audits

## Data Processing Inventory

### Personal Data Collected

#### Identity Data
- First name, Last name
- Date of birth
- Nationality
- Government-issued ID (for KYC)

#### Contact Data
- Phone number
- Email address
- Mailing address (for KYC)

#### Financial Data
- Transaction history
- Wallet balance
- Bank account details (encrypted)
- Payment preferences

#### Technical Data
- IP address
- Device ID
- User agent
- Session tokens
- FCM tokens (push notifications)

#### Usage Data
- App interactions
- Feature usage statistics
- Login history

### Data Processors

Third-party services that process user data:

| Processor | Purpose | Data Shared | Location | Agreement |
|-----------|---------|-------------|----------|-----------|
| Circle | USDC wallet services | User ID, wallet address | USA | DPA signed |
| Yellow Card | Mobile money on/off ramp | KYC data, transaction details | Africa | DPA signed |
| Blnk | Ledger services | Transaction records | Cloud | DPA signed |
| Firebase | Push notifications | Device tokens, user ID | USA | DPA signed |
| AWS S3 | Document storage | KYC documents (encrypted) | EU region | DPA signed |

**Data Processing Agreements (DPAs):** All processors have signed DPAs ensuring GDPR compliance.

## User Consent Management

### Consent Collection

Users provide consent during:
1. **Registration**: Account creation, Terms of Service
2. **KYC**: Document upload, identity verification
3. **Notifications**: Push notifications, marketing emails
4. **Location**: Service delivery, compliance

### Consent Withdrawal

Users can withdraw consent at any time:
- Disable push notifications in app settings
- Unsubscribe from marketing emails
- Request account deletion

### Cookie Policy

**Status:** N/A (Mobile app, no web cookies)

For web dashboard:
- Essential cookies only
- No third-party tracking cookies
- Analytics with IP anonymization

## Data Breach Protocol

### Detection
- Automated monitoring for anomalies
- Security alerts for unauthorized access
- Regular security audits

### Response (72-hour timeline)

**Hour 0-4: Detection & Containment**
1. Identify breach scope
2. Contain the incident
3. Preserve evidence

**Hour 4-24: Assessment**
1. Determine affected users
2. Assess data compromised
3. Evaluate risk to users

**Hour 24-72: Notification**
1. Notify supervisory authority (if required)
2. Notify affected users (if high risk)
3. Document incident

**Post-Incident:**
1. Root cause analysis
2. Remediation measures
3. Policy updates

### User Notification Template

```
Subject: Important Security Notice - JoonaPay

Dear [User],

We are writing to inform you of a security incident that may have affected your personal data.

What happened: [Brief description]
Data affected: [Types of data]
Actions we've taken: [Security measures]
What you should do: [User actions]

For questions: security@joonapay.com

Sincerely,
JoonaPay Security Team
```

## Cross-Border Data Transfers

### Data Residency

**Primary Storage:** EU data center (GDPR-compliant region)

**Third-Party Transfers:**
- Circle (USA): Standard Contractual Clauses (SCCs)
- Firebase (USA): SCCs
- Yellow Card (Africa): Adequacy decision or SCCs

### Transfer Mechanisms
- ✅ Standard Contractual Clauses (SCCs)
- ✅ Data Processing Agreements (DPAs)
- ✅ Encryption in transit and at rest

## Supervisory Authority

**Lead Authority:** [To be determined based on headquarters location]

For EU users, the competent authority depends on where JoonaPay establishes its EU office or representative.

**Contact for Data Protection:**
- Email: privacy@joonapay.com
- DPO: dpo@joonapay.com (if appointed)

## Privacy by Design

### Technical Measures

1. **Pseudonymization:** User IDs are UUIDs, not PII
2. **Encryption:** All PII encrypted at rest
3. **Access Controls:** Role-based access to personal data
4. **Audit Logs:** All data access logged
5. **Automated Deletion:** Retention policies enforced

### Organizational Measures

1. **Staff Training:** GDPR awareness for all employees
2. **Data Protection Impact Assessments (DPIAs):** For high-risk processing
3. **Privacy Policies:** Clear, accessible privacy notice
4. **Vendor Management:** DPAs with all processors
5. **Incident Response Plan:** Documented breach protocol

## Data Protection Impact Assessment (DPIA)

DPIAs conducted for:
- ✅ KYC/AML verification (high-risk processing)
- ✅ Fraud detection system (automated decision-making)
- ✅ Transaction monitoring (financial profiling)
- 🔄 Biometric authentication (planned - face recognition for liveness)

## Records of Processing Activities

Maintained records include:
- Purpose of processing
- Categories of data subjects
- Categories of personal data
- Recipients of personal data
- Data retention periods
- Security measures

**Last Updated:** 2026-01-29

## User-Facing Privacy Notice

**Key Points:**
- We collect only necessary data
- Your data is encrypted and secure
- You can delete your account anytime
- We retain financial data for 7 years (legal requirement)
- We never sell your data
- You can export your data (planned)

**Full Privacy Policy:** Available at [https://joonapay.com/privacy](https://joonapay.com/privacy)

## Compliance Checklist

- [x] Right to erasure (Article 17)
- [x] Right to rectification (Article 16)
- [x] Data retention policies
- [x] Automated deletion workflows
- [x] Audit trails for deletions
- [x] Encryption at rest and in transit
- [x] Data Processing Agreements with vendors
- [ ] Right of access implementation (Article 15)
- [ ] Data portability (Article 20)
- [ ] Consent management system
- [ ] DPIA documentation
- [ ] Data Protection Officer appointment
- [ ] Cookie policy (web dashboard)
- [ ] Privacy policy in local languages (French)

## Next Steps

1. **Q1 2026:**
   - Implement data export API (Article 15)
   - Deploy consent management system
   - Translate privacy policy to French

2. **Q2 2026:**
   - Appoint Data Protection Officer (DPO)
   - Complete DPIA for all high-risk processing
   - Implement data portability (Article 20)

3. **Q3 2026:**
   - Third-party security audit
   - GDPR compliance certification
   - Staff training program

## Contact

**Data Protection Inquiries:**
- Email: privacy@joonapay.com
- DPO: dpo@joonapay.com

**Security Incidents:**
- Email: security@joonapay.com
- Phone: [Emergency hotline]

**General Support:**
- Email: support@joonapay.com
- In-app chat

---

**Document Version:** 1.0
**Last Updated:** 2026-01-29
**Next Review:** 2026-04-29
