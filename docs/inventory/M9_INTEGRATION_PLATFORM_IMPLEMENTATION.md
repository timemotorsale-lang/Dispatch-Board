# M9 — Integration platform

M9 establishes a provider-neutral integration boundary for VEH-120–VEH-129.

Delivered controls include an external-system inventory, field/source authority matrix, versioned adapter envelope and contract harness, conflict detection and reconciliation, explicit DMS/accounting, VIN/history, market/listing, parts-vendor, messaging, and payment boundaries, and a governed partner API contract with scopes, expiry, cursor pagination, rate limits, idempotency, webhook HTTPS/version checks, and deprecation metadata.

Provider credentials, durable partner credential storage, delivery workers, and real provider acknowledgements remain activation work. The in-memory conflict and partner registries are intentionally safe development defaults and must be replaced by durable stores before production enablement.
