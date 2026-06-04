# Financial Operation Integrity Audit

Date: 2026-06-04

Scope: mobile-facing Korido API flows that can move money or create future money movement.

## Source-Of-Truth Balance Semantics

| Flow                                      | Active path                                       | Balance authority                                                                            | Result                                                                     |
| ----------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Wallet internal transfer                  | `InternalTransferUseCase`                         | Blnk `getAvailableBalance`, local wallet fallback only when Blnk balance read is unavailable | Confirmed                                                                  |
| Wallet external transfer / withdraw alias | `ExternalTransferUseCase`                         | Blnk `getAvailableBalance`, local wallet fallback only when Blnk balance read is unavailable | Confirmed                                                                  |
| Payment link pay                          | `PaymentLinkService.payPaymentLink`               | Blnk `getAvailableBalance`, local wallet fallback only when Blnk balance read is unavailable | Confirmed                                                                  |
| Merchant QR payment                       | `ProcessMerchantPaymentUseCase`                   | Blnk user balance available amount                                                           | Fixed to use micro-USDC units                                              |
| Savings pot deposit/withdraw              | Savings pot use cases                             | Local mirror movement inside one wallet                                                      | Confirmed as internal allocation, not external spend                       |
| Bill pay                                  | `BillPaymentController` proxy to Bill Pay service | Downstream Bill Pay service owns ledger debit                                                | Confirmed boundary: forwards user and idempotency context                  |
| Bank linking deposit/withdraw             | `BankLinkingService`                              | Feature disabled by default (`BANK_LINKING_ENABLED !== true`)                                | Not active for pilot until provider ledger integration exists              |
| Bulk payments                             | `BulkPaymentService`                              | Feature disabled by default (`BULK_PAYMENTS_ENABLED !== true`)                               | Not active for pilot until async processor executes via transfer service   |
| Recurring transfers                       | `RecurringTransferService` setup only             | Execution job not implemented here                                                           | Setup protected by PIN/idempotency; execution objective tracked separately |
| Scheduled payments                        | `ScheduledPaymentService.executeSchedule`         | Executes through `InternalTransferUseCase`                                                   | Confirmed via transfer use case boundary                                   |

## Decision

Do not add local balance debit logic to Korido API for delegated services. Active spend flows must either execute through Blnk-backed wallet use cases or delegate to a service that owns its own Blnk-backed debit.

Disabled feature modules may expose read/empty/unavailable states, but must not be enabled for money movement until their provider implementation uses the same ledger authority.
