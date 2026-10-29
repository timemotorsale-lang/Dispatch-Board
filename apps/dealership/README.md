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

### Appointment calendar preview

`/appointments`, also linked from My Garage → Appointments, shows an isolated calendar
simulator only for a permitted `PREVIEW` snapshot. The sample week/people/time slots
are invented; simulated confirmations, reschedules and cancellations never call an
API, reach CRM, populate request forms or create My Garage bookings. Reload/navigation
resets the example. Non-preview mode shows unavailable scheduling and no sample cards.
Service/test-drive requests remain the existing private preview workflow, not live intake.

Staff can review the same demo and an authorized native calendar read in Website
Console → Appointments. That private API is not imported or called by the customer
app. See `docs/appointments/WEBSITE_APPOINTMENTS_PREVIEW.md` in the parent repository
for the future secure intake bridge and production gates. `NEXT_DIST_DIR` can select
a separate Next.js cache directory for isolated review servers; it defaults to `.next`.

## Sample isolation and adoption rules

`config/sample-policy.mjs` is shared by build configuration, inventory loading, sample APIs and request guards. `DEALERSHIP_ENVIRONMENT` accepts only `development`, `private-review`, or `public-production`. Without an explicit value, Node development/test defaults to development; other runtimes default to public production, samples off. Production runtime cannot declare itself development. Invalid configuration fails the Next build and returns an unavailable response if introduced at runtime; it never silently falls back to samples.

- Development requires the explicit `DEALERSHIP_PREVIEW_DATA=1` opt-in and loopback Host for sample pages/media/APIs.
- Private review requires `DEALERSHIP_ENVIRONMENT=private-review`, `DEALERSHIP_HOSTED_REVIEW=1`, the sample opt-in, a gateway key of at least 32 characters and a credential-free HTTPS review origin. Requests must prove gateway access; mutation Origin checks remain mandatory. Review responses are private/no-store/noindex. Keep this behind the existing authorized staff gateway, not a public domain.
- Public production rejects sample opt-in, hosted-review flags and review base paths. It cannot serve the sample-media endpoint or open the SQLite preview store. Real account/request integrations remain disabled, not replaced by sample receipts.
- Sample mode and `DEALERSHIP_LISTINGS_PATH` cannot be enabled together. A failed or missing LIVE feed produces the existing honest unavailable/empty state, never fixture inventory.
- Public feeds must have `schemaVersion: 1` and `dataMode: "LIVE"`. Fixture feeds are marked `dataMode: "SAMPLE"`; known sample flags, reserved sample/demo/fixture ID prefixes and sample-media references are rejected from public inventory. Provenance must be assigned by the trusted publication bridge; naming checks cannot prove arbitrary manually falsified data is real.
- Fixtures live in `fixtures/`, not `public/`. The existing illustrative photo is served through a fixed, guarded `/api/sample-media/rav4` route with private/no-store headers. Preview images bypass the image optimizer to avoid a shared image-cache path. Do not add fixture photos back under public media or embed them into public templates.
- Docker target `website-review-runner` explicitly packages fixtures for private review. New target `website-production-runner` removes fixtures before building and never copies them into the runtime image. CI builds both targets and checks the public package for fixture absence. Docker validation requires CI or a Docker-equipped host; it is not a deployment action.

The selected layout and shared UI stay independent of inventory provenance. Adoption means binding an approved template to verified LIVE records/media, not promoting demo records. The authenticated staff Design Studio remains a separate, private review tool; its embedded illustrative snapshot is not included in the customer website runtime. The development inventory now has 24 fictional review records (23 unsold), with varied body styles, colors, features, pricing and availability. See `fixtures/README.md` for scope and photo limitations. Selecting a production template and activating real providers remain separate work.

The supported webpack mode is explicit: the initial Turbopack configuration attempted to compile the parent staff proxy; no staff imports were added to fix that failure. The successful production build contains only the customer catch-all, not-found and preview API routes. The installed Next runtime emitted a security advisory during validation; no automatic dependency upgrade was applied. Review and remediate that warning before any public release.

## Implemented foundation

- Responsive shared shell with approved Home / Shop / Garage / More navigation, Home, inventory search/filter/sort, public vehicle detail and return context.
- Strict allowlisted/versioned/fresh listing projection. No direct private operations imports, staff cookies or database queries. Default is no connected inventory, not fake live stock.
- Purchase preferences, guest email-or-phone review, Sell/Trade and Service step flows, VIN camera capture with typed/manual fallback, clear decoder-not-connected state.
- Explicit local-only preview persistence with SQLite, hashed anonymous preview session credentials, isolated records, idempotent submissions, saved vehicles, personally entered vehicles and context-bound messages.
- Honest unavailable states for live accounts, record linking, document uploads, financial/signing providers, holds, staff delivery, published contact/hours, AI and budget estimates. No mock live approvals, charges, bookings or completion.

## Guided service intake

`/service` has a dedicated four-step request workflow: vehicle, concerns, visit preferences, and review/contact. It supports manual year/make/model, optional mileage/VIN, rear-camera barcode capture and the existing protected NHTSA basic-specification lookup in private preview. VIN lookup does not establish ownership, diagnosis, history or entitlement to dealership records. Editing fields aborts pending lookups, and camera streams stop on close/unmount. Existing session-owned My Garage vehicles prefill the service workflow without a new scan.

Concern cards describe requested help, not an approved service menu. Customers can describe an uncertain symptom, report a driving concern and request flexible timing or a preferred date. Driving-concern answers surface a non-emergency warning; the form never diagnoses safety or dispatches towing. Dates are validated against the Minnesota calendar day on both client and server; returning to flexible timing clears stale date/time preferences. Hours, appointment capacity, supported work, transportation and pricing are not invented.

Versioned service details are allowlisted and validated server-side, including real dates, category choices, vehicle facts and preferred contact compatibility. Unknown authorization, diagnosis, appointment and price fields are discarded. Legacy local service receipts remain readable. Email or phone is enough; phone entry does not grant texting/marketing consent. No attachments, identity documents, payment details or sensitive financial information are requested.

Answers persist between steps in component memory, not localStorage or query parameters. Reload/navigation clears an unsent draft. Submission uses the existing session-scoped, idempotent private SQLite preview API. My Garage opens a service-specific receipt and its existing context-bound preview messaging. Only a local saved request is shown—no appointment, repair order, estimate, live status, paid-work authorization or staff delivery is created.

**Production prerequisites:** use Website Console → Providers & Setup for staff bridge, scheduling, accounts, notifications, storage and monitoring requirements. Before enabling real service intake, approve the service catalog/hours/coverage, advisor ownership, capacity and conflict rules, diagnostic-fee disclosures, estimate and separate repair authorization, supported cancellation/rescheduling, secure record retention and customer access, notification consent, failure/retry escalation and release/collection controls. Connect and validate these against the actual service operations system; a booking subscription alone is not an operational service department. No providers are selected or activated here. The framework security advisory remains a release blocker.

Tests: `tests/service-intake.test.ts` and `tests/e2e/service.spec.ts` cover validation, Minnesota dates, contact matching, idempotency, isolation, request/receipt handoffs, manual VIN fallback, edits, accessibility and public denial. Physical-phone camera reliability still needs device testing.

## Interactive buying preparation

`/how-it-works` provides a four-step guide, an editable buying plan, vehicle summary, contextual next actions and FAQs. Choose a fresh available listing, cash/partner/own-bank/undecided payment approach, and optional trade. Only allowlisted vehicle/payment/trade choices enter the URL; contact details, prices, approval flags and arbitrary return destinations are not used. Changes apply immediately, reload restores those preferences, and reset clears them. This is preparation, not an order or reservation.

Private preview actions connect to purchase preparation, vehicle questions, test-drive requests, payment estimates, Sell / Trade and My Garage. Purchase forms inherit the choices and return with edited preferences. Saved purchase requests expose those preferences and a safe resume link only within their existing anonymous preview session; existing context-bound preview messaging remains available. No cross-device identity, live staff receipt or audited purchase/trade association is implied.

The estimate calculator can prefill a selected vehicle's price from the server-validated listing, never a query-supplied amount. Cash selections open cash mode; other selections open vehicle-payment mode. All existing private-environment, unknown-fee confirmation and disclosure gates remain. A trade appraisal starts with the customer's separate vehicle and trade intent, never the vehicle being purchased; no trade value, payoff or tax credit is inferred.

Missing, reserved, sold, coming-soon or expired listings cannot unlock purchase preparation. The preview API reloads and rechecks current availability/freshness before saving a purchase request. Public mode does not substitute sample inventory or enable the private calculators, preview API, live checkout or staff delivery. Provider decisions and their onboarding requirements remain in **Website Console → Providers & Setup**; selecting preferences does not activate any integration.

Tests: `tests/buying-plan.test.ts`, `tests/purchase-intake.test.ts` and `tests/e2e/buying-guide.spec.ts` cover safe context, availability revalidation, preference handoffs, preview receipts/resume, separate trade entry, calculator prefills, responsive/accessibility checks and public isolation. Production financing, payments, signing, confirmed appointments, inventory commitments, secure accounts, staff exchange and authorized handoff remain release requirements, not completed operations.

## Guided Sell / Trade appraisal review

`/sell` uses the Time Motor Sales-branded, six-step appraisal review: vehicle confirmation, condition, history, optional local photo, plans, and contact/review. A persistent summary masks the VIN and shows actual provided specifications, not invented equipment or a stock photo presented as the customer's car. Desktop uses a side summary; mobile places a compact summary before the questions. Large cards have native checkbox/radio semantics, None known/Not sure are exclusive with issues, zero keys is supported, back/edit preserve answers, and non-drivable answers advise against driving an unsafe vehicle. No default answers imply a clean condition. No ownership upload is required to begin.

VIN barcode capture prefers the rear camera and releases streams on cancel/capture/unmount. Typed VIN and manual year/make/model remain available. The protected, same-origin POST `/api/vin-decode` sends only a validated full VIN to the fixed [NHTSA vPIC endpoint](https://vpic.nhtsa.dot.gov/api/). It uses a 10-second timeout, no-store/no redirects, a bounded response, 30 requests/minute and at most three concurrent requests per server process. This is a private-preview throttle, not distributed production abuse protection. No VIN cache or provider credentials are introduced. Public mode rejects lookup. Partial/failure states require manual confirmation; vPIC is not ownership/history/valuation or installed-options evidence. Color is not decoded or inferred.

Image selection prefers the customer's local photo, then a licensed exact year/make/model/available-trim catalog match, then a neutral silhouette. The matching helper permits only approved same-origin appraisal-media paths. **No licensed catalog/provider or representative media is connected or bundled yet**, so the current app uses a silhouette until a customer selects a photo. No AI image or competitor image is substituted. Representative matches must carry the label that the vehicle may differ.

Customer photos are optional local object URLs, not uploads. JPEG/PNG/WebP are checked by type, signature, 5 MB size and decoded dimensions (up to 12,000 per side and 40 MP); HEIC/SVG are unsupported. Replace/remove/unmount revokes object URLs; changing vehicle facts clears the photo. Photo bytes, filenames and URLs are excluded from submissions and storage. Only synthetic photos and details should be used in the preview. Secure photo storage, scanning, metadata stripping, access controls, retention, licensed catalog sourcing and live attachments are release work, not completed by this local selection tool.

Answers remain in component memory while moving between steps. Exit or reload clears the unsent draft; there is no localStorage contact data or cross-device draft-resume claim. Preferred email or phone must have a matching contact field, and phone does not grant texting/marketing consent. Guest sample submission uses the existing private session/idempotent preview API. Versioned appraisal details are validated server-side, unknown fields/photos/offer amounts are discarded, and saved requests use `PREVIEW_RECEIVED`/SALES. My Garage shows only that session's saved preview requests. Legacy service and purchase flows remain unchanged.

**Not operational for real customers yet:** live staff appraisal queue/delivery, secure accounts and status updates, approval/expiration of offers, photo uploads, valuation provider, appointment/inspection, title/payoff review and payment are not connected. The receipt explicitly says saved privately and not delivered to staff. No offer amount, trade tax benefit, response SLA or payment is fabricated. The installed Next framework security advisory must also be resolved before release. No subscriptions, migrations, production writes or deployment are included.

Tests: `tests/appraisal.test.ts` covers answer validation, image precedence/licensing guards, provider projection/failures, route isolation/throttling and preview idempotency. `tests/e2e/appraisal.spec.ts` uses isolated private/public test URLs for the full flow, optional photo, failure/manual path, mobile/accessibility and public denial. Camera capture still needs physical-phone testing over HTTPS/localhost; automated tests do not establish real device scanning reliability.

## Private Shop by Payment calculator

`/finance` and `/budget` now render the split-panel estimate calculator only for a server-confirmed PREVIEW snapshot in the protected sample environment. Vehicle imagery is illustrative and uses the guarded sample-media route. Public or unavailable snapshots retain the original funding-options or not-configured state; a query parameter cannot enable the draft calculator.

The calculator has budget and vehicle-price modes, using the draft 8% annual-interest assumption (not lender-confirmed APR), 24/36/48/66/72 months, capped $350 documentation fee and referenced Minnesota transfer/tax assumptions. Additional vehicle-specific charges require an explicit checked amount; unknown fees are not zero. No trade-in calculation, credit check, application or approval is offered. Results are not saved. Budget matching applies only a cash-price filter to sample vehicles.

Select **Cash purchase** in the calculator for the estimated out-the-door total and expandable breakdown. It requires the vehicle price and confirmed charges, not a down payment or loan term. No loan interest or financing-only lien fee is added; deposits/trade credits/prior payments are not deducted. Unknown charges block the estimate, and editing inputs updates or removes the previous total. This remains a private estimate, not a final purchase agreement.

Staff review: **Website Console → Payment Estimates**. Public activation, recorded dual approvals and production fee/eligibility/disclosure validation are not implemented. See `packages/payment-estimates/README.md` for official references, rounding assumptions and the release boundary. Both customer Docker builder targets explicitly copy this neutral shared module; no staff data or provider code is imported.

## Public feed contract

`DEALERSHIP_LISTINGS_PATH` may point to a separately approved public JSON projection. `schemaVersion` must be `1`; each visible row needs `publication: APPROVED`, safe identity/photo fields, integer source/price versions, observed timestamp and future valid-until timestamp. Do not point this at raw staff/customer exports. The loader projects an explicit safe field set, skips non-approved rows and rejects invalid/stale snapshots. The private operations publishing worker and canonical commitment handshake are not implemented yet.

### Discovery specification filters

The sidebar supports multi-select make/model, body, fuel, drivetrain, transmission, exterior/interior color and cylinders; year/mileage ranges; minimum combined MPG/seats; all-selected features; and verified price drops. Different groups combine with AND, alternatives within a group combine with OR, and selected features must all be present. URLs retain repeated parameters, keyword searches and sorting. Unknown facts never match a selected specification filter.

Selections update results automatically without an Apply button or pinned footer. Checkbox changes apply immediately; valid numeric edits apply after a 400 ms pause (Enter applies immediately). Native Next-integrated history updates preserve scrolling, open accordions, option-list searches, and the mobile filter dialog. Browser back/forward restores criteria. A single scroll container holds the full sidebar; expanded option lists have no nested height limit. Clear-all stays in the header, and mobile users close the dialog with its header close control after reviewing live results.

Approved public rows may optionally supply `features` (up to 100 bounded strings), `exteriorColor`, `interiorColor`, `mpgCombined` (published combined MPG, not MPGe), `seatingCapacity`, `cylinders`, and `previousPrice`. These are explicitly projected and validated; missing/null fields remain unknown and are not inferred from make/model or photos. Original RAV4 preview records retain unknown specifications; the expanded sample pack supplies explicitly fictional specifications for filter review, not verified manufacturer facts or live inventory. Delivery terms and public payment estimates remain unconnected; no free shipping or financing offer is claimed. A price-drop filter requires an explicit previous price above the current price.

Filter choices are no longer limited to stock. `/api/vehicle-catalog` loads NHTSA vPIC makes for passenger cars, multipurpose passenger vehicles and trucks, including historical entries. Selecting makes loads their automobile-category models, excluding motorcycle-only models from multi-category manufacturers. This is US-focused catalog coverage, NOT a claim of every global/historical automobile. Provider requests use fixed endpoints, validated IDs (at most 20 makes), timeouts, coalesced requests, and a bounded 24-hour in-memory cache. No customer data is sent. Loading/error/retry states preserve inventory options and active selections. Hosted-review path protection remains in the existing proxy.

Body, fuel, drivetrain, transmission, feature, color and cylinder categories combine broad standard choices with published inventory values. These extensible lists are not exhaustive manufacturer-option catalogs. Zero-stock choices remain selectable, show actual matching counts, and never manufacture listings or specifications. Option-list searches hide labels without unmounting checked controls, preserving multi-select choices on submission. Model exploration depends on selected makes rather than loading every model into one enormous list.

## Privacy and preview data

Vehicle-card and detail hearts open the branded favorites dialog before any save/remove action. The private review email field is a demonstration: it validates a fictitious email locally, but does not send/store it, look up accounts, verify identity or subscribe anyone. Confirming uses the existing session-scoped SAVE/UNSAVE command with only the vehicle ID; cancel/Escape creates no record. My Garage remains browser-session-only. Google/Apple buttons are explicitly disabled and unconnected; live email/social sign-in must use the approved identity provider before real cross-device favorites are offered. Dialog focus, keyboard dismissal, scroll containment, validation and removal are covered by `tests/e2e/favorites.spec.ts`.

The private loader supplies allowlisted, bundled representative photos for all sample body styles. `/api/sample-media/[image]` enforces the existing preview host/environment policy, no-store/noindex headers and a fixed filename map; public mode denies access and LIVE projections reject these media paths. Cards explicitly disclose that illustrative vehicles/colors may differ. No customer photo or exact VIN match is implied. See `fixtures/README.md` for generated-asset provenance.

`.data/preview.sqlite` is ignored and local only; never put real customer data in this development preview. No contact fields are saved in browser local storage. The HttpOnly preview cookie grants only this local anonymous session, expires after 24 hours as a development fixture and is not production authentication. Production storage, retention, approved secure-email auth and customer linking remain blocked. Ending a preview session revokes access; automatic data-retention/deletion policy is not invented.

Generated sample RAV4 photography is illustrative. It must never represent an actual published inventory unit without appropriate replacement/approval. No example photo is shown as live stock by default.

## Milestone and release status

This is not completion of the full master prompt. Staff integration, durable production customer storage, account authentication/recovery/linking, co-buyers, requested-document storage/review, canonical exclusive holds, verified finance/deposit/signature adapters, handoff/release, hours/policies/contact publication, AI/messaging and production recovery evidence are still required. SQLite preview receipts explicitly say not delivered to staff. No production provider, new subscription, migration, release or deployment has been enabled.

The source-of-truth planning package remains unchanged. Preserve A/B/C launch ambition; never declare a lead-only substitute or provider-disabled preview a completed production launch.
