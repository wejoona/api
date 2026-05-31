# Mobile Backend Contract Decisions

## PIN

- Canonical route: `/user/pin/*`.
- Mobile sends the PIN payload through the user PIN service.
- Money movement uses `X-Pin-Token` returned by `POST /user/pin/verify`.
- `/wallet/pin/*` may remain as deprecated backend aliases for one app release, but mobile must not call it.

## Sub-Business

- Active surface: list, detail, create, update, activate, deactivate, suspend, delete.
- Staff management and inter-sub-business transfer are not MVP until the ledger and RBAC model is complete.
- Mobile must not expose staff or transfer actions as working controls.

## Cards

- `GET /cards/:id/transactions` exists for mobile contract stability.
- Until card processor transaction ingestion is implemented, it returns an empty paginated response:
  `{ data: [], transactions: [], total: 0, limit, offset }`.
