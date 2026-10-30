# Autobody Estimating Implementation Status

Branch: `codex/autobody-estimating`. The separate generic/manual experience is implemented for local owner review. The existing console remains the default. No push, merge, deployment, customer communication, supplier purchase or insurer submission is included.

## Roadmap evidence

| Milestone | Delivered scope | Evidence and remaining boundary |
| --- | --- | --- |
| ABE-001 | Source inventory and explicit generic release scope | [Source register](SOURCE_AND_COVERAGE.md). No commercial entitlement, exact-vehicle approval or qualified reviewer decision has been supplied. |
| ABE-002 | Stable component/method IDs, versioned taxonomy and legacy reconciliation | 84 components, 249 operations, 15 families. Historical seed allowances are not silently imported. |
| ABE-003 | Canonical context and durable scoped drafts | Authorized API, expected versions, snapshots and receipts. Intake retains vehicle, inventory/customer path and saved-scope return context. Pre-intake scope resumes as a new RO draft while preserving the original. Tests cover reuse, replay, stale saves, foreign-company evidence, location grants and inactive access. |
| ABE-004 | Compact Build/Review workspace and generic diagram viewer | Area map, synchronized components, assembly/component/detail views, separate layers, expansion, zoom, keyboard/pan and real touch pinch/pan checks. Tablet and phone panels preserve controls. Browser interactions and WCAG A/AA scanning pass. |
| ABE-005 | Deterministic integer-cent calculations | Category rates, explicit manual time/basis/applicability, parts fitment/prices, material/vendor references, pending values, rounding, shared access and competing methods. Taxable discounts needing allocation are explained rather than guessed. |
| ABE-006 | Official estimates and frozen documents | Exact collision scope needs no fabricated diagnosis. Server validates normalized lines, tax, payer and rate override. Provenance includes calculation/catalog and active rate-policy identity/version. Retry returns one estimate/document. |
| ABE-007 | Parts and vendor continuity | Stored parts lookup, manually reviewed price/fitment, canonical part numbers and RO-aware procurement entry. Candidates create no orders; ordered/received/installed states remain authoritative. Private original photos use the existing evidence service. |
| ABE-008 | Authorization, jobs, QC, release, billing and closeout | Synthetic customer-pay, internal-recon and vendor-only journeys pass through real services to closeout. A measured 47-minute fixture is separate from a 90-minute allowance. Internal recon posts no customer invoice or automatic inventory cost; vendor-only work needs no invented internal clock. |
| ABE-009 | Frozen revisions, supplements and comparison | Prior document hashes remain unchanged; changed scope needs exact-version approval. Comparison names added/changed/removed work and known totals. Interrupted generation recovers its receipt or reopens a separate review draft. |
| ABE-010 | Every declared family has generic/manual coverage | All 249 operations resolve to visual references. Exact-vehicle configurations, commercial allowances and technical approvals remain zero/unclaimed. |
| ABE-011 | Generic detail layers and recorded technical/material references | Structural, restraint, ADAS and HV choices are assessment/sublet only. Exact joining, mounting, measurement, fastener and vehicle-specific refinish content requires permitted sources and qualified review. That external content scope is not marked complete. |
| ABE-012 | Local automated and browser verification | Unit, restored-database, desktop/phone, accessibility, failed-save recovery and authenticated document/handoff checks. Real staff task timing and operational review have not been fabricated. |
| ABE-013 | Reversible owner review entry | Separate prototype route and explicit link from the current console. Removing the entry does not delete records. Owner acceptance and adoption remain pending. |
| ABE-014 | Practical provider/interchange boundary | Typed candidate contract, unconfigured/offline manual fallback and internal JSON export. No proprietary interchange, provider connection, automated photo interpretation or insurer submission is claimed. |

## Implemented contracts and decisions

- `GET /api/autobody-estimating`: scoped context/search, saved records/history and internal review export; private/no-store responses.
- `POST /api/autobody-estimating`: save, present, supplement, fresh-review recovery and vendor-return acceptance. Existing services own official decisions and financial records.
- Durable drafts/revisions retain composition; official estimates independently freeze calculations and provenance. Presented/interrupted drafts cannot be overwritten.
- Saved scope can be bookmarked with `draftId`. PostgreSQL JSON ordering is normalized before comparing save state. Customer/internal intake opens its existing canonical form; returning with a real RO validates the vehicle, preserves prior drafts and requires fresh applicability if a previously unidentified vehicle is now known.
- Category rates start from the actual shop policy; administrator overrides need an explanation. No vehicle-specific time is invented.
- Vendor return acceptance is structured enterprise audit evidence linked to the exact estimate, authorization, vendor version and selected quote lines. Releases have separate vendor-review references rather than fake QC job IDs. Keys, release evidence, empty exceptions and meaningful reasons remain enforced; database validation checks vendor acceptance references.
- Pure vendor-only billing supports authorized quoted vendor fees after return inspection. Mixed scope still needs actual jobs, clocks, installation evidence and QC. No supplier payment or automatic inventory-cost posting occurs.
- Optional providers are not required. Export is an internal review schema, not a licensed provider or insurer format.

## Database verification

Both local migrations were applied after recoverable backups, archive verification, actual restores into fresh loopback verification databases, migration of those copies and business-table checksum comparison. No reset or replacement of business records occurred.

- `20261030020000_autobody_estimating`
- `20261030030000_collision_vendor_release`

Private evidence is under `tmp/autobody/` and `tmp/database-backups/`, excluded from commits. The second applied migration checksum matches the reviewed file and retains the original reason-length safeguard.

## Validation record

- Prisma schema validation and client generation passed.
- The related shop/QC/billing sweep passed 93 checks. Final intake/scope/navigation checks passed 64 checks, including unchanged mechanical intake returns.
- Ten isolated database scenarios passed, including customer-pay, internal recon and vendor-only release/billing/closeout, frozen documents, supplements, duplicate commands, invalid provenance and vendor-acceptance rejection. Completion states and distinct measured time are synthetic fixtures; actual QC/release/billing/handoff services execute against them.
- The complete unit suite passed 5,308 tests with the valid isolated database and locked dependencies on `c5254759`. Later intake changes were verified by the focused 64-check run and authenticated browser scenarios. Earlier placeholder-credential failures were corrected rather than described as product defects.
- The browser harness passed diagram expansion, layer controls, diagram taps, keyboard/focus return, estimate editing, failed-save retry, frozen scope, supplements, phone layout and WCAG A/AA scanning.
- Two authenticated browser scenarios passed: shared scope/supplement/photo/PDF/export/390px panels, and the actual canonical check-in link plus saved-scope resumption, save, refresh and original-draft preservation. The frozen one-line estimate prints to one page.
- Local dependencies were synchronized to the existing lockfile: Next.js 16.4.2. Dependency declarations and lockfile were unchanged. The prior 16.4.0 installation caused framework interruption; it is no longer used.
- The clean production build of `e6734421` passed compilation, configured TypeScript checking and generation of all 403 static pages. Changed-source lint passed. Existing root-workspace temporary copies contaminated the first build attempt; the isolated worktree build preserved them and verified the committed app instead.

Repeatable local checks:

```text
node scripts/check-autobody-database.mjs
node scripts/check-autobody-ui.mjs
node scripts/check-autobody-browser.mjs
node scripts/check-autobody-regression.mjs
node scripts/check-autobody-build.mjs
```

Database/browser/regression/build runners enforce loopback and a restore-verified disposable database. To reproduce setup, inspect migration status and use the guarded backup/restore verifier; do not reset a database or rerun an already-applied migration blindly.

## Owner and external decisions

Use the [review walkthrough](REVIEW_WALKTHROUGH.md). Exact-vehicle technical content, supplier rights and qualified technical review remain external dependencies. Owner adoption is a separate decision. Software tests do not certify a collision repair procedure or a universal commercial labor guide.

## Vehicle-group / nested component refinement — October 30, 2026

Camry visual preview and direct review access were committed as `b69aa282`. The subsequent review-only assembly extension adds 11 body groups / 55 exterior views, 45 expandable assembly roots and 528 subcomponents. Current catalog totals: 619 components and 1,954 manual operations. Original draft IDs/schema and original operation versions remain valid; new operations identify the assembly-release source version. No database migration or default adoption is required.

The top-level **Vehicle diagrams & components** button opens the group selector directly. Nested component cards/tree branches, search, breadcrumbs and a direct operations handoff support door-to-motor/clip navigation. Assembly/child double charging requires an included-scope explanation. Unsupported detailed breakdowns are explicit and are not treated as proof that a part does not exist.

Validation: 106 focused unit checks passed (55 group/view bindings, ancestry/identity, bounded saved-line keys, safety/overlap checks and existing estimating/Camry regressions). Source TypeScript check and changed-source lint passed. Local browser checks covered minivan sliding-door selection, nested power-drive and window-regulator/motor navigation, and handoff from the expanded viewer to the selected component's operations. These software checks do not certify technical content or an exhaustive parts list.
