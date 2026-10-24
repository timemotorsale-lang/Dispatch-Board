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

Set `DEALERSHIP_ENVIRONMENT=development` and `DEALERSHIP_PREVIEW_DATA=1` explicitly for local sample review. Use fictitious contact information only. Bind development preview to loopback; do not publish or forward it. Samples are prohibited in public production, even if a preview flag or gateway key is accidentally present. A private hosted review can use a production build only with its separate explicit environment and staff gateway. No dependency installation or upgrade is necessary in the current checkout.

## Sample isolation and adoption rules

`config/sample-policy.mjs` is shared by build configuration, inventory loading, sample APIs and request guards. `DEALERSHIP_ENVIRONMENT` accepts only `development`, `private-review`, or `public-production`. Without an explicit value, Node development/test defaults to development; other runtimes default to public production, samples off. Production runtime cannot declare itself development. Invalid configuration fails the Next build and returns an unavailable response if introduced at runtime; it never silently falls back to samples.

- Development requires the explicit `DEALERSHIP_PREVIEW_DATA=1` opt-in and loopback Host for sample pages/media/APIs.
- Private review requires `DEALERSHIP_ENVIRONMENT=private-review`, `DEALERSHIP_HOSTED_REVIEW=1`, the sample opt-in, a gateway key of at least 32 characters and a credential-free HTTPS review origin. Requests must prove gateway access; mutation Origin checks remain mandatory. Review responses are private/no-store/noindex. Keep this behind the existing authorized staff gateway, not a public domain.
- Public production rejects sample opt-in, hosted-review flags and review base paths. It cannot serve the sample-media endpoint or open the SQLite preview store. Real account/request integrations remain disabled, not replaced by sample receipts.
- Sample mode and `DEALERSHIP_LISTINGS_PATH` cannot be enabled together. A failed or missing LIVE feed produces the existing honest unavailable/empty state, never fixture inventory.
- Public feeds must have `schemaVersion: 1` and `dataMode: "LIVE"`. Fixture feeds are marked `dataMode: "SAMPLE"`; known sample flags, reserved sample/demo/fixture ID prefixes and sample-media references are rejected from public inventory. Provenance must be assigned by the trusted publication bridge; naming checks cannot prove arbitrary manually falsified data is real.
- Fixtures live in `fixtures/`, not `public/`. The existing illustrative photo is served through a fixed, guarded `/api/sample-media/rav4` route with private/no-store headers. Preview images bypass the image optimizer to avoid a shared image-cache path. Do not add fixture photos back under public media or embed them into public templates.
- Docker target `website-review-runner` explicitly packages fixtures for private review. New target `website-production-runner` removes fixtures before building and never copies them into the runtime image. CI builds both targets and checks the public package for fixture absence. Docker validation requires CI or a Docker-equipped host; it is not a deployment action.

The selected layout and shared UI stay independent of inventory provenance. Adoption means binding an approved template to verified LIVE records/media, not promoting demo records. The authenticated staff Design Studio remains a separate, private review tool; its embedded illustrative snapshot is not included in the customer website runtime. Expanding the demo catalog, selecting a production template, and activating real providers are outside this change.

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
