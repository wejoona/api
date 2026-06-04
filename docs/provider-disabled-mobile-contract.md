# Provider Disabled Mobile Contract

Mobile-facing provider-disabled behavior is intentionally deterministic:

- Cards expose `available/status/reason/provider` on list responses and throw `CARD_PROVIDER_UNAVAILABLE` for create attempts when issuing is off.
- Bank linking exposes stable unavailable metadata and rejects linking or money movement with `BANK_LINKING_UNAVAILABLE` before touching local persistence.
- Deposit discovery returns an empty channel list when the Yellow Card gateway is disabled. Transactional deposit attempts return `DEPOSIT_PROVIDER_UNAVAILABLE`.
- Mobile money deposit and payout mocks are development/test only. Production-like environments reject mock provider switches during startup; unimplemented live providers return explicit unavailable errors instead of falling back to mock.
- External withdrawals preserve `WITHDRAWAL_PROVIDER_UNAVAILABLE` after voiding any Blnk inflight reservation.
- Bill Pay preserves downstream 4xx form/provider errors, but network and 5xx dependency failures normalize to `BILL_PAYMENTS_UNAVAILABLE`.

Mobile clients should use the code/reason field for localized copy and avoid branching on raw provider messages.
