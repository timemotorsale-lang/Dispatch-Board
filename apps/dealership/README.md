# Time Motor Sales customer application

Implementation foundation on the existing website branch. This is a separate Next.js application; it does not change the private staff application's routes, sessions, database or deployment.

## Local commands

From `apps/dealership`, using the repository's existing installed dependencies:

```text
node ../../node_modules/next/dist/bin/next dev . --webpack --hostname 127.0.0.1 --port 3100
node ../../node_modules/typescript/bin/tsc --noEmit
node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts
node ../../node_modules/next/dist/bin/next build . --webpack
```

Set `DEALERSHIP_PREVIEW_DATA=1` explicitly for private development. Sample records cannot load in production, even if that flag is set. Use fictitious contact information only. Bind preview to loopback; do not publish or forward it. No dependency installation or upgrade is necessary in the current checkout. A clean standalone deployment will need its own reproducible dependency installation and release review.

The supported webpack mode is explicit: the initial Turbopack configuration attempted to compile the parent staff proxy; no staff imports were added to fix that failure. The successful production build contains only the customer catch-all, not-found and preview API routes. The installed Next runtime emitted a security advisory during validation; no automatic dependency upgrade was applied. Review and remediate that warning before any public release.

## Implemented foundation

- Responsive shared shell with approved Home / Shop / Garage / More navigation, Home, inventory search/filter/sort, public vehicle detail and return context.
- Strict allowlisted/versioned/fresh listing projection. No direct private operations imports, staff cookies or database queries. Default is no connected inventory, not fake live stock.
- Purchase preferences, guest email-or-phone review, Sell/Trade and Service step flows, VIN camera capture with typed/manual fallback, clear decoder-not-connected state.
- Explicit local-only preview persistence with SQLite, hashed anonymous preview session credentials, isolated records, idempotent submissions, saved vehicles, personally entered vehicles and context-bound messages.
- Honest unavailable states for live accounts, record linking, document uploads, financial/signing providers, holds, staff delivery, published contact/hours, AI and budget estimates. No mock live approvals, charges, bookings or completion.

## Public feed contract

`DEALERSHIP_LISTINGS_PATH` may point to a separately approved public JSON projection. `schemaVersion` must be `1`; each visible row needs `publication: APPROVED`, safe identity/photo fields, integer source/price versions, observed timestamp and future valid-until timestamp. Do not point this at raw staff/customer exports. The loader projects an explicit safe field set, skips non-approved rows and rejects invalid/stale snapshots. The private operations publishing worker and canonical commitment handshake are not implemented yet.

## Privacy and preview data

`.data/preview.sqlite` is ignored and local only; never put real customer data in this development preview. No contact fields are saved in browser local storage. The HttpOnly preview cookie grants only this local anonymous session, expires after 24 hours as a development fixture and is not production authentication. Production storage, retention, approved secure-email auth and customer linking remain blocked. Ending a preview session revokes access; automatic data-retention/deletion policy is not invented.

Generated sample RAV4 photography is illustrative. It must never represent an actual published inventory unit without appropriate replacement/approval. No example photo is shown as live stock by default.

## Milestone and release status

This is not completion of the full master prompt. Staff integration, durable production customer storage, account authentication/recovery/linking, co-buyers, requested-document storage/review, canonical exclusive holds, verified finance/deposit/signature adapters, handoff/release, hours/policies/contact publication, AI/messaging and production recovery evidence are still required. SQLite preview receipts explicitly say not delivered to staff. No production provider, new subscription, migration, release or deployment has been enabled.

The source-of-truth planning package remains unchanged. Preserve A/B/C launch ambition; never declare a lead-only substitute or provider-disabled preview a completed production launch.
