# Timeline API versioning and compatibility

## Versioning

- Public read endpoints are mounted under `/api/v1/timeline` (`GET /events`, `GET /events/:id`, `GET /stats`, `GET /eras`).
- The version prefix is part of the path. Breaking changes (removed fields, changed types, stricter validation that rejects previously valid input) require a new major path (`/api/v2/...`).
- Additive changes (new optional fields, new enum members for output-only values) are non-breaking and ship within `v1`.

## Contracts

`packages/contracts/src/timeline/endpoints.ts` is the single source of truth:

- `TimelineEventSchema`, `EraSchema` (re-exported from `@moonwitness/schema/timeline`)
- `TimelineListQuerySchema` (strict: rejects unknown query params; `limit` 1..100, `offset` >= 0)
- `TimelineListResponseSchema`, `TimelineEventResponseSchema`, `TimelineStatsResponseSchema`, `TimelineErasResponseSchema`
- `ApiErrorSchema` — the shared error envelope `{ error, code?, details? }`

Backend route validation and frontend types should import these instead of redefining shapes. No `z.any()` is permitted in core timeline request/response contracts; a contract test asserts the response schemas are concrete `ZodObject`s.

## Behaviour guarantees

- Deterministic ordering: events are ordered by `date ASC, id ASC`; pagination is `limit`/`offset`.
- List and count use identical filters and the same soft-delete rule (`status != 'deleted'`), so `total` matches the filtered data set.
- Validation failures return 4xx with the shared error envelope; unknown ids return 404.

## Backwards compatibility

- Existing field names and types in `v1` are stable.
- Consumers should ignore unknown fields and tolerate new optional fields.
- Removed/renamed fields or tightened input rules are announced via a new major version.
