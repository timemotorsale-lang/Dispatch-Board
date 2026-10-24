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

### Discovery specification filters

The sidebar supports multi-select make/model, body, fuel, drivetrain, transmission, exterior/interior color and cylinders; year/mileage ranges; minimum combined MPG/seats; all-selected features; and verified price drops. Different groups combine with AND, alternatives within a group combine with OR, and selected features must all be present. URLs retain repeated parameters, keyword searches and sorting. Unknown facts never match a selected specification filter.

Selections update results automatically without an Apply button or pinned footer. Checkbox changes apply immediately; valid numeric edits apply after a 400 ms pause (Enter applies immediately). Native Next-integrated history updates preserve scrolling, open accordions, option-list searches, and the mobile filter dialog. Browser back/forward restores criteria. A single scroll container holds the full sidebar; expanded option lists have no nested height limit. Clear-all stays in the header, and mobile users close the dialog with its header close control after reviewing live results.

Approved public rows may optionally supply `features` (up to 100 bounded strings), `exteriorColor`, `interiorColor`, `mpgCombined` (published combined MPG, not MPGe), `seatingCapacity`, `cylinders`, and `previousPrice`. These are explicitly projected and validated; missing/null fields remain unknown and are not inferred from make/model or photos. Preview samples deliberately do not invent these specifications. Delivery terms and payment estimates remain unconnected; no free shipping or financing offer is claimed. A price-drop filter requires an explicit previous price above the current price.

Filter choices are no longer limited to stock. `/api/vehicle-catalog` loads NHTSA vPIC makes for passenger cars, multipurpose passenger vehicles and trucks, including historical entries. Selecting makes loads their automobile-category models, excluding motorcycle-only models from multi-category manufacturers. This is US-focused catalog coverage, NOT a claim of every global/historical automobile. Provider requests use fixed endpoints, validated IDs (at most 20 makes), timeouts, coalesced requests, and a bounded 24-hour in-memory cache. No customer data is sent. Loading/error/retry states preserve inventory options and active selections. Hosted-review path protection remains in the existing proxy.

Body, fuel, drivetrain, transmission, feature, color and cylinder categories combine broad standard choices with published inventory values. These extensible lists are not exhaustive manufacturer-option catalogs. Zero-stock choices remain selectable, show actual matching counts, and never manufacture listings or specifications. Option-list searches hide labels without unmounting checked controls, preserving multi-select choices on submission. Model exploration depends on selected makes rather than loading every model into one enormous list.

## Privacy and preview data

`.data/preview.sqlite` is ignored and local only; never put real customer data in this development preview. No contact fields are saved in browser local storage. The HttpOnly preview cookie grants only this local anonymous session, expires after 24 hours as a development fixture and is not production authentication. Production storage, retention, approved secure-email auth and customer linking remain blocked. Ending a preview session revokes access; automatic data-retention/deletion policy is not invented.

Generated sample RAV4 photography is illustrative. It must never represent an actual published inventory unit without appropriate replacement/approval. No example photo is shown as live stock by default.

## Milestone and release status

This is not completion of the full master prompt. Staff integration, durable production customer storage, account authentication/recovery/linking, co-buyers, requested-document storage/review, canonical exclusive holds, verified finance/deposit/signature adapters, handoff/release, hours/policies/contact publication, AI/messaging and production recovery evidence are still required. SQLite preview receipts explicitly say not delivered to staff. No production provider, new subscription, migration, release or deployment has been enabled.

The source-of-truth planning package remains unchanged. Preserve A/B/C launch ambition; never declare a lead-only substitute or provider-disabled preview a completed production launch.
