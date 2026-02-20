# Korido API

**USDC wallet and cross-border remittance platform for West Africa.**

## Problem

Sending money within and across West African countries is slow, expensive (5-9% fees), and excludes the unbanked. Traditional remittance rails rely on correspondent banking with multi-day settlement.

## Solution

A USDC-based mobile wallet that enables instant, low-cost transfers across WAEMU countries. Leverages stablecoin infrastructure (Stellar/Circle) with a local-currency experience, backed by a double-entry ledger (Blnk Finance) for financial integrity.

## For Who

- **Consumers** in West Africa sending/receiving money domestically and cross-border
- **Diaspora** remitting money to family in Côte d'Ivoire, Senegal, Mali, etc.
- **Small merchants** accepting digital payments

## Core Features (Built)

- **Wallet Management** — USDC wallets with Blnk Finance double-entry ledger + Stellar on-chain addresses
- **Transfers** — P2P, cross-border, recurring transfers, bulk payments
- **Deposits & Withdrawals** — Mobile money integration, bank linking, payment links
- **KYC & Compliance** — Tiered KYC verification, sanctions screening, AML compliance, regulatory reporting
- **Bill Payments** — Integrated bill payment module
- **Savings Pots** — Goal-based savings feature
- **Merchant Services** — Merchant onboarding, sub-business accounts, API keys
- **Security** — Device fingerprinting, PIN verification, IP whitelisting, session management, blacklisted devices
- **Notifications** — FCM push, SMS (Twilio), email, in-app preferences
- **Risk & Fraud** — Velocity rules, fraud ring detection, compliance cases
- **Admin** — Admin dashboard, audit logging, feature flags, SLA configuration
- **Support** — Ticketing system with messages
- **Analytics & Monitoring** — Metrics, tracing, APM, real-time events (SSE/WebSocket)
- **Referral System** — User referral tracking

## Architecture

```
NestJS + TypeORM + PostgreSQL
├── Blnk Finance (double-entry ledger)
├── Stellar Network (on-chain settlement)
├── Circle API (USDC minting/burning)
├── Redis (caching, rate limiting, idempotency)
├── Twilio (SMS/voice)
├── FCM (push notifications)
└── GraphQL + REST APIs
```

- **Clean architecture** per module: `application/` (controllers, DTOs, usecases) → `domain/` (entities) → `infrastructure/` (ORM, repositories)
- **FSM engine** for transaction state machines
- **Idempotency middleware** for payment safety
- **Event store** for audit trail

## API Surface

REST + GraphQL. Key endpoints:

| Domain | Endpoints |
|--------|-----------|
| Auth/User | Registration, login, profile, PIN, sessions |
| Wallet | Create, balance, fund, withdraw |
| Transfer | P2P send, cross-border, recurring, bulk |
| KYC | Submit documents, verification status |
| Bills | Pay bills, lookup billers |
| Savings | Create pots, deposit, withdraw |
| Merchant | Onboard, payment links, API keys |
| Admin | Users, compliance cases, feature flags |

## Roadmap

- [ ] Card issuance (virtual/physical)
- [ ] Exchange rate module (XOF ↔ USDC live rates)
- [ ] Consent management expansion
- [ ] Enhanced analytics dashboard
- [ ] Multi-currency wallet support
