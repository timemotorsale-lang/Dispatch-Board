# VEH-129 — Governed partner API foundation

The partner boundary is provider-neutral and enforces the controls required before exposing vehicle operations to external systems:

- credentials are tenant-scoped, expiry-aware, active-state checked, and least-privilege by explicit `PartnerScope`;
- collection responses use bounded cursor pagination (default 25, maximum 100);
- every request may be protected by a partner-scoped idempotency key, with payload-hash conflict detection;
- partner calls consume a per-minute rate-limit bucket and fail closed when exhausted;
- webhook subscriptions require HTTPS, an API version, and a secret reference, and are filtered by organization and partner;
- API deprecation responses identify a sunset date and replacement version.

`src/server/integrations/partner-api.ts` is a pure boundary module so persistence, secret storage, delivery workers, and provider adapters can be wired in the subsequent integration slices without changing the contract. In-memory registries are intentionally process-local test/runtime defaults and must be replaced with durable stores before production activation.
