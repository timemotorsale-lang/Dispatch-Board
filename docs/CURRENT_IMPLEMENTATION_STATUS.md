# Current Implementation Status

## 2026-08-27 — Unified CRM UCRM-100 enterprise sharing readiness held

The current CRM implementation branch now contains a safe enterprise field, record, and territory sharing readiness boundary. Management can inspect the formal access model, field classification, record-scope, territory-rule, policy-proof, admin-preview, audit, migration, scale-test, and rollback gates before any enterprise access override is treated as live.

This checkpoint does not grant new access, expose restricted fields, or activate territory sharing. Existing role and organization scope remains the fallback until product/security decisions and policy proof are complete.

Focused verification is recorded in [`docs/unified-crm/UCRM_100_ENTERPRISE_FIELD_SHARING_EVIDENCE.md`](unified-crm/UCRM_100_ENTERPRISE_FIELD_SHARING_EVIDENCE.md). `UCRM-100` is `HELD`: the readiness boundary is in source, but enterprise sharing activation is blocked by missing territory, record-sharing, admin-preview, policy-proof, scale, browser, and rollback evidence.

## 2026-08-27 — Unified CRM UCRM-086 accounting/DMS connector readiness held

The current CRM implementation branch now contains a safe accounting/DMS connector readiness boundary. Management can inspect the field ownership, mapping, conflict, backfill, incremental sync, reconciliation, sensitive data, failure recovery, and disablement gates before any accounting or DMS integration is treated as live.

This checkpoint does not select an external system, run sync, perform backfill, or write accounting/DMS records. All connector behavior remains disabled until one named system, field ownership map, mapping rules, conflict behavior, dry-run proof, reconciliation proof, browser proof, and rollback evidence are approved.

Focused verification is recorded in [`docs/unified-crm/UCRM_086_ACCOUNTING_DMS_CONNECTOR_EVIDENCE.md`](unified-crm/UCRM_086_ACCOUNTING_DMS_CONNECTOR_EVIDENCE.md). `UCRM-086` is `HELD`: the readiness boundary is in source, but live accounting/DMS activation is blocked by missing system, ownership, mapping, reconciliation, browser, and rollback decisions.

## 2026-08-27 — Unified CRM UCRM-085 e-signature readiness held

The current CRM implementation branch now contains a safe e-signature readiness boundary. Management can inspect the document authority, signer identity, immutable envelope evidence, webhook reconciliation, expiry/cancel, permission, template, audit, and rollback gates before any signature capability is treated as live.

This checkpoint does not create signature envelopes or import provider signature status. Envelope creation and signature-status import remain disabled until a provider, document authority model, signer identity policy, webhook proof, browser proof, and rollback rehearsal are approved.

Focused verification is recorded in [`docs/unified-crm/UCRM_085_E_SIGNATURE_EVIDENCE.md`](unified-crm/UCRM_085_E_SIGNATURE_EVIDENCE.md). `UCRM-085` is `HELD`: the readiness boundary is in source, but live e-signature activation is blocked by missing provider, authority, identity, webhook, browser, and rollback decisions.

## 2026-08-27 — Unified CRM UCRM-084 telephony and transcription readiness held

The current CRM implementation branch now contains a safe telephony/transcription readiness boundary for future click-to-call, inbound call routing, call recording, transcripts, and AI receptionist support.

This checkpoint does not enable phone service. Calling, recording, transcription, inbound routing, and AI receptionist behavior remain disabled while provider selection, recording consent, retention, restricted access, legal approval, operations routing, browser proof, and rollback proof remain unresolved.

Focused verification is recorded in [`docs/unified-crm/UCRM_084_TELEPHONY_TRANSCRIPTION_EVIDENCE.md`](unified-crm/UCRM_084_TELEPHONY_TRANSCRIPTION_EVIDENCE.md). `UCRM-084` is `HELD`: the readiness boundary is in source, but live telephony/transcription activation is blocked by missing provider, legal, retention, security, browser, and rollback decisions.

## 2026-08-27 — Unified CRM UCRM-083 SMS delivery readiness held

The current CRM implementation branch now contains a safe SMS delivery readiness boundary. Management can inspect the SMS activation gates before any texting capability appears as live.

This checkpoint is especially important for the future AI receptionist path because it defines consent, opt-out, templates, quiet hours, inbound correlation, delivery states, retry/failure handling, audit, cost/rate controls, and kill-switch expectations before automation can text a customer. Outbound SMS, inbound SMS, and provider configuration remain disabled.

Focused verification is recorded in [`docs/unified-crm/UCRM_083_SMS_DELIVERY_EVIDENCE.md`](unified-crm/UCRM_083_SMS_DELIVERY_EVIDENCE.md). `UCRM-083` is `HELD`: the readiness boundary is in source, but live SMS activation is blocked by missing vendor, consent, quiet-hours, cost, browser, and rollback decisions.

## 2026-08-27 — Unified CRM UCRM-082 email/calendar provider B readiness held

The current CRM implementation branch now contains a second-provider readiness boundary for future email/calendar integration. Provider B is explicitly independent from Provider A, so a first provider approval cannot silently authorize, configure, or prove a second provider.

This checkpoint does not select a second provider, connect OAuth, sync messages, write calendar events, or send email. Provider B has separate held gates for credentials, least-privilege scopes, conflict handling, dedupe isolation, security/privacy, browser proof, and rollback.

Focused verification is recorded in [`docs/unified-crm/UCRM_082_EMAIL_CALENDAR_PROVIDER_B_EVIDENCE.md`](unified-crm/UCRM_082_EMAIL_CALENDAR_PROVIDER_B_EVIDENCE.md). `UCRM-082` is `HELD`: the readiness boundary is in source, but live Provider B activation is blocked by missing provider-specific decisions and evidence.

## 2026-08-27 — Unified CRM UCRM-081 email/calendar provider A readiness held

The current CRM implementation branch now contains a safe provider A readiness boundary for future email/calendar integration. Management can inspect which gates must be satisfied before email, calendar sync, or calendar writes are allowed.

This checkpoint does not select a provider or connect OAuth. External sending, calendar writes, and inbound sync all remain disabled. The fallback remains manual CRM contact outcomes plus the source calendar workflow until a named provider, OAuth scopes, sync direction, backfill, conflict behavior, security handling, browser proof, and rollback rehearsal are approved.

Focused verification is recorded in [`docs/unified-crm/UCRM_081_EMAIL_CALENDAR_PROVIDER_A_EVIDENCE.md`](unified-crm/UCRM_081_EMAIL_CALENDAR_PROVIDER_A_EVIDENCE.md). `UCRM-081` is `HELD`: the readiness boundary is in source, but live provider activation is blocked by missing provider-specific decisions.

## 2026-08-27 — Unified CRM UCRM-080 integration platform contract implemented

The current CRM implementation branch now contains the provider-neutral integration platform readiness boundary for the next large external communications and integrations envelope. CRM can now expose a manager-only readiness model for future email/calendar, SMS, telephony/transcription, e-signature, and accounting/DMS connectors without connecting any vendor or allowing external side effects.

This checkpoint keeps the product deliberately safe. The default integration feature control remains disabled, provider activation is held, credentials are not stored or exposed, provider-specific gates remain separate, and the route fails closed for unauthenticated, unauthorized, and unknown-error states.

Focused verification is recorded in [`docs/unified-crm/UCRM_080_INTEGRATION_PLATFORM_EVIDENCE.md`](unified-crm/UCRM_080_INTEGRATION_PLATFORM_EVIDENCE.md). `UCRM-080` is `IMPLEMENTED_UNVERIFIED`: authenticated browser proof, environment rollback proof, and all provider-specific approvals remain pending. No email, SMS, phone, e-signature, calendar sync, or accounting/DMS behavior was enabled by this checkpoint.

## 2026-08-15 — Unified CRM UCRM-041 implemented and UCRM-042 advanced to a held immutable-review boundary

The current Unified CRM baseline now contains a real quote draft workspace inside `/crm/quotes`. Authorized CRM users can create or revise a visible quote draft through server-owned draft routes, the quote workspace now distinguishes live draft authority from held presentation authority, and quote saves remain typed, idempotent, audited, and version-aware.

The same packet also advances `UCRM-042` safely without overstating activation. Quote version history now opens on a real authenticated `/crm/quotes/[quoteId]/versions` route, presented evidence is shown as immutable history, and the present route fails closed with a typed held response instead of pretending that commercial presentation is active.

This checkpoint stays deliberately honest about the remaining gate. Exact pricing, discount, amount, and cumulative approval thresholds are still deferred in `UCRM-DEC-013`, so customer-facing quote presentation activation remains held even though the immutable review surface and fail-closed present boundary are now in source.

Focused verification passed on 2026-08-15 as recorded in [`docs/unified-crm/UCRM_041_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_041_IMPLEMENTATION_EVIDENCE.md) and [`docs/unified-crm/UCRM_042_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_042_IMPLEMENTATION_EVIDENCE.md). `UCRM-041` is `IMPLEMENTED_UNVERIFIED`; `UCRM-042` remains `HELD` until the deferred commercial authority decision and later live presentation gate are completed.

## 2026-08-15 — Unified CRM UCRM-040 quote foundation implemented

The current Unified CRM baseline now contains the first durable quote-foundation slice. Versioned quote storage is present in source through additive quote and quote-version models, and the CRM More area now opens a governed `/crm/quotes` review surface that exposes the new storage boundary without claiming draft, presentation, approval, or operational conversion authority.

This checkpoint stays deliberately honest about what is and is not active. Quote review uses its own fail-closed CRM access path, organization scope must resolve exactly once before any quote review model loads, seller access remains owner-scoped, and every non-read quote action remains held. The quote review page can show same-scope persisted quote records when they exist, but it does not create drafts, present commercial terms, request approvals, or infer any deferred monetary thresholds.

Focused service verification passed on 2026-08-15 as recorded in [`docs/unified-crm/UCRM_040_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_040_IMPLEMENTATION_EVIDENCE.md). `UCRM-040` is `IMPLEMENTED_UNVERIFIED`: migrated runtime proof, authenticated browser proof, full page/component regression proof, and the downstream governed draft/presentation slices are still required before verification or merge. `UCRM-041` and `UCRM-042` remain pending.

## 2026-08-15 — Unified CRM UCRM-024 task bridge implemented

The current Unified CRM baseline now contains a governed CRM-to-Task bridge inside Customer 360. Staff can create a real protected follow-up task from the permitted customer record while keeping the existing Task workflow as the write authority and source of truth.

This checkpoint moves the earlier handoff-only pattern into a real command boundary. Customer authorization, shell access, CRM customer read mode, and a dedicated CRM task-bridge mode must all be open before a task can be created; idempotent replay now returns the same committed task instead of duplicating follow-up work; and Customer 360 only shows the protected task surface when that bridge is actually available. When it is not available, the existing task-intake handoff remains the honest fallback.

The newest command-authority pass tightens that bridge further. The task bridge now explicitly requires the CRM mutation capability, its route returns the typed task-bridge error envelope with a safe generic `500` fallback, and Customer 360 keeps the task handoff surface honest by advertising it only when the full command authority is truly available.

Focused verification passed on 2026-08-15 as recorded in [`docs/unified-crm/UCRM_024_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_024_IMPLEMENTATION_EVIDENCE.md). UCRM-024 remains `IMPLEMENTED_UNVERIFIED`: authenticated browser proof and isolated PostgreSQL proof are still required before verification or merge. No external delivery, broader operational mutation, or source-of-truth transfer away from Tasks was enabled by this checkpoint.

## 2026-08-15 — Unified CRM UCRM-025 CRM Home “My Work” v1 authority hardening implemented

The current Unified CRM baseline now contains a real, persisted, read-only CRM Home and My Work queue that ranks owned or permitted work from existing Appointments, Leads, Cases, and CRM next-action customer follow-up records. Task rows are intentionally withheld from the live CRM queue in this checkpoint because tenant-safe Task organization authority is not yet proven without inference. Users can drill from the queue into the governed source workflow or, when a separately safe customer route exists, continue into Customer 360 without creating a second source of truth.

This checkpoint tightened day-to-day trust in the queue experience. Live work now fails closed unless shell mode, CRM customer read mode, and the dedicated CRM work mode are all in review; linked Customer 360 routes are omitted when a nested customer is absent, invalid, archived, merged, cross-organization, or outside owner scope; Today now shows same-day appointments instead of a simple first-few appointment list; and filter behavior stays honest by showing filtered counts and a no-match state instead of implying that no work exists. The overdue visual state also remains aligned with the live data contract so urgent work reads consistently on screen.

The current hardening packet goes a bit further. Appointment rows now require active schedule-view access for the resolved organization, Today classification uses `America/Chicago` instead of raw UTC day boundaries, and CRM Work now explains when visible results are partial because a live source hit its per-source cap. That keeps the queue honest about what it is showing and what it may still not have loaded.

The latest authority-hardening pass extends that honesty to source-owned records. Lead rows are now omitted when the Sales workspace is not permitted, Customer Resolution Case rows are omitted when the Customer Resolutions workspace is not permitted, and the live queue explanation now says when source-owned work is unavailable in the current workspace instead of implying that nothing exists there.

The newest queue-trust packet now adds lane-level source coverage visibility inside CRM Home and Work. Operators can see whether Appointments, Leads, Cases, and CRM follow-ups are available, capped, empty, or unavailable in the current workspace, plus the newest visible update time for each lane, before trusting the visible queue.

The latest work-queue authority packet sharpens that explanation one step further. Unavailable lanes now say whether the block came from missing workspace route authority, missing active organization schedule scope, or a live source-read failure, and customer follow-up rows now fail closed when the direct customer id is invalid instead of pointing to a misleading Customer 360 route.

Focused verification passed on 2026-08-15 as recorded in [`docs/unified-crm/UCRM_025_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_025_IMPLEMENTATION_EVIDENCE.md). UCRM-025 remains `IMPLEMENTED_UNVERIFIED`: authenticated browser proof and isolated PostgreSQL reconciliation proof are still required before verification or merge. No write, task mutation, appointment mutation, or opportunity-stage behavior was enabled by this checkpoint.

## 2026-08-15 — Unified CRM UCRM-030 foundation access hardening implemented

The current Unified CRM baseline now contains a tighter read-only opportunity foundation boundary. Opportunity create review and pipeline preview use the same shell-level fail-closed access path as opportunity detail, hub, and queue, so shell-off behavior is now consistent even when those services are invoked outside their page wrappers.

This checkpoint did not enable live opportunity creation, stage entry, transitions, source-lead mutation, or operational linkage. It only hardened the held and read-only foundation surfaces so that shell-off access is rejected before organization scope lookup in the affected services.

The newest read-only opportunity packet extends that honesty inside the review surfaces themselves. Opportunity detail now explicitly says whether a persisted source record is visible yet and, when one is visible, shows the latest visible source update time. Opportunity review hub now always shows the live-record lane, including the honest empty state when no same-scope persisted read-only opportunity is visible, instead of silently hiding that condition.

The latest read-only continuity packet makes persisted opportunity detail more useful without crossing the held lifecycle boundary. When a permitted customer is attached, detail now links safely back into Customer 360; it also exposes additional same-customer persisted read-only opportunities, filtered to the same organization and owner scope, so a reviewer can move between related records without implying live stage movement or write access.

Focused verification passed on 2026-08-15 as recorded in [`docs/unified-crm/UCRM_030_FOUNDATION_EVIDENCE.md`](unified-crm/UCRM_030_FOUNDATION_EVIDENCE.md). `UCRM-030` remains `HELD`: `UCRM-DEC-003` is still deferred, so the opportunity milestone is not complete and no live create path is authorized from this checkpoint.

## 2026-08-15 — Unified CRM UCRM-023 commitment and next action implemented

The current Unified CRM baseline now contains a hardened CRM customer next-action slice inside Customer 360. Staff can set, renew, reschedule, or complete a dated customer follow-up through the protected next-action route without sending an external communication or changing any source-owned operational workflow.

This checkpoint tightened both correctness and the day-to-day user experience. Exact customer authorization now precedes idempotency replay in the next-action repository, replay is bound to the same authorized customer subject, invalid stored replays fail closed, and stale or owner-missing updates remain typed conflicts instead of generic failures. Customer 360 now also carries a server-authored next-action state so the experience can explain whether the current follow-up is overdue, due today, scheduled, or absent, and the next-action form uses matching renewal language.

The newest authority pass aligns that command boundary with the actual CRM capability model. The next-action route now requires the dedicated CRM mutation capability in addition to shell review, customer-read review, and next-action command review; Customer 360 only advertises the live next-action form when that exact combined command authority is available; and the route now returns the typed next-action error envelope with a safe generic `500` fallback instead of treating unknown failures like validation errors.

Focused verification passed on 2026-08-15 as recorded in [`docs/unified-crm/UCRM_023_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_023_IMPLEMENTATION_EVIDENCE.md). UCRM-023 remains `IMPLEMENTED_UNVERIFIED`: authenticated browser proof and isolated PostgreSQL proof are still required. No external delivery, broader source mutation, or stage-dependent opportunity behavior was enabled by this checkpoint.

## 2026-08-15 — Unified CRM UCRM-020 unified permitted activity timeline implemented

The isolated `codex/unified-crm-console` branch now contains a stronger read-only Unified CRM customer timeline inside Customer 360. The timeline merges permitted customer interactions, task and resolution activity events, appointment history, lead and case creation context, promise events, and CRM next-action domain events without creating a second source of truth for those workflows.

This checkpoint tightened the security boundary as well as the experience. Customer 360 now resolves canonical permitted customer access before requesting timeline data, customer interactions and task-linked activity are organization-qualified, merged timeline pagination reports `hasMore` honestly across multiple source streams, and timeline items now carry stable correlation and source-record identity. The UI uses an ordered activity feed, clearer event-kind labels, honest empty-state language, and explicit source-authority messaging.

Focused integrated verification passed as recorded in [`docs/unified-crm/UCRM_020_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_020_IMPLEMENTATION_EVIDENCE.md). UCRM-020 remains `IMPLEMENTED_UNVERIFIED`: authenticated browser proof and isolated PostgreSQL proof are still required before verification or merge. No write or operational side effect was enabled by this checkpoint.

## 2026-08-15 — Unified CRM UCRM-021 manual contact outcome implemented

The isolated `codex/unified-crm-console` branch now contains a hardened manual contact outcome command path in Customer 360. Staff can record a manual relationship touchpoint through the existing CRM interaction form and protected CRM interaction route without sending an external message or changing source-owned communication systems.

This checkpoint tightened the command boundary substantially. Canonical customer authorization now precedes idempotency replay, outbound phone/text/email outcomes require positive canonical contact-point consent instead of trusting the submitted form state, replay is bound to the same authorized customer subject, invalid interaction commands return honest 400 responses, and unknown backend failures are masked by the route. The interaction form now also uses clearer non-sending language and stronger accessible submit-state behavior.

The newest command-authority pass makes that write boundary explicit and visible. Manual outcomes now require the dedicated CRM mutation capability in addition to shell review, customer-read review, and interaction-command review; Customer 360 only advertises the live interaction form when that exact combined command authority is available; and the surface now falls back to an honest review-only state with safe continuity links when the command is unavailable.

Focused integrated verification passed as recorded in [`docs/unified-crm/UCRM_021_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_021_IMPLEMENTATION_EVIDENCE.md). UCRM-021 remains `IMPLEMENTED_UNVERIFIED`: authenticated browser proof and isolated PostgreSQL proof are still required before verification or merge. No external communication delivery or broader operational write path was enabled by this checkpoint.

## 2026-08-15 — Unified CRM UCRM-022 notes and visibility implemented

The isolated `codex/unified-crm-console` branch now contains a hardened customer-note command path in Customer 360. Staff can record internal or, when authorized, restricted CRM notes through the protected note route and note form without sending a customer notification or changing source-owned workflows.

This checkpoint tightened the note boundary in the same fail-closed pattern as the interaction slice. Exact customer authorization now precedes idempotency replay, restricted-note creation remains gated behind sensitive-view capability, zero and multiple organization scopes are handled explicitly, route validation errors return honest typed statuses, and unknown backend failures are masked. The note form also now uses clearer internal-only language and stronger accessible pending/disclosure behavior.

The newest command-authority pass makes note entry follow the same explicit write model. Customer notes now require the dedicated CRM mutation capability in addition to shell review, customer-read review, and note-command review; Customer 360 only advertises live note entry when that exact combined command authority is available; and the note surface now fails closed with an honest review-only fallback when note entry is unavailable.

Focused integrated verification passed as recorded in [`docs/unified-crm/UCRM_022_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_022_IMPLEMENTATION_EVIDENCE.md). UCRM-022 remains `IMPLEMENTED_UNVERIFIED`: authenticated browser proof and isolated PostgreSQL proof are still required before verification or merge. No external delivery or broader operational note-sharing path was enabled by this checkpoint.

## 2026-08-14 — Unified CRM UCRM-012/013 customer truth checkpoint implemented

The isolated `codex/unified-crm-customer-truth` branch now contains the first real-data Unified CRM slice: a read-only Customers list backed by the existing canonical Customer and CustomerContactPoint records. Organization scope is derived on the server from active location grants, Sales remains owner-only, list contacts are always masked, production customer reads default off independently of the CRM shell, and the existing `/customers` console remains the safe fallback.

The experience provides explicit-submit search, status/owner filtering, stable pagination, honest read freshness, reachable loading, empty, filtered-empty, restricted, unavailable, error, and recovery states, semantic desktop and mobile layouts, and same-tab source-record links. Initial authenticated browser checks passed at 1440×900 and 390×844 without horizontal overflow or browser-console errors. The available Sales account exercised real empty and filtered-empty states.

Focused and affected tests passed as recorded in [`docs/unified-crm/UCRM_012_013_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_012_013_IMPLEMENTATION_EVIDENCE.md). UCRM-012 and UCRM-013 remain `IMPLEMENTED_UNVERIFIED`: the opt-in two-organization test still needs an isolated migrated PostgreSQL database, and Product Owner UCRM-UXR-1 review still needs a data-bearing list plus final denied/read-off browser proof. This branch is not merged, piloted, production-enabled, or authorized for customer writes. The unrelated service-close typecheck defect remains unchanged.

UCRM-014 is now `IMPLEMENTED_UNVERIFIED` on the stacked Customer 360 branch. The read-only detail route, masked contact and source boundaries, owner-scoped lead/case lenses, deep-route rollback controls, and denied-persona mobile evidence are recorded in [`docs/unified-crm/UCRM_014_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_014_IMPLEMENTATION_EVIDENCE.md). A permitted data-bearing Product Owner walkthrough and isolated PostgreSQL proof remain required before verification or merge.

## 2026-08-14 — Unified CRM UCRM-010/011 UX review checkpoint implemented

The isolated `codex/unified-crm-console` branch now contains an authenticated `/crm` route, Management/Sales route discovery, a deny-by-default CRM capability baseline, production-off review control, role-safe unavailable/fallback behavior, independent CRM navigation, and the first interactive UCRM-UXR-0 experience. The review shell prioritizes one next-action queue, one search, in-place context, and Today/Attention work; every displayed scenario is explicitly synthetic and non-writing.

Focused tests, lint, desktop/tablet/mobile browser checks, light/dark appearance, search, navigation, Escape behavior, focus return, overflow, authorized Sales, denied Technician, explicit feature-off, and reversible restoration checks passed as recorded in [`docs/unified-crm/UCRM_010_011_IMPLEMENTATION_EVIDENCE.md`](unified-crm/UCRM_010_011_IMPLEMENTATION_EVIDENCE.md). The Product Owner accepted the UCRM-UXR-0 experience direction on 2026-08-14. UCRM-010 is `VERIFIED` for its route-shell boundary; UCRM-011 remains `IMPLEMENTED_UNVERIFIED` until organization-scoped CRM data exists for cross-organization isolation proof. Integration disposition remains pending, and the branch is not approved for merge, pilot, production enablement, real customer data, or CRM writes. The known unrelated service-close typecheck failure remains unchanged.

## 2026-08-14 — Unified CRM foundation gate accepted

The Product Owner accepted the bounded business decisions for `UCRM-000` through `UCRM-009`: product identity and `/crm` boundary, internal-MVP scope and deferrals, initial access and sensitive-field defaults, canonical/commercial/data authority, service-quality targets, agent governance, and rollout/rollback authority. The accepted operating model makes UX visible early through interactive browser checkpoints while retaining complete vertical-slice, server-policy, accessibility, evidence, and rollback requirements.

This acceptance authorizes implementation of `UCRM-010` and `UCRM-011` only: the authenticated CRM route shell and capability-policy baseline. It does not claim that the route, UI, authorization, feature controls, tests, pilot, or release already exist. Exact opportunity stages, commercial thresholds, retention periods, named pilot users, external providers, and the milestones that depend on them remain deferred or held for later approval.

## 2026-08-14 — Unified CRM Console foundation package drafted

The documentation-first foundation for the independent Unified CRM Console is established under [`docs/unified-crm/README.md`](unified-crm/README.md). The package defines the product charter, evidence baseline, modular-monolith architecture, source-authority boundaries, security/privacy model, 8–10 week internal-MVP roadmap, `UCRM-###` vertical milestones, multi-agent operating model, testing and release gates, decision register, risk register, and requirement traceability.

The target console is `/crm`, sharing Dispatch Board authentication and platform infrastructure while preserving Customers, Inventory/Vehicles, Appointments, Tasks, Repair/Jobs, Documents, Activity, and other owning domains as authoritative. Existing `/customers` and `/sales` surfaces remain available until separately approved parity, pilot, rollback, and navigation-migration gates pass.

This checkpoint added planning and governance only. It did not add the `/crm` route, schema, migration, API, workflow, UI, integration, permission, AI behavior, production rollout, or retirement of an existing console. The later acceptance entry above records the bounded foundation decision.

## 2026-08-03 - Shop and Recon deterministic sixteen-stage workflow implemented

The Shop and Recon controlled foundation package is established under [`docs/shop-repair-optimization/foundation-implementation/README.md`](shop-repair-optimization/foundation-implementation/README.md), with its read-only code contract in `src/server/shop-recon/foundation.ts`. It publishes the exact sixteen-stage vehicle-flow lifecycle from physical shop entry through accepted exit, twelve logical shop/custody zones, Monday-Friday 9:00 AM-6:00 PM Central hours, the confirmed two-bay shared-space constraint, Walter Hernandez as primary technician, Brock/Eli operating authority, stage and aggregate timing baselines, WIP limits, a stable twenty-five-code blocker taxonomy, and versioned Inventory-to-Shop inbound/outbound envelope validators.

The existing Shop & Recon projection now exposes the foundation as contract `shop-recon/foundation/1.0.0` under projection `shop-recon/r9.0.0`. It derives every open order into exactly one of the sixteen stages from authoritative repair evidence, evaluates hard transition gates and controlled rework loops, counts only staffed Monday-Friday 9:00 AM-6:00 PM Central minutes, computes target bands and explainable priority, and flags WIP breaches for dispatch, bay and QC queues. The live `/vehicles/shop-recon` page displays one continuously moving card per vehicle with its stage, logical zone, timing and priority evidence. Inventory Recon cards use a labeled dark-navy header; Customer Vehicle cards use a labeled vivid-blue header. Lane-specific promise, authorization, escalation and completion signals remain separate from amber/red urgency indicators.

The sixteen-stage layer deliberately does not add a duplicate persisted status. Existing governed Shop planning, authorization, dispatch, labor, QC and release commands remain the mutation authority and their evidence drives the projection. This checkpoint adds no automatic dispatch, integration writeback, physical vehicle movement, repair authority, customer communication, purchasing decision, QC pass or Inventory lifecycle transition. Physical parking capacities, break policy, Saturday custody/key handling, QC independence, road-test eligibility controls and other unnamed authorities remain unresolved and therefore are not inferred.

The next visual-design checkpoint is available at `/vehicles/shop-recon/[repairOrderId]`. Clicking a Shop & Recon board card now opens a unified vehicle-card workspace modeled on the Inventory Lifecycle workbench. It includes the persistent vehicle identity, separate overall and Shop lifecycle context, a green-dot sixteen-stage preview selector, a top-right Viewing Stage display that follows the selected preview stage, and a read-only checklist, form, evidence and authority design for every stage. Preview selection does not change the vehicle's authoritative operational stage, and save/advance controls remain disabled pending explicit behavioral approval.

## 2026-07-27 — Enterprise Sales Console planning baseline

The documentation-only Enterprise Sales Console planning package is established under [`docs/sales-console/README.md`](sales-console/README.md). It defines Sales as the commercial decision and execution layer over authoritative Customers, Inventory, Appointments, Tasks, and Documents records. The package includes the target modular-monolith architecture, sales-owned domain boundaries, dealership selling operating model, 18 lead-to-delivery and exception workflows, 15 deterministic decision algorithms, a 12-phase roadmap, 27 gated vertical milestones, and an outcome-to-proof traceability matrix.

The design requires one owner and dated next action for every active opportunity, evidence-backed stages, immutable presented scenario and quote versions, explicit pricing authority, explainable and overridable recommendations, distinguishable seller/manager/system forecasts, customer promise tracking, integration reconciliation, feature controls, and deterministic operation when optional AI is unavailable.

This checkpoint adds no application route, schema, API, workflow behavior, integration, customer communication, automated ranking, pricing decision, finance decision, production configuration, or rollout approval. Algorithm weights, SLA thresholds, lifecycle policy, pricing authority, source ownership, consent/contact policy, acceptance scenarios, pilot cohort, and rollback criteria remain dealership decisions under SAL-000. The first possible implementation slice remains gated on that authority package.

## 2026-07-26 — Shared role-aware landing and workspace resolver

The shared role-aware landing foundation is implemented on `codex/role-aware-landing-completion`. Authenticated users now resolve deterministically into Management, Service, Inventory, Advisor, Technician, Parts, Quality, Sales, Marketing, Office, Collections, or safe General Staff workspaces using current roles and governed duties. Login honors only local return targets that belong to one of the user's permitted workspaces.

Multi-role users receive an explicit workspace switcher. The selected workspace is retained in an HTTP-only same-site preference cookie, revalidated against the current identity on every server render, and carried through shared routes such as `/my-tasks`. Role-specific console navigation is implemented for every defined workspace family. Non-management users who open Command Control Center or the full Dispatch Board are returned to their role landing.

This is shared routing and presentation authority, not a claim that every destination page has completed a role-specific vertical slice. Domain services and pages remain responsible for server-side record and mutation authorization. See [`docs/inventory/ROLE_EXPERIENCE_MATRIX.md`](inventory/ROLE_EXPERIENCE_MATRIX.md) and [`docs/inventory/ROLE_LANDING_AND_RECORD_ROUTING_ALGORITHMS.md`](inventory/ROLE_LANDING_AND_RECORD_ROUTING_ALGORITHMS.md).

## 2026-07-24 — Time & Attendance TA-G5 hardening and pilot gate started

TA-G5 now has its first vertical repository implementation slice on `codex/time-attendance-g5-hardening-pilot`. The CCC Time & Attendance console includes a manager-only hardening and pilot evidence panel. The server readiness contract is exposed through `/api/time-attendance/hardening-pilot` and evaluates TA-050 through TA-055 without claiming pilot or production eligibility.

TA-050 security/privacy, TA-051 reliability/concurrency, TA-053 accessibility/responsive, and TA-055 training/support/rollback are represented as evidence-required gates. TA-052 backup/restore/retention and TA-054 parallel payroll pilot remain blocked because the migrated-runtime restore drill and representative parallel pay-period reconciliation have not occurred. The gate explicitly keeps production ineligible until legal/payroll approval, runtime migration evidence, capability rollout policy, payroll mapping, pilot evidence, training, and rollback proof are accepted.

This checkpoint adds a source-controlled evidence gate, not an operational pilot approval. No production rollout, live migration application, payroll-provider activation, accessibility audit, restore drill, or parallel payroll pilot was performed.

## 2026-07-24 — Time & Attendance TA-G4 payroll handoff started

TA-G4 now has its first vertical repository implementation slice across TA-040 through TA-044 on `codex/time-attendance-g4-payroll-handoff`. The CCC Time & Attendance console includes a payroll handoff panel that checks pay-period readiness, exposes lock/export/status/reproduction controls, and keeps payroll close separate from live punch capture.

TA-040 readiness projection checks approved card state, open sessions, blocking exceptions, pending corrections, missing manager approvals, pending time-off/ESST review, and existing locked/exported batches. TA-041 can lock a ready pay period into a `LOCKED` export batch and mark source cards locked with reasoned manager authority; reopen voids the batch with reasoned evidence instead of silently changing prior history. TA-042 creates versioned export-preview lines for regular, overtime, and ESST minutes with control totals and checksums. TA-043 records payroll acknowledgment, rejection, or reconciliation decisions. TA-044 reproduces historical batches from stored export snapshots, lines, and checksums.

This checkpoint does not apply migrations, activate a payroll provider, send payroll files, approve payroll-code mappings, complete separation-of-duties policy, or claim production release. Production readiness remains gated by TA-004 legal/payroll configuration approval, TA-015 migrated-runtime/seed/restore evidence, TA-016 capability rollout policy, payroll mapping approval, and pilot acceptance.

## 2026-07-24 — Time & Attendance TA-035 time-off request workflow started

TA-035 now has its first vertical implementation slice. Staff can submit PTO, Minnesota ESST, and unpaid time-off requests from the CCC Time & Attendance console through `/api/time-attendance/time-off`. Requests are idempotent, source-attributed, balance-snapshotted when a balance record exists, and do not change payroll by themselves.

Minnesota ESST requests use protected routing: the private reason is hashed/restricted, the ordinary manager queue receives a redacted operational card, and the request enters leave-admin review rather than exposing private reason details in the general manager review surface. The exception-first manager queue now includes submitted ordinary time-off requests and protected ESST leave-admin review items.

Remaining TA-035 hardening before production release includes configured accrual/balance policy approval, leave-admin ownership, payroll code mapping, holiday/company-closure handling, production notification routing, and migrated-runtime acceptance evidence.

## 2026-07-24 — Time & Attendance TA-034 manager correction decision workflow started

TA-034 now has its first vertical implementation slice. Managers can record reasoned correction-request decisions through `/api/time-attendance/manager-corrections` and the CCC Time & Attendance manager review panel. Supported decisions are approve, return for more information, deny, and apply an already-approved correction. Decisions are manager-only, idempotency-aware, and captured into the correction request evidence history.

Applying a correction in this MVP does not rewrite original punch events. The action marks the approved correction request as applied for review/payroll handling, preserves the original punch trail, and records that payroll recalculation/reprojection is required before payroll handoff.

Remaining TA-034 hardening before production release includes persisted card drill-in, exact event-level correction application/reprojection, post-attestation reopen behavior, separation-of-duties policy, and payroll close approval gates.

## 2026-07-24 — Time & Attendance TA-033 manager exception queue started

TA-033 now has its first vertical implementation slice. Managers can read a protected exception-first review queue through `/api/time-attendance/manager-review`, while non-managers receive a locked queue with no manager-sensitive details. The queue surfaces correction requests, open card exceptions, and disputed attestations, then orders them by severity and age.

The `/time-attendance` page now includes a manager review panel with queue metrics and read-only review items. This checkpoint intentionally does not approve, deny, correct, waive, or alter payable time; manager decision and correction authority remain TA-034.

## 2026-07-24 — Time & Attendance TA-032 employee attestation started

TA-032 now has its first vertical implementation slice. A protected `/api/time-attendance/attestations` endpoint records employee attestations or disputes against a specific `TimeCard` version and checksum. Attestation evidence stores the decision, idempotency context, dispute explanation when present, request hash, and an explicit `rightsWaiver: false` marker.

The `/time-attendance` page now shows an employee attestation panel with confirm/dispute choices and no-rights-waiver language. Because the visible card is still preview/read-model-backed, the UI keeps attestation submission disabled until a persisted time-card version is available. Live persisted card projection, attestation history display, and post-attestation reopen behavior remain later work.

## 2026-07-24 — Time & Attendance TA-031 correction request workflow started

TA-031 now has its first vertical implementation slice. Employees can submit a time-card correction request from `/time-attendance` without changing the original punch trail. The request is durable, idempotent, status-tracked, and includes requested date/time context, change type, employee explanation, and evidence that the source punches remain append-only.

The new protected `/api/time-attendance/corrections` endpoint creates correction requests for the authenticated staff member and rejects reused idempotency keys when the submitted content differs. Manager decision, manager correction application, full correction history display, attestation reopening, and payroll impact are intentionally deferred to later TA-G3 slices.

## 2026-07-24 — Time & Attendance TA-030 staff capture surface started

TA-030 now has its first vertical implementation slice. The `/time-attendance` CCC console reads the authenticated staff member's current attendance state and presents valid clock/meal actions: clock in, start meal, end meal, and clock out. Actions call the existing protected capture command boundary with expected version, idempotency key, exact occurrence timestamp, location, timezone, and reason. The API now also exposes current capture state for staff refresh after each action.

This checkpoint does not claim production rollout, kiosk/device policy, offline/mobile capture, correction workflow, attestation, payroll close, or legal/payroll release approval. Team cards and payroll readiness remain preview/read-model work until later slices.

## 2026-07-24 — Time & Attendance TA-G3 implementation branch opened

The Time & Attendance workflow implementation branch is `codex/time-attendance-g3-workflows`. Its first scheduled phase is documented in [`docs/time-attendance/PHASE_TA_G3_IMPLEMENTATION_SCHEDULE.md`](time-attendance/PHASE_TA_G3_IMPLEMENTATION_SCHEDULE.md), covering TA-030 through TA-035 in order: employee capture, card review/correction, attestation, manager exception console, manager correction/approval, and time-off request workflow.

This checkpoint schedules repository implementation only. It does not commit, push, merge, activate production rollout, apply live migrations, or claim legal/payroll release approval.

## 2026-07-24 — Time & Attendance CCC console first UI

The approved Time & Attendance mockup is now adopted as the official UI source of truth in [`docs/time-attendance/UI_SOURCE_OF_TRUTH.md`](time-attendance/UI_SOURCE_OF_TRUTH.md). The console is placed on the CCC board as an active `/time-attendance` module, not inside the Dispatch console.

The first page implements the approved enterprise MVP shell: hero, workspace tabs, KPI strip, employee time-card preview, exact punch timeline, staff-specific meal policy cards, manager review queue, team status, and exception review rail. Preview totals are wired through the existing time-card calculation foundation where practical, while the page explicitly labels live punch actions, database-backed team cards, and payroll export approvals as pending follow-up work.

## 2026-07-23 — Task progress assurance foundation

Tasks now receive an automatic two-hour progress checkpoint when they first move to In Progress; no new pre-start requirements are enforced. Meaningful status, guided-field, or progress-note updates renew the checkpoint, and the task workspace distinguishes on-track, check-in-due, and stalled work. Blocked work in the full workspace captures a recovery action, responsible person, review time, and escalation deadline, while older quick-update surfaces remain compatible through a server-generated recovery plan. Existing checklist, required-update, dependency, acceptance, manager-review, and completion-override gates remain the authority for closure. The assurance state is durable in the Task record and has focused service/UI coverage; this slice does not yet claim scheduled notifications or a manager-wide stalled-work queue.

## 2026-07-19 — Inventory Start Workflow approved launcher UI

The `/vehicles/workflows` landing route now implements the approved Inventory Start Workflow launcher source of truth. It provides the compact enterprise header, universal Inventory workflow search, Cards/List presentation, Recommended, Recent, Favorites, All Workflows, My Drafts, and Needs Attention collections, role-and-availability context, six curated recommended workflows, progressive workflow details, and the secondary recommendation guide. The launcher continues to use the existing server-derived 13-workflow catalog, visibility policy, availability state, validation, confirmation, approval, recovery, and purpose-built intake destinations rather than duplicating those rules in the interface.

Recent and Favorites are intentionally session-local convenience state, and My Drafts is an honest empty state because durable workflow-draft persistence is not yet implemented. The future `All CCC` scope is visible but disabled until the enterprise cross-console workflow registry is delivered; it does not imply that other-console workflows have been activated. Repository implementation does not alter provider, rollout, migration, pilot, deployment, or production-activation status.

## 2026-07-19 — CCC Enterprise Workflow Launcher planning baseline

The official documentation-only source of truth for the CCC Enterprise Workflow Launcher now lives in [`CCC_ENTERPRISE_WORKFLOW_LAUNCHER_SOURCE_OF_TRUTH.md`](CCC_ENTERPRISE_WORKFLOW_LAUNCHER_SOURCE_OF_TRUTH.md). It defines the active-console-first Cards/List experience, universal search, registry and runtime architecture, authority and recovery boundaries, a cross-console workflow-family catalog, and gated implementation milestones. The Inventory Start Workflow mockup embedded there was approved as the binding visual and interaction baseline on 2026-07-19. This planning record does not activate workflows or strengthen the implementation state of any listed capability; the evidence-based states below remain authoritative.

## 2026-07-19 — Console navigation performance tune-up

The shared authenticated shell now renders an immediate route-level loading state during console transitions and deduplicates repeated authenticated-user reads within a server render. Independent server reads are parallelized on the high-traffic Dispatch Overview, Tasks, My Tasks, Projects, Manager Review, Appointments, and Inventory Home routes, preserving existing permission, fallback, and unavailable-state behavior while removing avoidable request waterfalls.

A deeper client-loading slice now places the two largest interactive workspaces, Appointments and Tasks, behind lightweight route loaders. Their authenticated server reads and permissions still complete before the workspace receives its props, but navigation can paint a stable console-shaped loading surface before parsing and hydrating the large client implementation. In the optimized build, each route's incremental initial loader is about 4.1 KB; approximately 357 KB of Appointments JavaScript and 249 KB of Tasks JavaScript are moved off the route's initial entry and loaded as deferred workspace chunks. This is a load-order improvement rather than a claim that the underlying feature bundles have been made smaller. The production build, TypeScript validation, lint, and 42 focused Appointments/Tasks tests pass.

The Inventory Console top bar also provides a direct Dispatch switch beside CCC Home. Inventory-local operating destinations remain in the Inventory sidebar, while the two cross-console destinations stay in the shared top-bar area.

The Start Workflow route now fails independently from its optional Inventory execution recommendation. A stale generated Prisma client or an unapplied Inventory Work Packet schema returns an explicit unavailable advisory while the purpose-built workflow launcher continues to render. Development and production builds regenerate the Prisma client before Next.js starts. The development Prisma singleton is always reused across hot reloads so compatibility checks cannot leak database connections; optional Inventory execution services perform their own delegate checks and degrade locally instead of replacing the shared client or failing the console.

## 2026-07-19 — Inventory Execution Operating System MVP

The Inventory Execution Operating System MVP is repository-implemented on `codex/inventory-eos-mvp-implementation`. It adds a versioned Inventory Work Packet over the existing Task backbone; the official lifecycle Vehicle Card; a vehicle-centered execution Workbench; governed time sessions; rapid structured technician closeout; blocker, completion, and accepted-handoff controls; manager next-plan publication; deterministic readiness and next-best-work guidance; and an integrated receipt-to-recon launcher. The implementation reuses Vehicle 360, Repair Orders, Parts, Shop, evidence, authority, audit, and outbox foundations instead of creating parallel systems of record.

Repository verification passed the full stable unit/integration suite (236 files, 1,321 tests), 38 focused EOS tests, TypeScript validation, zero-warning lint, Prisma schema validation, the production build, the Inventory Console program validator, and the 121-slice conformance audit. The browser suite could not execute product assertions because the repository migration history cannot bootstrap its isolated E2E database: a fresh schema fails at pre-existing migration `20260713000000_add_customer_sla_control` when it references an Organization row that migrations have not created, while the older E2E schema also retains a failed `20260714170000_add_enterprise_discovery_knowledge_output` migration. The four new EOS migrations are source-controlled only and were not reached or applied. Deployment, provider activation, production automation, workplace accessibility evidence, and pilot acceptance remain explicitly unclaimed. See [`docs/inventory/INVENTORY_EOS_MVP_IMPLEMENTATION_PROGRAM.md`](inventory/INVENTORY_EOS_MVP_IMPLEMENTATION_PROGRAM.md).

## 2026-07-19 — Inventory Console Add Vehicle workflow

The approved Add Vehicle vertical slice is repository-implemented at `/vehicles/workflows/add-vehicle` and linked from Start Workflow. It provides duplicate-first VIN validation, a documented non-VIN exception, required relationship/reason/brief-description context, manual authoritative year/make/model confirmation, location selection, local draft convenience, an explainable deterministic next-workflow recommendation, explicit consequence preview, and a governed idempotent canonical Vehicle create command. The customer-service route prepares walk-in Service Intake context without silently creating a RepairOrder.

The implementation deliberately does not claim camera OCR, external VIN decoding, automatic customer association, production activation, or automatic creation of an InventoryUnit, stock number, acquisition cost, purchase commitment, RepairOrder, or ownership relationship. Vehicle registry mutation remains capability and rollout gated. The official visual and operating contract is [`docs/inventory/INVENTORY_START_WORKFLOW_ADD_VEHICLE_UI_SOURCE_OF_TRUTH.md`](inventory/INVENTORY_START_WORKFLOW_ADD_VEHICLE_UI_SOURCE_OF_TRUTH.md).

## 2026-07-18 — Inventory Console gap closure Wave 2 lifecycle projections

IC-031, IC-032, and IC-034 through IC-037 are now repository-complete. The Lifecycle Control Tower composes authoritative event-history distributions, Inventory Recon and Parts readiness, versioned decisions and recommendations, capital components, selected-asset operational joins, and integration/projection health with manual and recovery paths. Customer repair remains excluded from inventory-recon totals, recommendations remain non-executing, and owning workspaces retain mutation authority. The automated ledger now reports 52 complete and 48 partial slices. See [`docs/inventory/INVENTORY_CONSOLE_GAP_CLOSURE_WAVE_2_LIFECYCLE_PROJECTIONS.md`](inventory/INVENTORY_CONSOLE_GAP_CLOSURE_WAVE_2_LIFECYCLE_PROJECTIONS.md).

Wave 1 was included by fast-forward because this branch was initially created from the pre-Wave-1 `main` baseline. No provider, migration application, rollout, pilot, deployment, commit, push, or merge to `main` was performed by Wave 2.

## 2026-07-18 — Inventory Console gap closure Wave 1 shared foundations

IC-023 and IC-025 are now repository-complete. Inventory Console Home has Console-owned personal/team saved views with safe filter recovery and permission re-evaluation, plus authoritative Shop, Parts, 24-hour throughput, and provider-neutral integration-health facts. Universal discovery now includes owner-scoped governed work items, and Home exposes My Work, Team, and Exceptions views; IC-022 and IC-026 remain partial for return-context and cross-domain priority composition. The automated 121-slice ledger now reports 46 complete and 54 partial slices, with all external-evidence and decision gates unchanged. See [`docs/inventory/INVENTORY_CONSOLE_GAP_CLOSURE_WAVE_1_SHARED_FOUNDATIONS.md`](inventory/INVENTORY_CONSOLE_GAP_CLOSURE_WAVE_1_SHARED_FOUNDATIONS.md).

The saved-view migration is source-controlled only. No migration was applied, no provider was contacted, and no rollout, pilot, commit, push, or merge was performed.

## 2026-07-18 — Inventory Console R2 shell and Home

Inventory Console R2/M2 (`IC-020` through `IC-028`) is implemented for the bounded repository exit. `/vehicles` is now the enterprise Home with exactly seven primary destinations, authoritative InventoryUnit scope/KPIs/stages/priority work, permission-scoped decision routing, versioned system URL views, search and Event Log access, and explicit live/stale/unavailable states. The older detailed Control Tower moved to `/vehicles/control-tower`; `/vehicles/workflows` provides the phase-one role/context-aware catalog; and `/vehicles/disposition-wholesale` is an honest rollout-disabled destination rather than a broken link or false activation.

Typecheck, lint, 36 focused tests, and the Next.js production build pass. Shop, Parts, throughput, wholesale execution, and external adapter facts remain unavailable or disabled on Home and never fall back to representative mockup values. No schema, deployment, external call, pilot, or production activation occurred. See [`docs/inventory/R2_SHELL_HOME_IMPLEMENTATION.md`](inventory/R2_SHELL_HOME_IMPLEMENTATION.md).

## 2026-07-18 — Inventory Console R1 foundation conformance

Inventory Console R1/M1 (`IC-010` through `IC-017`) is implemented for the bounded repository-development exit authorized by `R0-AUTH-001`. A deterministic conformance harness and fixed synthetic fixture verify canonical Vehicle/InventoryUnit identity and cycles, customer-repair separation, Parts quantity/custody, location/role/field/amount/four-eyes authority, idempotency and optimistic versions, correlated audit/event/outbox evidence, work deduplication and approvals, evidence security/retention/legal hold, effective policy and OFF/SHADOW rollout, ordered replayable projections, and migration/restore/replay/reconciliation gates across InventoryUnit, RepairOrder, Parts, and approval subjects.

Verification passed Prisma schema validation, repository lint, TypeScript typecheck, and 18 focused test files/71 tests. No schema was changed or deployed, no production-like recovery drill or real integration was run, and no rollout, pilot, or production activation occurred. See [`docs/inventory/R1_FOUNDATION_IMPLEMENTATION.md`](inventory/R1_FOUNDATION_IMPLEMENTATION.md).

## 2026-07-16 — Shop and Recon Optimization approval-decisions workspace

The documentation-only decision workspace is prepared under [`docs/shop-repair-optimization/approval-decisions/README.md`](shop-repair-optimization/approval-decisions/README.md). It provides the actual SRO AE-0 session record, exact authority-confirmation packet, and eight-workshop decision gate for `SRO-APR-001` through `079`, while reusing the single governing ledger, signature journal, missing-input register, tabletop suite and master authorization records from the approval-execution package.

AE-0 is entered as `ENTER_APPROVAL_EXECUTION` for Time Motor Sales / Minneapolis / `SRO-1.0` / America/Chicago / `SRO-APR-001`–`079`, effective 2026-07-16 with exact time not captured. The user asserted authority through Codex; chat identity was not independently verified. Workshops 1–7 are passed for policy. Enterprise SRO totals are 69 closed—12 `APPROVED` and 57 `APPROVED_WITH_CHANGE`—and 10 open. Workshop 8 is in decision review. All independent/qualified-review, financial, privacy/security/provider, consent/prediction/outreach and unavailable-scope restrictions remain in force. Design, code, shadow, pilot and activation remain `NOT AUTHORIZED`.

## 2026-07-16 — Shop and Recon Optimization approval-execution workspace

The documentation-only approval-execution program for all eight Shop and Recon workshops is established under [`docs/shop-repair-optimization/approval-execution/README.md`](shop-repair-optimization/approval-execution/README.md). It contains an AE-0 authority/session gate, a consolidated ledger covering all 79 `SRO-APR-*` decisions exactly once, eight workshop execution gates, an immutable decision-journal contract, grouped missing-input controls, 27 enterprise tabletop cases, execution totals and separate policy, design, code, shadow, pilot and production-activation resolutions.

This checkpoint adds no application behavior and records no dealership approval. AE-0 is not entered; all 79 decisions remain `OPEN`; exact Shop, Dispatch, Advisor, Parts, QC, Finance, Privacy, Algorithm, Integration, Customer and qualified-review authority/configuration is still required. The complete Shop/Recon program remains `NO-GO FOR DESIGN/CODE/SHADOW/PILOT/ACTIVATION`.

## 2026-07-16 — Inventory-to-Frontline Slice 2 non-code workflow package

The documentation implementation for Slice 2 — observed arrival through custody verification, receipt completion and accepted Inspection/Triage handoff — is established in the [`approval-decisions workspace`](inventory/frontline-workflow/approval-decisions/README.md). It includes a guided twelve-step staff workflow, single-workbench staff playbook, evidence and exception controls, versioned receipt-completion gate, Inspection handoff contract, ten-decision execution gate, exact open-input register, fourteen-case tabletop packet and separate implementation-authorization resolution.

This checkpoint adds no application behavior. Slice 2 approval execution processed all ten direct policies separately: `ITF-APR-080` and `088` are `APPROVED`, `085` is `DEFERRED_SAFE`, and `081`–`084`, `086`, `087` and `089` remain `OPEN_REQUIRED_INPUT`. Exact receiving people, locations, hours, evidence, placement, discrepancy and Inspection-consumer configuration is still required. Applicable predecessor/global decisions also remain unresolved. Internal driving, unqualified movement/hazard actions and authoritative live-provider integration remain safely excluded. Slice 2 is `NOT AUTHORIZED` for technical design, code, tabletop acceptance, shadow use, pilot or activation. Across the enterprise register, 25 decisions are closed and 105 remain open.

## 2026-07-16 — Inventory-to-Frontline approval-decisions execution workspace

The documentation-only approval decision workspace is prepared under [`docs/inventory/frontline-workflow/approval-decisions/README.md`](inventory/frontline-workflow/approval-decisions/README.md). It provides the AE-0 authority/session record, an immutable-signature journal contract, a 50-decision Slice 1 execution gate, and a separate Slice 1 implementation-authorization resolution with explicit design, implementation, shadow, pilot and activation states.

The user confirmed AE-0 entry as `ENTER_WITH_SAFE_DEFERRALS` for the `ITF-1.0` Minneapolis Slice 1 approval process, with Eli Aswan as the named ultimate General/Operations authority and Brock Harris as Inventory/transport/receiving owner. Internal driving, authoritative live provider integration, independent self-review and unqualified legal determinations remain excluded. Slice 1 approval execution processed all 50 prerequisites: 19 exact invariant policies are `APPROVED`, 3 capabilities are `DEFERRED_SAFE`, and 28 decisions remain `OPEN_REQUIRED_INPUT` because company-specific locations, limits, timing, evidence, source or pilot values were not supplied. At that Slice 1 checkpoint, 22 enterprise decisions were closed and 108 remained open. Slice 1 remains `NOT AUTHORIZED` for design, implementation, shadow, pilot and activation.

## 2026-07-16 — Inventory-to-Frontline enterprise approval-execution baseline

The complete documentation-only approval program is prepared under [`docs/inventory/frontline-workflow/approval-execution/README.md`](inventory/frontline-workflow/approval-execution/README.md). It provides separate AE-0 through AE-9 milestone packets, one consolidated ledger containing all 130 existing `ITF-APR-*` decisions exactly once, an execution approval register, gap/dependency and nine-slice readiness records, cross-slice consistency review, a 26-case enterprise tabletop suite, pilot-readiness assessment, master approval resolution, traceability matrix, and nine separate future implementation handoffs.

This checkpoint did not add application behavior. After the later Slice 1 checkpoint, 108 decisions remained `OPEN`; subsequent Slice 2 partial execution is recorded above. Every lifecycle slice remains `NO-GO FOR DESIGN/CODE/PILOT/ACTIVATION`, and the master resolution remains `READY FOR SIGNATURE — NOT APPROVED`. The package explicitly separates policy approval, design authorization, implementation authorization, shadow authorization, pilot authorization and activation authorization. The first possible future implementation boundary remains authoritative acquisition through an accepted Receipt/Custody handoff, subject to the applicable signed decisions and separate implementation authority.

## 2026-07-16 — Shop and Repair Optimization planning baseline

The planning-complete Shop and Repair Optimization package is established under [`docs/shop-repair-optimization/README.md`](shop-repair-optimization/README.md). It governs customer-pay, inventory-recon, and internal/fleet shop lanes across six workstreams: shop flow/WIP, capacity/dispatch, parts/repair execution, pricing/margin, technician/advisor assistance, and customer intelligence/retention. The package contains 37 algorithm definitions, 17 recurring staff decisions, 50 acceptance scenarios, 79 approval decisions, eight consecutive approval workshops, source-authority and confidence rules, safety/financial/privacy/fairness guardrails, a simplified staff experience, balanced measurement, and a nine-stage implementation sequence from instrumentation through controlled expansion.

This checkpoint is documentation only. All `SRO-APR-001` through `SRO-APR-079` decisions remain `OPEN`; no algorithm, pricing matrix, AI assistant, customer message, automatic assignment, purchase, QC decision, vehicle release, or predictive outreach is activated. Existing Vehicle Operations shop, dispatch, parts, QC, advisor, comeback, and production foundations remain implementation facts and are reused rather than reclassified as delivery of this new optimization program. The recommended first future code boundary is instrumentation plus job-start readiness/WIP decision support, followed by capacity-aware human-confirmed dispatch only after the applicable workshop approvals.

## 2026-07-15 — Inventory-to-Frontline workflow planning baseline

The catalog-complete planning package for a governed Inventory-to-Frontline workflow is established under [`docs/inventory/frontline-workflow/README.md`](inventory/frontline-workflow/README.md). It defines the workflow lifecycle, fully modeled Acquisition/Transportation, Receipt/Custody, Inspection/Triage, Recon Planning/Approval, Parts/Repair Execution, Quality/Safety Verification, Title/Document Readiness, Merchandising/Pricing, and Frontline Release Review decision/scenario catalogs, roles and operating controls, the adaptive staff experience, acceptance and pilot evidence, an explicit dealership approval register, and a completed cross-catalog consistency/approval review.

The cross-catalog review outcome is `GO FOR APPROVAL WORKSHOPS` and `NO-GO FOR CODE`. All 410 catalog scenarios map to 220 acceptance cases, but 130 dealership decisions remain open. Machine-enforceable handoff contracts, approved policy/configuration, title-jurisdiction authority, source/provider mappings, and versioned frontline release/suspension persistence remain required design inputs after the applicable approvals.

Approval Workshop 1 is prepared as a decision-ready program/scope/pilot charter with recommendations for the known Time Motor Sales - Minneapolis context, a narrow manual cohort, shadow/manual thresholds, and pause/rollback controls. Its 18 decisions remain `OPEN`; the packet is not dealership sign-off and does not authorize implementation or activation.

This checkpoint is documentation only. It does not activate workflow triggers, create staff work, approve dealership roles or policy thresholds, add application/database/API/UI behavior, establish legal requirements, approve public content/customer pricing, publish listings, change frontline status, or authorize a production pilot. The first future code slice remains gated on the Approval Register and ends at an attributable Receipt and Custody handoff; a second completes Receipt and Custody; a third accepts Inspection/Triage evidence; a fourth builds and authorizes the recon plan and creates traceable jobs; a fifth coordinates parts and repair execution through an attributable QC handoff; a sixth independently verifies repair quality/safety, controls rework, and hands an operationally released unit to the correct downstream inventory owner; a seventh controls approved title/document requirements and external dependencies through a downstream handoff; an eighth governs media/content, human price approval, publication reconciliation, and Frontline Release Review handoff; and a ninth governs complete readiness review, authorization, frontline projection, placement/availability reconciliation, and suspension/reinstatement. Reservation, sale, delivery, and broader post-sale workflows remain outside this planning package.

## 2026-07-14 — Time Motor Sales responsive CCC identity

The approved Time Motor Sales logo system is implemented through the shared application shell and governed by [`docs/TIME_MOTOR_SALES_LOGO_SOURCE_OF_TRUTH.md`](TIME_MOTOR_SALES_LOGO_SOURCE_OF_TRUTH.md). The reversed horizontal logo appears in the global CCC command bar and CCC Home hero, the compact TMS mark appears at constrained widths and in CCC/console sidebars, authentication uses the standard horizontal logo, and browser/mobile metadata uses approved compact assets. Because operational consoles inherit `AppShell`, present and future console pages receive the corporate identity without duplicating page-level logo markup.

The former red `T` placeholder is retired. The approved concept image is preserved under `docs/ui-mockups/`, and transparent production assets live under `public/brand/`. Current assets are high-resolution PNGs; mathematically clean SVG and vector-PDF masters remain a future production-format refinement that may not redesign the approved identity.

## 2026-07-14 — Enterprise optimization Phase 1 vocabulary and registry

Phase 1 establishes the non-behavioral semantic layer under `src/server/enterprise-optimization/`: canonical enterprise concepts, stable CCC console identities, deterministic cross-console record references, shared reason-code and event-type registries, and explicit source-authority mappings. Dispatch, Tasks, Appointments, Customers, Projects, Vehicles, Inventory, enterprise event/audit foundations, Insights, Administration, and every planned CCC console now have truthful semantic boundaries documented in [`docs/enterprise-optimization/README.md`](enterprise-optimization/README.md).

The registry does not change current application behavior and does not implement priority scoring, capacity calculation, assignment, escalation, automation, or AI. Projects remains explicitly classified as a derived Task projection; planned Time and Attendance, People and HR, Compliance, Legal and Accounting, and Library and Training consoles do not claim sources of truth that do not yet exist. Focused registry tests, typecheck, and lint pass for this checkpoint.

## 2026-07-14 — Enterprise optimization architecture foundation

The enterprise optimization documentation package is established under [`docs/enterprise-optimization/README.md`](enterprise-optimization/README.md), governed by the [`Enterprise Optimization Constitution`](ENTERPRISE_OPTIMIZATION_CONSTITUTION.md). It defines the shared work model; priority and classes of service; capacity and resource allocation; dependency and flow optimization; risk, exception, and escalation handling; measurement and continuous improvement; automation and AI governance; simulation and validation; and a phased implementation roadmap.

This checkpoint is documentation and governance only. It does not add or activate application code, database structures, APIs, user-interface behavior, scoring weights, automated assignments, or AI decision-making. Existing Inventory optimization specifications remain domain specializations and inherit the enterprise Constitution. Any production algorithm must pass the documented policy-approval, data-quality, simulation, shadow-mode, human-authority, explainability, and rollback gates before activation.

## 2026-07-14 — Command Control Center shell foundation

The approved Time Motor Sales Command Control Center shell is implemented as the shared application frame. Dispatch Board is the only live module in the primary shell; Time & Attendance, People & HR, Compliance, Legal & Accounting, Library & Training, and Insights are visibly locked as Planned. The shell now provides CCC branding, Dispatch-local Overview/Live Board/Team/Activity navigation, a persistent command bar, and an updated Dispatch Overview frame while preserving the existing board-generation, scheduler-health, task-intake, metrics, team-load, projects, customer/vehicle context, manager-attention, task-table, and activity behavior. Focused navigation/UI contract tests, typecheck, lint, and desktop/mobile browser inspection cover this checkpoint. The planned CCC modules are not implemented.

Live Board is now a dedicated Dispatch sub-view at `/board?view=live` rather than an asynchronous page anchor. Its local tab and CCC breadcrumb stay synchronized. Each built console retains its complete console-owned navigation. Dispatch restores Overview, Live Board, My Tasks, Tasks, Projects, Appointments, Vehicles, Customers, Sales with nested Marketing and Advertising department views, permission-aware Manager Review, Team, and Activity. CCC Home and the scoped Dispatch return remain in the top navigation strip.

The navigation shell separates enterprise, console, and workspace scope. Authenticated CCC Home at `/command-center` owns the global module sidebar and enterprise console launcher. Inside operational consoles, the global sidebar is replaced by the complete navigation owned by that built console. Dispatch workspaces remain mutually reachable from the Dispatch sidebar; Inventory and Administration retain their full local menus. The persistent top strip remains limited to CCC Home, Dispatch Board, and the active workspace. Dispatch Overview remains an internal Dispatch destination and is not treated as enterprise home.

## 2026-07-14 — M10: reporting and enterprise scale

VEH-130–VEH-139 are implemented as governed reporting, recommendation, and scale-evidence foundations. Daily metric facts, scorecards, bottleneck/cohort analysis, forecast evaluation, advisory recommendation pilots, responsible summaries, multi-location transfer checks, policy inheritance, and enterprise recovery gates are now available as deterministic services with tests. Production warehouse execution, model deployment, and load/failover drills remain operational activation work.

## 2026-07-14 — M9: integration platform

VEH-120–VEH-129 are implemented as provider-neutral integration foundations: external-system inventory, source authority matrix, adapter contract harness, conflict detection/reconciliation, explicit provider boundaries, and a governed partner API contract. Real provider credentials, durable partner stores, delivery workers, and production acknowledgements remain activation work.
## 2026-07-14 — M8: administration and resilience

M8 (VEH-111–VEH-118) is implemented as enterprise-hardening foundations. The console now provides separation-of-duties and dollar-limit evaluation, manager-scoped retention/legal-hold and background-operation projections, bounded audit exploration, disaster-recovery, security, accessibility/performance gates, and an explicit pilot enable/pause/rollback/resume state machine. These controls produce reviewable evidence; they do not claim that a provider backup, scanner, or production pilot has run.

## 2026-07-14 — VEH-041/042: live inventory control tower

The inventory control tower now has a tenant-scoped live projection and authenticated `GET /api/inventory-control-tower` API. It reconciles open inventory units, lifecycle stages, locations, overdue/blocked/waiting counts, cost exposure, and item-level exceptions. `/vehicles` consumes the projection, reports freshness, supports retry, and removes unsupported prototype shop/parts capacity values when the live response arrives.

## 2026-07-14 — Wave 5: retail inventory acquisition, readiness, and sale lifecycle

VEH-031–VEH-040 are implemented in the repository. Inventory units now have versioned acquisition appraisals, purchase-authority limits, transport/receipt evidence, recon handoffs, title/document readiness, merchandising packages, frontline gates, controlled reservation/sale/delivery/reversal transitions, cost exposure projections, and lifecycle velocity policy evaluation. The migration is source-controlled and the existing retail-inventory rollout gate remains the activation control. Validation passed with typecheck, lint, and the full test suite.

## 2026-07-14 — Wave 4: customer lifecycle, warranty, commercial handoffs, and policy administration

Milestones 7A–8A are implemented in the repository. The console now provides canonical customer/service history, versioned service promises and transportation state, purpose-specific consent with quiet-time enforcement, exact-version customer estimate decisions, an explicitly published customer-safe timeline, warranty coverage-to-recovery records, returned invoice-total reconciliation, governed sales/F&I/title/delivery handoffs, scoped expiring customer/partner portal access, and versioned policy simulation/four-eyes approval/pilot/rollback. The operator workspace is `/vehicles/customer-lifecycle`; the public portal is token scoped and excludes internal notes and restricted evidence. The source migration is not deployed and the `CUSTOMER_LIFECYCLE` rollout flag defaults to `OFF`. See [`docs/inventory/CUSTOMER_LIFECYCLE_COMMERCIAL_POLICY_IMPLEMENTATION.md`](inventory/CUSTOMER_LIFECYCLE_COMMERCIAL_POLICY_IMPLEMENTATION.md).

## 2026-07-14 — Vehicle Operations Wave 3: discovery, knowledge, and controlled output

Vehicle Operations Milestone 6E–6G (`VEH-094` through `VEH-096`) is implemented in the working tree. `/vehicles/discovery` provides organization-scoped, capability-filtered, bounded and ranked search across vehicle/VIN/stock, customer, repair order/job, appointment, part/barcode, purchase order/vendor, and governed document metadata. Work types now have reference-only external procedure, bulletin, safety-note, and reference revisions with HTTPS/checksum/source controls, effective windows, independent approval, supersession lineage, and immutable events. Authorized users can generate JSON or printable HTML Vehicle 360 packages with classification-specific redaction, field manifests, watermark, SHA-256 integrity, seven-day expiry, immutable generation evidence, and audited downloads.

The database migration, `pg_trgm` extension qualification, `VEHICLE_DISCOVERY` rollout activation, production query-plan/load evidence, publisher checksum operating procedures, output DLP/retention validation, accessibility review, and production browser qualification remain pending. See [`docs/inventory/ENTERPRISE_DISCOVERY_KNOWLEDGE_OUTPUT_IMPLEMENTATION.md`](inventory/ENTERPRISE_DISCOVERY_KNOWLEDGE_OUTPUT_IMPLEMENTATION.md).

## 2026-07-14 — Vehicle Operations Wave 2: evidence storage and Vehicle 360

Vehicle Operations Milestone 6A–6D (`VEH-090` through `VEH-093`) is implemented in the working tree. The application now has database-backed governed vehicle evidence with server-owned SHA-256 integrity, content signature checks, quarantine, retention, legal hold, access classification, immutable evidence history, authorized audited downloads, enterprise commands, and database constraints/triggers. `/vehicles/360/[id]` projects canonical summary, correlated timeline, permission-aware operational tabs, cost/decision/audit views, and a navigable permission-filtered relationship graph from existing vehicle, customer, inventory, repair, parts, appointment, task, evidence, and audit records.

The implementation uses a bounded PostgreSQL evidence-content store and a built-in signature safety baseline. Production object storage, an approved antivirus/content-disarm provider, migration deployment, feature activation, production retention/restore exercises, browser evidence, and live pilot qualification remain pending. Warranty is present as a governed empty-state pending `VEH-105`; no warranty claim aggregate is implied. See [`docs/inventory/VEHICLE_EVIDENCE_AND_360_IMPLEMENTATION.md`](inventory/VEHICLE_EVIDENCE_AND_360_IMPLEMENTATION.md).

**Verified:** 2026-07-10
**Purpose:** Evidence-based snapshot of the repository during Enterprise Appointment and Customers planning/implementation
**Supersedes:** Stale “pre-implementation” statements in older planning documents

## Quality Baseline

The following commands passed on 2026-07-07:

```text
npm run lint
npm run typecheck
npm test
npm run db:validate
```

Vitest result:

```text
115 test files passed
667 tests passed
```

Latest focused validation after the Appointment Notification Runtime Durability Suite block:

```text
npm test -- src/tests/unit/appointment-board-shell.test.tsx
npm run typecheck
npm run build
```

Focused appointment board command-center validation passed for notification digests, manager notification inbox flows, policy urgency/retention/deep-link controls, event-to-notification fanout coverage, notification contract definitions, suppression/deduped source governance visibility, policy-update audit/runtime traces, delivery preference governance, persisted notification policy/fanout/filter/failure state continuity, runtime durability summary metrics, retained-read trimming controls, future outbound notification contracts, inbound notification command contracts, fake adapter harness checks for SMS/email/calendar/CRM/DMS boundaries, reporting snapshot packaging, analytics freshness metrics, reconciliation snapshot visibility, workflow continuity context/trail persistence, resumable cross-panel manager workflow handoff, enterprise ops queues for confirmation/recovery/automation, resource/location/vehicle operating views, schedule analytics presets, lane-pressure summaries, reconciliation queue handling, runtime state persistence across reloads, delivery checkpointing, runtime delivery ledger history, KPI dictionary definitions, reporting read-model grouping by category/owner/location, read-state handling, failure retry/re-queue/resolve handling, executive review scorecards, leadership brief generation, and the visible board shell. Production build passed for this checkpoint. Playwright browser evidence, deployment validation, database migration deployment, and production release steps were not executed during this checkpoint.

Latest focused validation after the unscheduled draft availability recommendation slice:

```text
npm test -- appointment-availability-recommendation-service.test.ts appointment-availability-recommendation-route.test.ts appointment-board-shell.test.tsx
npm run typecheck
```

Focused appointment scheduling recommendation validation passed for the new recommendation service, route parsing/error handling, unscheduled-draft board integration, and related type safety. Full lint, full test suite, build, and deployment validation were not rerun during this slice.

## Vehicle Operations Governance Baseline — 2026-07-13

Vehicle Operations Milestone 0 (`VEH-004` through `VEH-007`) is complete as a planning and governance baseline. The repository now contains a canonical glossary/RACI, KPI catalog v1, threat model/data classification, and SLO/backup/retention/incident policy under `docs/inventory/governance/`. These documents define implementation requirements and acceptance evidence; they do not claim that the planned vehicle persistence, APIs, security controls, monitoring, backup topology, or incident automation is implemented.

## Vehicle Operations Enterprise Command Foundation — 2026-07-14

Vehicle Operations Milestone 1 (`VEH-010` through `VEH-017`) is implemented in the repository. The additive Prisma schema and migration provide organization/location enforcement, capability grants, generic aggregate versions, an idempotent command ledger, domain and audit events, a transactional outbox, versioned rollout controls, rollout history, and health checkpoints. Server-side services and protected APIs enforce capabilities, canonical request hashes, stale-version conflicts, audit reasons, and atomic command/event/audit/outbox writes. A retryable worker atomically claims outbox messages and handles publication, backoff, and dead-letter state. Managers have a protected `/settings/vehicle-operations` health and rollout surface with stale-version recovery.

This is a shared command foundation, not the M2 canonical vehicle registry or later inventory/shop implementation. The migration has not been deployed here, no production publisher or scheduled worker has been configured, and production pilot/alert/recovery evidence remains pending. Detailed evidence and the M2 adoption contract are in [`docs/inventory/VEHICLE_OPERATIONS_COMMAND_FOUNDATION.md`](inventory/VEHICLE_OPERATIONS_COMMAND_FOUNDATION.md).

## Canonical Vehicle Registry — 2026-07-14

Vehicle Operations Milestone 2 (`VEH-020` through `VEH-028`) is implemented in the repository. The existing appointment/customer-compatible `Vehicle` root is extended in place with canonical VIN/stock controls, documented non-VIN exceptions, versioning, task linkage, and merge lineage. Effective-dated relationships, external identity mappings/conflicts, append-only odometer observations/corrections, attributable custody events, and duplicate-review cases have additive schema and migration coverage. Protected registry APIs provide paginated tenant-safe search and atomic M1-backed mutation commands. `/vehicles/registry` provides search, identity/history inspection, governed create/correction, import preview, odometer/custody capture, and duplicate reconciliation.

This implementation preserves existing appointment/resource/customer references and legacy task text. The database migration, production import, external VIN/DMS adapters, outbox runtime, rollout activation, and production reconciliation evidence were not executed here. See [`docs/inventory/VEHICLE_REGISTRY_IMPLEMENTATION.md`](inventory/VEHICLE_REGISTRY_IMPLEMENTATION.md) and [`docs/inventory/VEHICLE_REGISTRY_ADR_MIGRATION_MAP.md`](inventory/VEHICLE_REGISTRY_ADR_MIGRATION_MAP.md).

## Inventory Unit Foundation — 2026-07-14

Vehicle Operations Milestone 3A (`VEH-030`) is implemented in the repository. `InventoryUnit` now separates a dealership-controlled commercial inventory cycle from canonical physical vehicle identity and retains financial acquisition time, lifecycle stage/start, operating state, accountable owner/location, target, next action, version, and immutable state history. Database constraints enforce tenant-safe references, one open unit per vehicle, unique organization inventory numbers, valid timelines/state, and immutable event rows. Protected APIs and `/vehicles/inventory` provide eligible-vehicle creation, search/detail, active/waiting/blocked control updates, stale-version recovery, and history inspection through the M1 command/audit/event/outbox transaction.

## Repair-order core — 2026-07-14

Vehicle Operations Milestone 4A (`VEH-050` and `VEH-051`) is implemented in the repository. `ServiceVisit` preserves immutable appointment, walk-in, or inventory-recon intake evidence while `RepairOrder` owns the accountable shop coordination state. Appointment conversion is idempotent and derives its primary customer and vehicle from authoritative appointment links. Walk-in and inventory-recon intake validate canonical organization ownership. Concern, promise, consent, keys, transportation, owner, location, target, next action, version history, command, audit, domain event, and outbox evidence commit atomically. Protected APIs and `/vehicles/repair-orders` provide intake, search, detail, and active/waiting/blocked controls. Later DVI, diagnosis, estimate, approval, job, labor, parts, dispatch, QC, invoice, close, and reopen commands are deliberately not claimed.

## Parts ledger and repair readiness — 2026-07-14

Vehicle Operations Milestone 5A is implemented as the controlled parts foundation. Normalized part masters, warehouses/bins/staging/damaged locations, balance projections, immutable stock ledger entries, repair-order demand, scarce stock reservations, and immutable readiness evaluations now exist. Receipt, adjustment, explicit reversal, demand, and reservation commands commit through the M1 command/audit/event/outbox transaction. Negative stock, over-allocation, cross-location reservation, duplicate source posting, mutation of ledger history, and readiness without fully reserved active demand are prevented. Protected APIs and `/vehicles/parts` expose the live workflow behind independent `PARTS_OPERATIONS` rollout controls. Full interchange/vendor masters, RepairJob promotion, purchase orders, discrepancies, issue/install/return, transfers, cores, warranty/vendor returns, counts, and replenishment remain later slices and are not claimed.

## Shop planning core — 2026-07-14

Vehicle Operations Milestone 4B (`VEH-052` through `VEH-056`) is implemented. Versioned DVI evidence, concern-cause-correction diagnoses, immutable presented estimates/change orders, exact-version authorization decisions, and readiness-gated RepairJobs now share the RepairOrder command stream. Estimates calculate their server-owned totals from structured lines; accepted, partial, declined, deferred, expired, and revoked decisions retain actor/channel/time/reason lineage. Jobs require an accepted authorized line and retain labor guide, skills, certifications, bay/tool needs, priority, dependencies, and promoted 5A demand. Protected planning APIs and `/vehicles/shop-planning` guide the flow through diagnosis, estimate, authorization, and ready-for-repair while preserving optimistic concurrency, immutable evidence, audit events, domain events, and outbox messages. Work templates, labor clocks, dispatch, execution, QC, invoicing, closing, and reopening are not claimed.

The migration is not deployed and `RETAIL_INVENTORY` remains rollout-disabled by default. VEH-031 through VEH-042, production backfill/import, lifecycle advancement, and live control-tower replacement remain planned. See [`docs/inventory/INVENTORY_UNIT_FOUNDATION_IMPLEMENTATION.md`](inventory/INVENTORY_UNIT_FOUNDATION_IMPLEMENTATION.md) and [`docs/inventory/INVENTORY_UNIT_FOUNDATION_ADR.md`](inventory/INVENTORY_UNIT_FOUNDATION_ADR.md).

## Shop dispatch and technician execution — 2026-07-14

Vehicle Operations Milestone 4C (`VEH-057` through `VEH-062`) is implemented. Effective-dated procedures and qualifications now gate location-aware technician, bay, tool, and equipment assignments. The live dispatch board enforces one current and one next job, detects shop and appointment resource conflicts, retains re-dispatch lineage, and requires attributable overrides. Technician execution provides current/next work, procedures, parts, blockers, labor start/pause/resume/finish/correction evidence, and a required evidence-backed QC handoff. All writes use the Milestone 1 command/audit/event/outbox boundary. QC release, advisor workflow, comeback handling, production analytics, invoicing, and close/reopen remain later slices. The migration is source-controlled but not deployed. See [`docs/inventory/SHOP_DISPATCH_EXECUTION_IMPLEMENTATION.md`](inventory/SHOP_DISPATCH_EXECUTION_IMPLEMENTATION.md).

## Quality control and vehicle release — 2026-07-14

Vehicle Operations Milestone 4D (`VEH-064`) is implemented. Immutable per-job QC versions enforce completion evidence, applicable safety checks, diagnostic/heavy peer verification, applicable road-test evidence, and explicit failed-check rework instructions. Failure returns the job to the governed repair/dispatch flow without deleting labor or QC history. Final release authorization is a separate RepairOrder command and remains blocked until every non-cancelled job has a latest passing QC inspection, labor is stopped, keys and final-condition evidence are verified, and open exceptions are empty. Customer versus inventory handoff is derived from RepairOrder origin. Advisor delivery, invoicing/payment, close/reopen, comeback handling, and production analytics are not claimed. The migration is source-controlled but not deployed. See [`docs/inventory/QUALITY_CONTROL_RELEASE_IMPLEMENTATION.md`](inventory/QUALITY_CONTROL_RELEASE_IMPLEMENTATION.md).

## Advisor, comeback, and shop production — 2026-07-14

Vehicle Operations Milestones 4E, 4F, and 4G (`VEH-063`, `VEH-065`, and `VEH-066`) are implemented. Advisors have immutable promise/contact/exception updates, existing estimate/authorization/QC context, and system-gated delivery-readiness evaluations. Comebacks link released original jobs and corrections to controlled review, responsibility, cost, follow-up, outcome, and immutable transition evidence with a non-punitive-use control. Production snapshots reconcile verified presence, labor events, labor-guide earned time, comeback exclusions, idle causes, the approved five formulas, confidence, and source fingerprints. Protected workspaces exist at `/vehicles/advisor`, `/vehicles/comebacks`, and `/vehicles/shop-production`; all writes use the M1 command/audit/event/outbox boundary. Provider messaging, invoicing/payment, warranty claims, close/reopen, payroll, and disciplinary automation are not claimed. The migration is source-controlled but not deployed. See [`docs/inventory/SHOP_COMPLETION_IMPLEMENTATION.md`](inventory/SHOP_COMPLETION_IMPLEMENTATION.md).

## Customers Console Baseline

Verified Customers implementation as of 2026-07-10:

- `/customers` renders the approved Customer Command Center front-page dashboard composition.
- `/customers/resolutions` renders the approved Customer Resolution metrics, queue tabs, case table, analytics, and selected-case command rail as sample presentation data.
- The dashboard supports persistent light and dark appearances from one component hierarchy.
- A Customer 360 profile presentation shell exists for the future `/customers/[customerId]` route.
- Prisma contains a minimum organization-scoped `Customer` identity used by Appointment participants, including customer number, basic contact fields, status, external reference, duplicate key, merge target, and retention date.
- The Customers browser smoke proves the landing dashboard, business summary, operations rail, resolution navigation, queue filtering, case selection, detail tabs, theme switching, and theme persistence.
- Dashboard values, pipeline, leads, tasks, appointments, activity, and Customer 360 business values remain presentation data rather than Customers service read models.
- Customer CRUD, list/search, contact points, interactions, notes, leads, cases, SLA/escalation, document requirements, customer-vehicle relationships, durable task links, manager intelligence, saved views, merge workflow, customer audit, and day-one rollout signoff remain planned.

The accepted Customers target architecture and execution sequence live in [`docs/customers/README.md`](customers/README.md). Those documents describe planned behavior and do not supersede this implementation evidence.

Latest focused validation after the appointment template blueprint generation slice:

```text
npm test -- src/tests/unit/appointment-lifecycle-command-service.test.ts src/tests/unit/appointment-lifecycle-transaction-service.test.ts src/tests/unit/appointment-command-execution-service.test.ts
npm run typecheck
```

Focused appointment lifecycle validation passed for template-backed blueprint task generation during draft, approval, schedule, check-in, outcome, and completion flows, plus transactional task-link/activity persistence and execution-bridge snapshot handling. Full lint, build, database validation, and deployment validation were not rerun during this slice.

## Implemented Foundation

| Area | Status | Evidence |
| --- | --- | --- |
| Next.js application scaffold | Implemented | App Router source, package scripts, shared layout, protected route group |
| PostgreSQL and Prisma | Implemented | Schema, Prisma client wiring, migrations, and seed entrypoint |
| Authentication | Implemented | Login, logout, current-user route, sessions, and protected routes |
| Users, roles, and duties | Implemented | Schema, APIs, services, policies, settings UI, and tests |
| App settings | Implemented | Timezone, business days, generation time, manager API/UI, and tests |
| Appointment admin settings foundation | Implemented as partial E5 admin foundation | Manager-only `/settings/appointments` workspace, protected appointment admin settings routes, location profile/address/phone/timezone/status editing, weekday appointment operating windows, location closure create/edit/delete, recurring-template-to-closure apply flow with documented reason capture, special-hours calendar preview, recurring closure template readiness, resource availability calendar summaries, resource-specific operating calendars with day-level hours/capacity override windows, reason-required removal controls, overlap/runtime review, precedence guidance, next-effective-window preview, bulk multi-day apply/replace controls, capacity override readiness and quick drafts, resource type editor controls for governed create plus safe default name/capacity/conflict/status updates, resource type deactivation instead of hard delete, resource status/capacity/conflict-policy editing, resource outage/capacity-reduction windows, resource/catalog/automation readiness summaries, preview-safe configuration export, import-preview validation, redaction reporting, and Appointment Board header/create/schedule fallback wiring |
| Appointment catalog automation admin foundation | Implemented as partial E5 admin foundation | Manager-only `/settings/appointments/catalog` workspace, protected catalog/simulation/draft/activation/lifecycle/review/code-editor routes, purpose template read model, outcome/follow-up/reason catalog visibility, structured outcome/follow-up/reason code add/rename/remove/deprecate/reactivate controls, code replacement guidance, deprecated-code validation warnings and new-configuration guards, live appointment-count usage analytics, highest-risk code ranking, code reference counts, manager-ready code impact reports, purpose usage impact, code labels/descriptions in catalog snapshots, automation rule hook visibility, governance metrics, safe simulation preview, durable active/draft catalog versions, append-only change events, required reason capture, draft validation, approval review status, activation approval gate, purpose usage/reference warnings, draft save, activation, purpose create, duplicate, deprecate, reactivate, and draft-only delete protection |
| Appointment automation operations console | Implemented as partial E5/E3 automation runtime and operations foundation | Manager-only `/settings/appointments/automation` workspace, automation rule schema/migration, rule lifecycle draft/activate/pause/retire APIs, health metrics, catalog-derived rule candidates, runtime execution persistence from outcome-driven automations, failure/review queue controls, duplicate-safe retry/replay/resolve/skip execution handling, replay/recovery audit context, persisted generated-record correlation for lifecycle-driven follow-up work, appointment-history/activity-feed bridging for appointment-sourced and generated-appointment automation evidence, required reason capture, audit event schema, and focused service/route/UI tests |
| Task templates | Partially implemented | Schema, API, service, validation, seed data, tests, and prototype UI exist; production template administration remains incomplete |
| Daily board generation | Implemented | Input loading, idempotent task generation, board-day status/timestamp durability, run tracking, manual trigger, scheduled route, and tests |
| Board read and UI | Implemented | Date/today APIs, grouping, filtering, responsive board, manager-visible generation health, manual task creation, command-center exception queues, resolution workbench, saved views, watched subscriptions, notification digests, manager notification inbox, notification urgency/retention/deep-link policy controls, event-to-notification fanout coverage, notification contract definitions, suppression/deduped source governance visibility, policy-update audit/runtime traces, delivery preference governance, persisted notification policy/fanout/filter/failure continuity, runtime durability summary metrics, retained-read trimming controls, future outbound notification contracts, inbound notification command contracts, fake adapter harness checks for SMS/email/calendar/CRM/DMS boundaries, reporting snapshot packaging, analytics freshness metrics, reconciliation snapshot visibility, workflow continuity context/trail persistence, resumable cross-panel manager workflow handoff, enterprise ops queues for confirmation/recovery/automation, resource/location/vehicle operating views, schedule analytics presets, lane-pressure summaries, reconciliation queue workflows, runtime state persistence, delivery checkpointing, runtime delivery ledger history, KPI dictionary definitions, reporting read-model grouping by category/owner/location, read-state handling, failure retry/re-queue/resolve queues, executive review suite, ops intelligence suite, runtime delivery queue, carry-forward handoff packaging, persisted board lens, working day/week/month/agenda views, KPI drilldowns, digest analytics, leadership export packaging, and handoff export/history flows with tests |
| Task detail and execution | Implemented | Detail read, metadata, status, assignment, checklist, comments, activity, and responsive workflows |
| My Tasks | Implemented | Staff-focused queue, guided updates, responsive layout, and tests |
| Manager review | Enterprise Command Center shell implemented; deeper review domain planned | The manager-only route now follows the approved three-pane UI/UX source of truth with a compact command header, live summary, exclusive current-state queues, deterministic task-priority/due-time ordering, selectable worklist, persistent decision workbench, required-update visibility, approve/return/reassign controls, Needs Assignment continuity, responsive layout, focused tests, and browser proof. Customer-risk classification, formal evidence requests, review cycles/decisions, review SLA, MAE-1 scoring, and escalation commands remain planned and are labeled unavailable instead of simulated. |
| Activity feed | Implemented | Durable activity records, API, board panel, full activity page, and tests |
| Assignment recommendations | Implemented | Recommendation rules, explanations, manager override, and tests |
| Automated tests | Implemented | Unit, integration, and browser workflow coverage |
| Setup and release documentation | Implemented but evolving | README, setup guide, architecture, roadmap, and release checklist |
| Production scheduler verification contract | Implemented as documentation baseline | `docs/SCHEDULER_VERIFICATION_CONTRACT.md` defines durable scheduled states, required fields, skip reason taxonomy, manager-safe failure expectations, and manual-vs-scheduled operational boundaries; production prove-out remains pending |
| Scheduled cron request evidence | Implemented as backend persistence slice | `SchedulerAttempt` schema, migration, repository, and service now record every cron hit with received timestamp, trigger source, authorization outcome, and final outcome classification; production prove-out remains pending |
| Scheduled skip reason persistence | Implemented as backend observability slice | Scheduled generation now returns normalized skip reason codes for non-business-day, before-generation-time, already-generated, and configuration-missing or configuration-invalid paths, and `SchedulerAttempt` records persist those codes alongside manager-safe explanations |
| Scheduled failure diagnostics | Implemented as backend observability slice | Failed generation runs now persist stable failure codes, failure stages, safe error messages, and sanitized structured diagnostics; scheduled attempt evidence also stores manager-safe failure diagnostics without secrets, tokens, or connection strings |
| Scheduler health read model | Implemented as backend read-model slice | Board read APIs now return a stable `schedulerHealth` payload that summarizes the latest scheduled attempt, latest manual run, last success, last failure, latest skip reason, expected-run timing, board generation state, outcome-specific guidance, unauthorized-attempt summaries, and app-known readiness checks |
| Manager scheduler health panel | Implemented as manager-only board surface | The board page now renders a manager-only generation health panel from the server `schedulerHealth` read model, including board status, latest scheduled run, latest manual run, last success, last failure, latest skip state, outcome guidance, repeated unauthorized scheduled-request visibility, readiness checks, and a health-aware manual retry action tied to refreshed run evidence |
| Scheduler deployment verification runbook | Implemented as operator runbook | `docs/SCHEDULER_DEPLOYMENT_VERIFICATION_RUNBOOK.md` now defines prerequisites, `CRON_SECRET` placement, supported headers, expected skip/success behavior, safe manual validation, and manager-facing evidence expectations |
| Scheduler release proof gate | Implemented as release checklist update | `docs/RELEASE_CHECKLIST.md` now includes an explicit scheduler production proof gate with required evidence capture instead of a vague release reminder |
| Scheduler verification coverage | Implemented as focused automated coverage | Route and read-model coverage now exercise authorized, unauthorized, skipped, failed, and latest-scheduled-vs-manual evidence paths so scheduler verification behavior is harder to regress |
| First live scheduler validation workflow | Implemented as operator workflow package | `docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md` gives the team a repeatable first-live validation record without pretending production proof has already been observed |
| Production deployment readiness | Implementation-ready for operator validation | Deployment configuration, health surfaces, readiness checks, runbook, release gate, and first-live workflow exist; a real operator still must record first-live production evidence |
| Appointment organization/location foundation | Implemented | Additive Prisma schema and migration, configured Minneapolis address/telephone/weekday hours, draft activation state, validation, General Manager policy, and focused tests |
| Appointment aggregate foundation | Implemented | Independent lifecycle states, ownership, timing, version, snapshots, exception documentation, SQL safeguards, authorization policies, and focused tests |
| Appointment participant/resource foundation | Implemented | Location access, minimum customer and vehicle identities, participant and vehicle snapshots, resource types, requirements, reservations, pools, availability windows, privacy projections, SQL safeguards, and focused tests |
| Appointment template catalog foundation | Implemented | EAPT-006 initial purpose template catalog, versioned purpose snapshot helper, template validation, outcome/reason/follow-up controls, automation defaults, and focused tests |
| Appointment-task link foundation | Implemented | EAPT-007 link types, additive schema/migration, duplicate-prevention key, explicit blocking flags, automation version fields, validation, contract documentation, and focused tests |
| Appointment audit/event foundation | Implemented | EAPT-008 appointment-scoped history events, actor and event catalogs, correlation IDs, reason and prior/new value rules, notification intent contract, additive schema/migration, validation, contract documentation, and focused tests |
| Appointment command/idempotency foundation | Implemented | EAPT-009 command ledger, command/status catalogs, organization-scoped idempotency key, request hash, optimistic version fields, retry state, result/error snapshots, additive schema/migration, validation, stale-version helper, contract documentation, and focused tests |
| Appointment command boundary | Implemented | EAPT-010 command request validation, repository contract, service boundary, API command intake route, manager/owner authorization, duplicate idempotency handling, stale-version conflict recording, boundary documentation, and focused tests |
| Appointment operations baseline | Implemented | EAPT-011 production volume, retention, archive, RTO, RPO, performance, query-coverage, and signoff-owner baseline is documented in `docs/appointments/PRODUCTION_OPERATIONS_BASELINE.md` with protected constants and focused tests |
| Appointment migration readiness | Implemented | EAPT-012 migration, seed, rollback, roll-forward, Prisma generation, production seed boundary, compatibility, and recovery reconciliation strategy is documented in `docs/appointments/MIGRATION_SEED_ROLLBACK_STRATEGY.md` with protected constants and focused tests |
| Appointment E1 gate review | Ready for approval | `docs/appointments/E1_FOUNDATION_GATE_REVIEW.md` packages E1 evidence, carry-forward risks, non-claims, approval owners, and E2 handoff with protected constants and focused tests |
| Appointment location-time service | Implemented | EAPT-013 location-local date/minute conversion, effective operating-window resolution, closure overlap detection, schedule-candidate evaluation, daylight-saving handling, service contract, and focused tests |
| Appointment resource availability service | Implemented | EAPT-014 resource availability service evaluates effective windows, capacity overrides, held/committed reservations, buffers, outages, capacity reductions, warning/hard-block severity, service contract, and focused tests |
| Appointment staff availability service | Implemented | EAPT-015 staff availability service evaluates active staff, location access grants, owner/participant/manager eligibility, staff-resource matching, staff reservations/absence availability, warning/hard-block severity, service contract, and focused tests |
| Appointment staff resource seed foundation | Implemented | Active Minneapolis users now receive seeded schedulable staff resources and staff operating windows, allowing staff conflict preview and scheduling to operate against real staff capacity |
| Appointment duration and buffer rules | Implemented | EAPT-016 duration rule service resolves template defaults, documented overrides, manager-approval requirements, location start intervals, appointment windows, and reserved resource footprints with focused tests |
| Appointment recurrence service | Implemented as service boundary | EAPT-017 recurrence service expands daily, weekly, and monthly series, preserves local time across daylight-saving changes, applies reasoned skipped/rescheduled occurrence exceptions, bounds expansion horizons, and previews safe series-edit scopes |
| Appointment hard-conflict service | Implemented as service boundary | EAPT-018 hard-conflict service evaluates inactive templates, missing context, invalid time, location closure/hours, mandatory resource hard blocks, owner/staff authorization, warning-only exclusions, and recurring occurrence hard failures with focused tests |
| Appointment warning override service | Implemented as service boundary | EAPT-019 warning service extracts warning-only staff/resource issues, surfaces duration override approvals, validates manager-only warning overrides with reason code and notes, produces audit-shaped override records, and keeps hard blocks non-overridable |
| Appointment reservation commit service | Implemented as service boundary | EAPT-020 resource reservation service locks resource IDs deterministically, re-checks current availability inside the protected boundary, prevents exclusive overbooking, avoids partial creates, supports held/committed capacity consumption, and releases reservations with documented reasons |
| Appointment availability search service | Implemented as service boundary | EAPT-021 availability search service generates bounded local-date candidates from location windows, evaluates slots through hard-conflict and warning rules, separates available/warning/blocked results, and keeps search behavior aligned with commit-time checks |
| Appointment reschedule impact service | Implemented as service boundary | EAPT-022 reschedule preview service reports prior/new times, proposed resource windows, reservation release/recreate impacts, hard conflicts, warnings, recurrence scope effects, blocked/warning occurrence keys, and preserved completed/cancelled occurrences |
| Appointment bulk reschedule service | Implemented as service boundary | EAPT-023 bulk service classifies dry-run targets, supports all-or-nothing and partial execution policies, requires reasoned execution, records skipped/succeeded/failed summaries, and enforces operation ID plus preview-token retry safety |
| Appointment waitlist and unscheduled-request service | Implemented as service boundary | EAPT-024 waitlist service captures unscheduled demand without scheduling, tracks missing context, requires schedule access, ranks availability candidates, and prepares explicit promotion plans that still require appointment commands |
| Appointment scheduling engine quality gate | Implemented as automated coverage | EAPT-025 quality tests cover approved baseline values, peak-hour availability search under p95 target, exclusive-resource concurrency protection, transaction-failure no-partial-state behavior, and 500-item bulk dry-run capacity |
| Appointment E2 scheduling foundation gate review | Ready for review | `docs/appointments/E2_SCHEDULING_GATE_REVIEW.md` packages EAPT-013 through EAPT-025 evidence, carry-forward risks, non-claims, approval owners, and E3 handoff with protected constants and focused tests |
| Appointment read model and permission-filtered queries | Implemented as service boundary | EAPT-026 read service enforces location schedule access, projects manager/owner/participant/location-viewer visibility, masks customer and vehicle fields by policy, filters cancelled/out-of-window appointments, and is documented in `docs/appointments/APPOINTMENT_READ_MODEL_CONTRACT.md` with focused tests |
| Appointment read API and board binding | Implemented as API/UI boundary | EAPT-026 read binding adds `GET /api/appointments`, defaults to the approved Minneapolis location/day window, uses the timezone-safe location-time service, hydrates `/appointments` from persisted read-model rows when available, preserves preview fallback when no persisted appointments exist, and is documented in `docs/appointments/APPOINTMENT_READ_ROUTE_AND_BOARD_BINDING_CONTRACT.md` |
| Appointment lifecycle command execution planning | Implemented as service boundary | EAPT-027 adds approve/edit command values and produces atomic effect plans for create draft, approve, edit, schedule, reschedule, cancel, and transfer-owner commands, including authorization, stale-version protection, hard-conflict/warning rejection, reservation release/commit effects, task-link effects, history effects, and command-result snapshots |
| Appointment lifecycle transaction execution boundary | Implemented as service boundary | EAPT-027 transaction executor applies executable lifecycle plans as one protected unit across appointment, reservation, task-link, history, and command-result effects, records rejected plans as failed commands without side effects, proves rollback behavior when later transaction steps fail, and includes a concrete Prisma transaction repository for appointment, reservation, task-link, history, and command-ledger persistence |
| Appointment lifecycle command route execution | Implemented as backend boundary | EAPT-027 command route orchestration submits supported lifecycle commands through the ledger boundary, skips duplicates/conflicts, builds lifecycle plans, executes through the transaction executor and Prisma adapter, and returns execution results in the API response |
| Appointment confirmation, attendance, and execution commands | Implemented as backend boundary | EAPT-028 extends lifecycle command execution to confirm, decline, check in, record no-show, start, wait, and finish appointments with manager/owner authorization, stale-version protection, scheduled-state guards, required reason/follow-up documentation where applicable, optional no-show reservation release, history effects, route execution support, and focused tests |
| Appointment draft creation UI | Implemented as initial UI command bridge | EAPT-029A New Appointment modal submits `CREATE_DRAFT` through the live command route with category, title, customer snapshot, vehicle snapshot, Minneapolis date/time, duration, documented reason, generated appointment number, generated idempotency key, signed-in owner default, and live board refresh after success |
| Appointment draft scheduling UI | Implemented as initial UI command bridge | EAPT-029B detail rail exposes Schedule Draft for persisted draft appointments, disables Check In and No Show while an appointment is still draft, submits `SCHEDULE` with appointment ID, expected version, saved start/end, and scheduling timezone, and refreshes from the live read model after success |
| Appointment schedule readiness preview | Implemented as initial API/UI boundary | EAPT-029C adds a server-backed readiness preview for persisted draft appointments, exposes `GET /api/appointments/:id/schedule-readiness`, enforces schedule visibility plus manager/owner authority, reports hard blocks and warnings, renders Schedule Readiness in the detail rail, and stops Schedule Draft when hard blocks exist |
| Appointment resource planning preview | Implemented as initial API/UI boundary | EAPT-029D adds a server-backed resource-planning preview for persisted draft appointments, exposes `GET /api/appointments/:id/resource-planning`, infers enterprise resource requirements from appointment category, checks configured resource types and active location resources, detects selected requirements, renders Resource Planning in the detail rail, and reports configuration gaps explicitly |
| Appointment resource requirement attachment | Implemented as initial write boundary | EAPT-029E adds `POST /api/appointments/:id/resource-requirements`, attaches server-recommended requirements to persisted draft appointments, enforces expected version, manager/owner authority, recommendation eligibility, and configured resource type, increments appointment version, writes `FIELD_UPDATED` history, and exposes Attach Requirement in the detail rail |
| Appointment resource candidate proposal | Implemented as initial proposed-selection boundary | EAPT-029F adds `POST /api/appointments/:id/resource-requirements/:requirementId/candidate-proposals`, validates active matching resources, creates non-capacity-consuming `PROPOSED` reservations, cancels prior proposed candidates for the same requirement, increments appointment version, writes `FIELD_UPDATED` history, and exposes candidate dropdown plus Propose Candidate in the detail rail |
| Appointment proposed candidate availability preview | Implemented as initial API/UI boundary | EAPT-029G adds `GET /api/appointments/:id/resource-candidate-availability`, evaluates persisted `PROPOSED` reservations through the resource availability service, reports READY/WARNING/BLOCKED, keeps proposed reservations non-capacity-consuming, and displays availability in the Resource Planning detail rail |
| Appointment resource candidate hold | Implemented as initial write boundary | EAPT-029H adds `POST /api/appointments/:id/resource-reservations/:reservationId/hold`, re-checks availability before writing capacity-consuming state, changes `PROPOSED` reservations to `HELD`, enforces expected version and manager/owner authority, increments appointment version, writes `FIELD_UPDATED` history, and exposes Hold Candidate in the detail rail |
| Appointment held reservation schedule commit | Implemented as initial command execution bridge | EAPT-029I loads appointment-held reservations server-side during `SCHEDULE`, passes them into lifecycle reservation effects, updates existing `HELD` reservation rows to `COMMITTED` instead of creating duplicate committed rows, and records committed reservation counts in command execution results |
| Appointment resource reservation release control | Implemented as initial API/UI boundary | EAPT-029J adds `POST /api/appointments/:id/resource-reservations/:reservationId/release`, releases `HELD` and `COMMITTED` reservations from active appointments, enforces expected version, manager/owner authority, reason code/notes, appointment version increment, `FIELD_UPDATED` history, and exposes Release Reservation in the Resource Planning detail rail |
| Appointment held reservation replacement workflow | Implemented as initial API/UI boundary | EAPT-029K adds `POST /api/appointments/:id/resource-reservations/:reservationId/replace`, replaces draft `HELD` reservations with a different active resource candidate, releases the old hold, cancels prior proposals, creates a replacement `PROPOSED` reservation, increments appointment version, writes `FIELD_UPDATED` history, and exposes Replace Reservation in the Resource Planning detail rail |
| Appointment resource warning override capture | Implemented as initial API/UI boundary | EAPT-029L adds `POST /api/appointments/:id/resource-reservations/:reservationId/warning-override`, records manager-only `WARNING_OVERRIDDEN` history for warning-level proposed resource candidates, rejects hard blocks, enforces expected version and reason documentation, rechecks availability server-side, and exposes Override Warning in the Resource Planning detail rail |
| Appointment resource warning hold enforcement | Implemented as initial service/API boundary | EAPT-029M requires a matching `WARNING_OVERRIDDEN` appointment history event before a warning-level `PROPOSED` resource candidate can become `HELD`, keeps hard blocks non-overridable, leaves ready candidates unaffected, maps missing override attempts to a user-correctable hold error, and is covered by focused service and route tests |
| Appointment resource warning override visibility | Implemented as initial API/UI boundary | EAPT-029N extends proposed-candidate availability with persisted warning override fields, returns override-aware `canProceedToHold`, looks up matching `WARNING_OVERRIDDEN` history by warning key, and lets the board render `Warning Overridden` after refresh |
| Appointment resource action reason fields | Implemented as initial UI boundary | EAPT-029O adds board-visible reason fields for warning override, held/committed release, and held replacement, requires those notes before submission, combines user-entered explanation with operational context, and clears the specific reason field after success |
| Appointment staff conflict preview | Implemented as initial API/UI boundary | EAPT-029P adds `GET /api/appointments/:id/staff-conflicts`, evaluates owner-staff eligibility and availability through the staff availability service, surfaces ready/warning/blocked results in the detail rail, and keeps participant-staff expansion pending |
| Appointment staff warning override and schedule enforcement | Implemented as initial API/UI/command boundary | EAPT-029Q adds `POST /api/appointments/:id/staff-conflicts/override`, records manager-only `WARNING_OVERRIDDEN` history for owner-staff warning conflicts, shows persisted staff override status in Staff Conflict Preview, and injects unresolved owner-staff warnings into Schedule Draft command execution |
| Appointment scheduled committed resource replacement | Implemented as initial API/UI boundary | EAPT-029R extends `POST /api/appointments/:id/resource-reservations/:reservationId/replace` so scheduled appointments can replace `COMMITTED` reservations with a cleanly available committed resource in one transaction, exposes replacement controls for persisted live appointments, preserves draft held replacement behavior, and records reasoned `FIELD_UPDATED` history |
| Appointment participant staff conflict preview | Implemented as initial API/UI/command boundary | EAPT-029S extends `GET /api/appointments/:id/staff-conflicts` so required internal-user appointment participants are evaluated alongside the owner, returns aggregate and per-staff checks, renders every staff check in the detail rail, and lets Schedule Draft consume the aggregate staff result |
| Appointment participant staff warning override enforcement | Implemented as initial API/UI/command boundary | EAPT-029T extends staff warning override governance to required internal participants, records role-aware warning override history, shows participant override satisfaction in Staff Conflict Preview, and makes Schedule Draft reject unresolved participant staff warnings |
| Appointment committed resource warning replacement | Implemented as initial API/UI boundary | EAPT-029U allows scheduled committed resource replacements to proceed when the replacement is warning-only and the manager/owner submits an explicit replacement reason, records warning acceptance in history metadata, returns warning details to the board, and keeps hard-block replacements rejected |
| Appointment owner reassignment UI | Implemented as initial UI command bridge | EAPT-029V exposes Owner Reassignment in the live appointment detail rail, derives transfer targets from live staff context, requires a documented reason, submits `TRANSFER_OWNER` through the appointment command route with expected version and idempotency/correlation ids, and refreshes the board after success |
| Appointment outcome and follow-up UI | Implemented as initial UI command bridge | EAPT-029W extends lifecycle execution planning to `COMPLETE`, projects outcome/follow-up notes through the read model, exposes Start Work, Finish Work, and Save Outcome in the detail rail, requires completion reason and follow-up notes when needed, submits through the command route with expected version and idempotency/correlation IDs, writes completion/outcome history, and refreshes the board after success |
| Appointment outcome follow-up automation | Implemented as initial transaction-backed automation | EAPT-029X creates linked follow-up tasks from `COMPLETE` when the final disposition is callback required, follow-up appointment required, or manager review required; the task, appointment-task link, generated-task board activity event, appointment update, appointment history, reservation release, and command result are saved in one lifecycle transaction |
| Appointment outcome follow-up appointment automation | Implemented as initial transaction-backed automation | EAPT-029Y creates an unscheduled automation-sourced follow-up draft appointment from `COMPLETE` when the final disposition is follow-up appointment required; the draft keeps source reference/snapshot back to the completed appointment, is saved in the same lifecycle transaction, and its generated appointment number is surfaced in the board success notice |
| Appointment generated draft visibility | Implemented as initial read-model/UI bridge | EAPT-029Z includes unscheduled draft/pending appointments in the board read model and selects generated follow-up draft appointments after outcome automation refreshes the board |
| Appointment unscheduled draft lane | Implemented as initial UI bridge | EAPT-029AA renders missing-time draft appointments in a dedicated Unscheduled / Drafts lane, keeps them selectable in the detail rail, labels their timing as unscheduled, and filters them out of timed calendar columns so generated follow-up drafts no longer appear as fake 9:00 AM appointments |
| Appointment unscheduled draft scheduling | Implemented as initial UI/API command bridge | EAPT-029AB adds a reason-required detail-rail scheduling form for missing-time live drafts, submits the existing `SCHEDULE` command with the selected Minneapolis time window, passes the proposed window into server-side staff-conflict validation, records optional schedule reason details on history, refreshes the read model, and keeps the scheduled appointment selected |
| Appointment proposed-time readiness preview | Implemented as initial API/UI preview boundary | EAPT-029AC extends schedule readiness to evaluate proposed unscheduled-draft start/end windows without saving, lets the board refresh readiness as selected date/time/duration changes, and disables Schedule This Draft when hard-blocked readiness is known |
| Appointment proposed-time staff conflict preview | Implemented as initial API/UI preview boundary | EAPT-029AD extends staff-conflict preview to evaluate proposed unscheduled-draft start/end windows without saving, lets the board refresh staff availability as selected date/time/duration changes, and guards Schedule This Draft when staff is blocked or warning override remains unsatisfied |
| Appointment proposed-time staff warning override | Implemented as initial API/UI warning-override boundary | EAPT-029AE lets manager staff-warning overrides for unscheduled drafts include the proposed start/end/timezone, records the exact proposed warning key plus proposed-window metadata in history, and allows the final `SCHEDULE` command to match the proposed-time override |
| Appointment proposed-time resource candidate availability | Implemented as initial API/UI preview boundary | EAPT-029AF extends resource-candidate availability to evaluate already proposed resource candidates against proposed unscheduled-draft start/end windows without saving and refreshes the board candidate availability panel as date/time/duration changes |
  Appointment-Board---Scheduling-and-Automation-Block-01
| Appointment proposed-time resource proposal and hold | Implemented as initial API/UI mutation boundary | EAPT-029AG lets unscheduled drafts propose resource candidates for the selected slot, stores that proposed window on the reservation without scheduling the appointment, and allows hold to validate the reservation window while keeping existing authority, version, availability, warning, and reason controls |
| Appointment unscheduled draft availability recommendations | Implemented as initial API/UI recommendation boundary | EAPT-029AH adds `GET /api/appointments/:id/availability-recommendations`, reuses the live availability-search and waitlist-ranking foundations to return ranked candidate slots for missing-time drafts, and lets the board apply a suggested slot back into the scheduling form before the audited `SCHEDULE` command |
 
| Appointment proposed-time resource proposal and hold | Implemented as initial API/UI mutation boundary | EAPT-029AG lets unscheduled drafts propose resource candidates for the selected slot, stores that proposed window on the reservation without scheduling the appointment, allows warning overrides to reuse the proposed reservation window with proposed-slot history metadata, and allows hold to validate the reservation window while keeping existing authority, version, availability, warning, and reason controls |
  main
| Appointment linked work read model and detail panel | Implemented as initial read-model/UI boundary | EAPT-030A extends appointment read projection with linked task title, status, due time, assigned user, link metadata, and required/blocking flags, and renders real linked-task rows in the Appointment Board detail rail |
| Appointment linked-work navigation | Implemented as initial UI handoff | Live linked task rows on the Appointment Board expose direct task-detail navigation for appointment-to-task handoff |
| Task-to-appointment draft creation | Implemented as initial task-detail command workflow | EAPT-032 adds a Create Appointment card to the task detail rail, allows managers and assigned task owners to create linked unscheduled draft appointments, requires a documented reason, submits through the audited `CREATE_DRAFT` command ledger, links the source task as `SOURCE_TASK`, records task activity, provides Appointment Board handoff, and leaves scheduling/conflict checks to the Appointment Board |
| Appointment activity feed visibility | Implemented as initial feed bridge | Appointment history events, including appointment automation history evidence, are merged into the Activity Feed with appointment-prefixed labels, tones, appointment filter support, actor/task/appointment context, and focused service/UI tests |
| Appointment Board visible shell | Implemented as preview UI with live binding and command bridge | `/appointments` now renders the mockup-aligned board surface with KPI cards, staff calendar columns, filters, selectable appointments, detail rail, real linked task rows, enterprise controls, upcoming appointments, responsive behavior, live read-model hydration when persisted records exist, preview fallback when none exist, Check In / No Show / Start Work / Finish Work controls wired to the live command API when persisted appointment record IDs and versions are available, draft creation, draft scheduling, dedicated unscheduled/draft lane, unscheduled draft scheduling form, past-time schedule guard, proposed-time readiness preview, proposed-time staff conflict preview, proposed-time staff warning override, proposed-time resource candidate availability preview, proposed-time resource proposal/hold mutation, ranked unscheduled-draft availability suggestions, schedule-readiness preview, owner and participant staff conflict preview, owner/participant staff warning override/enforcement, resource-planning preview, recommended resource requirement attachment, proposed resource candidate selection, proposed-candidate availability preview, resource candidate hold, Schedule command held-reservation commit, held/committed reservation release, held-reservation replacement, scheduled committed reservation replacement with warning-level acceptance, resource warning override capture, warning-before-hold enforcement, persisted warning override visibility, explicit resource action reason fields, final outcome/follow-up capture, transaction-backed follow-up task automation, transaction-backed follow-up draft appointment automation, template-backed blueprint task generation across lifecycle checkpoints, generated draft visibility/selection, and task-originated linked draft creation with manual browser proof; broad automated browser workflows and production evidence remain pending |

| Concern-to-task resolution engine | Implemented initial live slice | Manager-only Tasks Console intake now previews deterministic classification/severity, atomically creates idempotent concern packages with linked prioritized tasks and required evidence, enforces dependencies and closure gates, exposes recent packages, writes activity evidence, and supports protected 15-minute escalation evaluation. |

## Existing Partial or Placeholder Surfaces

| Surface | Current state |
| --- | --- |
  Appointment-Board---Scheduling-and-Automation-Block-01
| Appointments | Visible preview shell exists; E1 command intake API boundary exists; E2 scheduling service boundaries exist; EAPT-026 read API and initial board hydration exist; EAPT-027/EAPT-028 lifecycle command execution routes exist for supported backend commands; the detail rail has live linked-task rows, Schedule Draft, Schedule Readiness, Staff Conflict Preview, Owner Reassignment, Resource Planning, Attach Requirement, Propose Candidate, proposed-candidate availability, Hold Candidate, Release Reservation, Replace Reservation, Override Warning, Override Staff Warning, required reason fields for warning/release/replacement, ranked availability suggestions for unscheduled drafts, and safe Check In / No Show / Start Work / Finish Work / Save Outcome command bridges; New Appointment can create persisted draft records; task detail can create linked unscheduled draft appointments through the command ledger; Schedule Draft now commits held reservations server-side; scheduled committed resource reservations can now be replaced with cleanly available or warning-level manager-accepted committed replacements; warning-level resource candidates now require override history before hold and show persisted override status after refresh; unresolved owner/participant staff warnings now block Schedule Draft until overridden, participant staff warning overrides are role-aware, owner reassignment is bridged to the live `TRANSFER_OWNER` command, final outcome/follow-up capture is bridged to the live `COMPLETE` command, follow-up dispositions can create linked tasks transactionally, follow-up-appointment-required outcomes can create draft follow-up appointments transactionally, generated drafts are returned/selected after refresh, missing-time drafts now render in a dedicated unscheduled/draft lane instead of timed calendar columns, unscheduled drafts can be scheduled from the detail rail with reason capture, proposed-time readiness/staff/resource-candidate availability preview updates before submit, proposed-time staff warnings can be overridden with history metadata, proposed-time resource candidate proposal/hold can operate before the appointment time is saved, and availability recommendations can be applied back into the draft scheduling form; full staff directory/admin maintenance, participant reassignment controls, reason-code catalog/templates, browser workflows, activity-feed emission for generated tasks, proposed-time resource warning override metadata, and production evidence remain pending |

| Appointments | Visible preview shell exists; E1 command intake API boundary exists; E2 scheduling service boundaries exist; EAPT-026 read API and initial board hydration exist; EAPT-027/EAPT-028 lifecycle command execution routes exist for supported backend commands; the detail rail has live linked-task rows, Schedule Draft, Schedule Readiness, Staff Conflict Preview, Owner Reassignment, Resource Planning, Attach Requirement, Propose Candidate, proposed-candidate availability, Hold Candidate, Release Reservation, Replace Reservation, Override Warning, Override Staff Warning, required reason fields for warning/release/replacement, and safe Check In / No Show / Start Work / Finish Work / Save Outcome command bridges; New Appointment can create persisted draft records; task detail can create linked unscheduled draft appointments through the command ledger; Schedule Draft now commits held reservations server-side; scheduled committed resource reservations can now be replaced with cleanly available or warning-level manager-accepted committed replacements; warning-level resource candidates now require override history before hold and show persisted override status after refresh; unresolved owner/participant staff warnings now block Schedule Draft until overridden, participant staff warning overrides are role-aware, owner reassignment is bridged to the live `TRANSFER_OWNER` command, final outcome/follow-up capture is bridged to the live `COMPLETE` command, follow-up dispositions can create linked tasks transactionally, follow-up-appointment-required outcomes can create draft follow-up appointments transactionally, generated follow-up tasks now emit board activity visibility, generated drafts are returned/selected after refresh, missing-time drafts now render in a dedicated unscheduled/draft lane instead of timed calendar columns, unscheduled drafts can be scheduled from the detail rail with reason capture, proposed-time readiness/staff/resource-candidate availability preview updates before submit, proposed-time staff warnings can be overridden with history metadata, and proposed-time resource candidate proposal/hold and warning override can operate before the appointment time is saved; full staff directory/admin maintenance, participant reassignment controls, reason-code catalog/templates, browser workflows, availability recommendations, and production evidence remain pending |
  main
| Customers | Placeholder guidance page; no enterprise customer subsystem |
| Vehicles | Placeholder guidance page; no enterprise vehicle subsystem |
| Reports | Placeholder guidance page; no enterprise reporting subsystem |
| Tasks console | Manager-facing Task Operations Console foundation exists at `/tasks` with mockup-aligned layout, KPI strip, internal queue sidebar, dense list/board modes, right-side detail rail, quick workflow actions, clearly local/browser saved views, filters, CSV export, staff self-create from My Tasks, and targeted Playwright smoke proof through a system-browser fallback; durable shared saved views and broader browser workflow coverage remain follow-up work |
| Task-template administration | Production API and service foundation with a prototype interface; not yet a completed production administration workflow |

## Enterprise Appointment Boundary

The approved Enterprise Appointment Release 1.0 program is documented in `docs/appointments/`.

At this baseline:

- E0 product direction is approved.
- E1 configuration baseline and initial template catalog exist.
- EAPT-001 repository reconciliation is complete with this document and linked status updates.
- EAPT-002 architecture decisions are accepted.
- EAPT-003 organization/location foundation is implemented.
- EAPT-004 Appointment aggregate foundation is implemented.
- EAPT-005 participant, customer, vehicle, location-access, privacy, and resource foundation is implemented.
- E2 scheduling foundation service boundaries EAPT-013 through EAPT-025 are implemented and ready for review; concrete database adapters, live APIs, and UI workflows remain pending.
- EAPT-026 appointment read model, permission-filtered query foundation, read API route, and initial Appointment Board hydration are implemented.
- EAPT-027 lifecycle command execution planning, transaction execution boundaries, approve/edit command expansion, concrete Prisma transaction adapter, and lifecycle command route orchestration are implemented as backend boundaries.
- EAPT-028 confirmation, attendance, no-show, and execution-state command planning and route execution are implemented as backend boundaries.
- EAPT-029A initial New Appointment draft creation is implemented as a UI command bridge.
- EAPT-029B initial Schedule Draft action is implemented as a UI command bridge.
- EAPT-029C initial Schedule Readiness warning/block preview is implemented as a server-backed API/UI boundary.
- EAPT-029D initial Resource Planning preview is implemented as a server-backed API/UI boundary.
- EAPT-029E initial Resource Planning requirement attachment is implemented as a guarded write boundary.
- EAPT-029F initial Resource Planning candidate proposal is implemented as a guarded write boundary.
- EAPT-029G initial proposed resource candidate availability preview is implemented as a server-backed API/UI boundary.
- EAPT-029H initial proposed-to-held resource reservation workflow is implemented as a guarded write boundary.
- EAPT-029I initial Schedule command held-reservation commit bridge is implemented.
- EAPT-029J initial held/committed resource reservation release control is implemented.
- EAPT-029K initial held-reservation replacement workflow is implemented.
- EAPT-029L initial resource warning override capture is implemented.
- EAPT-029M initial warning-before-hold enforcement is implemented.
- EAPT-029N initial persisted warning override visibility is implemented.
- EAPT-029O initial explicit resource action reason fields are implemented.
- EAPT-029P initial owner-staff conflict preview is implemented.
- EAPT-029Q initial owner-staff warning override and Schedule Draft enforcement is implemented.
- EAPT-029R initial scheduled committed resource replacement is implemented.
- EAPT-029S initial participant staff conflict preview is implemented.
- EAPT-029T initial participant staff warning override enforcement is implemented.
- EAPT-029U initial warning-level committed resource replacement acceptance is implemented.
- EAPT-029V initial owner reassignment UI command bridge is implemented.
- EAPT-029W initial outcome and follow-up UI command bridge is implemented.
- EAPT-029X initial outcome-driven follow-up task automation is implemented.
- EAPT-029Y initial outcome-driven follow-up draft appointment automation is implemented.
- EAPT-029Z initial generated follow-up draft visibility and selection is implemented.
- EAPT-029AA initial unscheduled draft lane is implemented.
- EAPT-029AB initial unscheduled draft scheduling command bridge is implemented.
- EAPT-029AC initial proposed-time readiness preview is implemented.
- EAPT-029AD initial proposed-time staff conflict preview is implemented.
- EAPT-029AE initial proposed-time staff warning override is implemented.
- EAPT-029AF initial proposed-time resource candidate availability preview is implemented.
- EAPT-029AG initial proposed-time resource proposal and hold mutation is implemented.
- EAPT-029AH initial unscheduled draft availability recommendations are implemented.
- EAPT-030A initial linked work read model and detail panel is implemented.
- EAPT-031 initial appointment-template blueprint task generation is implemented across draft, approval, schedule, check-in, outcome, and completion lifecycle execution flows with transactional task-link/activity persistence.
- EAPT-032 initial task-detail create linked draft appointment workflow is implemented.
- EAPT-033 initial task-to-appointment automation runtime slices are implemented for outcome-driven execution recording, safe replay handling, and generated follow-up work persistence.
- EAPT-034 initial automation rule lifecycle slices are implemented for simulation-backed draft creation, activation-readiness guidance, and configured-rule pause/retire controls in the automation console.
- EAPT-035 initial automation review and replay slices are implemented for retry/replay/resolve/skip controls, duplicate-safe follow-up replays, and board-visible runtime failure visibility.
- EAPT-036 initial appointment and automation history slices are implemented for replay/recovery audit context, lifecycle-driven generated-record correlation, and activity-feed bridging.
- EAPT-037 initial optimistic-concurrency hardening is implemented across the live appointment command path, including safe stale-version conflicts for late transaction-time update races without losing recovery-safe user input.
- EAPT-038 initial critical lifecycle and orchestration execution coverage is implemented across draft/planning, attendance/execution, terminal/ownership, mutation-family stale conflict handling, and board stale-recovery notice proof.
- Database-backed versioned appointment-template administration, recurrence persistence/materialization, availability-search API/UI, waitlist persistence/queues, reschedule/bulk execution persistence, full staff directory/admin maintenance, participant reassignment controls, reason-code catalog/templates, full command-center UI wiring, administration UI, browser workflow tests, and persisted production Appointment workflows have not yet been implemented.
- The existing `/appointments` route now contains the mockup-aligned preview shell and is the intended UI boundary for the next live-service slices.

## Service Financial Close and Enterprise Parts Operations — 2026-07-14

Vehicle Operations Milestones 4H–5D are implemented in the repository. Repair orders can generate source-linked invoice-ready packages, record financial handoff status, close only after delivery/release/invoice/handoff gates pass, and reopen through retained manager-reasoned history. Parts Operations now includes vendor and interchange masters, effective vendor offers, demand requisitions and comparison snapshots, controlled purchase orders, receipt-ledger posting, discrepancy resolution, job/technician custody, location transfers, and core/warranty/vendor-return credit recovery. All mutations use the existing capability, rollout, idempotency, optimistic-version, audit, domain-event, and outbox controls. The live workspace is `/vehicles/service-close-parts`.

The additive migration is source-controlled but was not deployed here. Payment processing, tax/general-ledger posting, external DMS/accounting adapters, cycle-count planning, replenishment/obsolescence recommendations, and barcode hardware integration remain separate planned slices. Verification for this checkpoint passed schema validation, lint, typecheck, 184 test files/1,077 tests, production build, and protected-route smoke validation. See [`docs/inventory/SERVICE_CLOSE_PARTS_OPERATIONS_IMPLEMENTATION.md`](inventory/SERVICE_CLOSE_PARTS_OPERATIONS_IMPLEMENTATION.md).

## Enterprise Parts Wave 1 — 2026-07-14

Vehicle Operations Milestones 5E–5G (`VEH-081` through `VEH-083`) are implemented in the repository. Cycle counts now support immutable balance snapshots, blind counting, observe/freeze modes, movement-aware expected quantities, independent variance approval, and controlled `ADJUST` ledger posting. Effective-dated inventory policies drive immutable advisory runs for reorder, transfer review, obsolescence review, and no-action outcomes with demand variability, EOQ, source evidence, confidence, and attributable decisions. `/vehicles/parts-counter` provides barcode-ready canonical lookup, counter custody, purchase receipt, discrepancy, count, policy, and recommendation workflows.

The migration is source-controlled but not deployed. Hardware-specific scanner/label integrations, automated purchasing/transfers/disposal, policy auto-tuning, backfill, and production pilot evidence remain outside this slice. See [`docs/inventory/ENTERPRISE_PARTS_WAVE_ONE_IMPLEMENTATION.md`](inventory/ENTERPRISE_PARTS_WAVE_ONE_IMPLEMENTATION.md).

## Enterprise Vehicle Intake and Repair-Order Workbench — 2026-07-20

The approved vehicle-intake and repair-order mockups are now official product documentation and the corresponding replacement experience is implemented. Intake is search-first across canonical customers, vehicles, eligible appointments, and open repair orders; supports governed inline customer and vehicle creation; preserves a 2,000-character customer concern; evaluates live appointment and service-capacity readiness; records custody and consent; and creates the canonical repair order. The repair-order route now opens a compact concern-centered enterprise workbench with vehicle, customer, custody, readiness, ownership, traceability, diagnostic-plan guidance, existing diagnosis/estimate/job facts, downstream gates, and direct access to the governed planning workflow.

The approved references and behavioral contract are maintained in [`docs/inventory/VEHICLE_SERVICE_INTAKE_AND_REPAIR_ORDER_UI_SOURCE_OF_TRUTH.md`](inventory/VEHICLE_SERVICE_INTAKE_AND_REPAIR_ORDER_UI_SOURCE_OF_TRUTH.md). Suggested diagnostic steps remain advisory and do not assert a cause or authorize repair work.

## Enterprise Diagnostics Console Planning Baseline — 2026-07-20

An independent Enterprise Diagnostics Console has been approved as a first-class bounded domain inside Dispatch Board. The official planning package now includes the architecture, current-market capability benchmark, diagnostic algorithm catalog, consistency and causal reasoning specification, automotive ontology and knowledge graph, integrated diagnostic lab suite, scan/live-data/network intelligence, electrical and waveform diagnostics, intermittent-fault investigation, procedure authoring/release, simulation/benchmark/training, diagnostic quality/mastery/verification, phased roadmap, 50 implementation milestones, and a consolidated implementation master plan. The package is maintained in [`docs/diagnostics/README.md`](diagnostics/README.md). The planned console will reuse canonical vehicle, repair-order, evidence, task, appointment, parts, estimate, authorization, repair-job, QC, audit, and activity foundations while owning diagnostic cases, hypotheses, tests, reasoning, conclusions, recommendations, and verification.

The DGN-001–006 foundation contracts are complete and `DG-G0` is approved with holds. DGN-007–009 are implemented in source: additive tenant-scoped diagnostic case, immutable concern version, immutable state-event persistence, governed create/read, assignment, lifecycle/waiting/escalation/abandon/reopen commands, explicit capabilities, disabled-by-default rollout controls, API boundaries, command-ledger idempotency, optimistic concurrency, audit, domain events, and outbox integration. The migration is source-controlled but was not deployed by this implementation branch.

The DGN-010–012 independent `/diagnostics` queue, technician case workspace, exact-version ownership/lifecycle controls, and governed Repair Order create/open/summary bridge are implemented in source. The console exposes honest loading, empty, restricted, rollout-held, stale-capable, conflict, and unavailable states; it does not invent evidence, hypotheses, test plans, conclusions, or confidence. `DG-G1` remains open pending deployment of the DGN-007–009 migration to a test runtime plus populated responsive-browser, accessibility, and technician-usability evidence. See [`docs/diagnostics/implementation/DGN_010_012_CASE_CONSOLE_IMPLEMENTATION.md`](diagnostics/implementation/DGN_010_012_CASE_CONSOLE_IMPLEMENTATION.md).

DGN-013–014 are implemented in source: immutable observations, dimensional measurement normalization, entered/normalized reference preservation, engineering plausibility marking, time-window and raw-source provenance, independence groups, quality/reliability classification, append-only correction lineage, and governed links to existing Vehicle Evidence. The technician workspace can record facts and select permitted vehicle evidence while retaining malware, restricted-access, checksum, retention, legal-hold, and deletion authority in Vehicle Evidence. Hypothesis, conclusion, and verification evidence targets remain reserved and rejected until their governed aggregates exist. See [`docs/diagnostics/implementation/DGN_013_014_EVIDENCE_FOUNDATION_IMPLEMENTATION.md`](diagnostics/implementation/DGN_013_014_EVIDENCE_FOUNDATION_IMPLEMENTATION.md).

DGN-015–016 are implemented in source: immutable versioned test definitions, validated and superseding case-plan graphs, effective-date/source/applicability/risk checks, server-derived technician qualification gates, and append-only start/pause/resume/complete/invalidate/repeat/cancel execution revisions. Vehicle Evidence may now target an existing test execution. See [`docs/diagnostics/implementation/DGN_015_016_TEST_EXECUTION_IMPLEMENTATION.md`](diagnostics/implementation/DGN_015_016_TEST_EXECUTION_IMPLEMENTATION.md).

DGN-017–018 are implemented in source: ten shared-context technician lab shells, an active-plan Test Navigator wired to the governed execution lifecycle, persisted interruption/recovery state, and a permission-filtered evidence review with combined timeline, measurement matrix, expected/actual comparison, review conflicts, source freshness, and immutable provenance. See [`docs/diagnostics/implementation/DGN_017_018_TECHNICIAN_WORKSPACE_IMPLEMENTATION.md`](diagnostics/implementation/DGN_017_018_TECHNICIAN_WORKSPACE_IMPLEMENTATION.md).

DGN-019 is implemented in source: policy-versioned server-side applicability, source-rights/freshness, unit, plausibility, instrument, evidence-completeness/independence, qualification, hazard, tool, vehicle-state, dependency, and test-readiness gates now return explicit ready, blocked, abstain, or not-applicable dispositions. Successful evaluations are retained in immutable test-execution snapshots, and the case workspace shows a permission-filtered evidence-quality/abstention summary. See [`docs/diagnostics/implementation/DGN_019_QUALITY_SAFETY_GATES_IMPLEMENTATION.md`](diagnostics/implementation/DGN_019_QUALITY_SAFETY_GATES_IMPLEMENTATION.md).

DGN-020–021 are implemented in source: append-only tenant-scoped knowledge-source, rule-set, and citation versions; independent review, rights, applicability, checksum, supersession, withdrawal, and rollback lineage; a controlled generic starting/charging/no-start topology; four governed test-definition payloads; and a unit-safe Ohm/power/energy, Kirchhoff, series/parallel, loaded voltage-drop, timing, tolerance, speed/ratio, and torque library. Held OEM and commercial sources remain blocked, and the generic seed contains no invented vehicle-specific limits. See [`docs/diagnostics/implementation/DGN_020_021_KNOWLEDGE_CALCULATIONS_IMPLEMENTATION.md`](diagnostics/implementation/DGN_020_021_KNOWLEDGE_CALCULATIONS_IMPLEMENTATION.md).

DGN-022–023 are implemented in source: immutable hypotheses and typed support/contradiction links, subset-minimal conflicts, bounded deterministic minimal hitting-set diagnoses, modeled multiple/common/intermittent candidates, truth revision, applicability and rule evaluation, causal-versus-associative support, missing expected effects, stable explanation codes/checksums, and immutable reasoning evaluations. A rollout-gated API accepts only command metadata; the applicable model and evidence mapping must come from an approved server-side provider. No provider is activated while vehicle-specific source holds remain unresolved. See [`docs/diagnostics/implementation/DGN_022_023_REASONING_CORE_IMPLEMENTATION.md`](diagnostics/implementation/DGN_022_023_REASONING_CORE_IMPLEMENTATION.md).

DGN-024–025 are implemented in source: approved-definition next-test generation, independent fail-closed applicability/prerequisite/safety/authority/qualification/tool/state/authorization/source/definition gates, complete exclusion reasons, normalized information gain, explicit policy weights and factor contributions, bounded look-ahead, stable alternatives, and immutable authorized technician override lineage. Evaluation binds to the latest reasoning result and checksum, accepts no client-authored knowledge or weights, and fails closed without an approved server provider. See [`docs/diagnostics/implementation/DGN_024_025_ADAPTIVE_TESTING_IMPLEMENTATION.md`](diagnostics/implementation/DGN_024_025_ADAPTIVE_TESTING_IMPLEMENTATION.md).

DGN-026–027 are implemented in source: immutable cause proposal, confirmation, rejection, supersession, abstention, no-fault-found, and escalation decisions; exact reasoning/evidence/source/safety lineage; explicit technical confirmation grants; R3 independent-review controls; connected hypothesis/adaptive-test/conclusion technician views; and a blinded simulation-only generic no-start corpus covering normal, misleading-code, measurement-error, common-ground, intermittent, multiple-fault, unsafe, degraded, and no-fault-found cases. See [`docs/diagnostics/implementation/DGN_026_027_CONCLUSION_NO_START_PROOF_IMPLEMENTATION.md`](diagnostics/implementation/DGN_026_027_CONCLUSION_NO_START_PROOF_IMPLEMENTATION.md).

Diagnosis publishing, knowledge administration, hardware adapters, authoritative verification execution, production reasoning/adaptive/conclusion providers, licensed vehicle-specific content, and the complete production starting/charging/no-start engine remain unimplemented. Existing migrations are not deployed by this branch and Diagnostics rollout flags remain disabled by default. Formal `DG-G3` acceptance still requires migrated-runtime, qualified technical/safety, populated responsive-browser, accessibility, representative technician-usability, and production-scale evidence.

The initial Diagnostics Technician Workspace mockup is provisionally approved as the official starting UI direction. [`docs/diagnostics/DIAGNOSTICS_TECHNICIAN_WORKSPACE_UI_SOURCE_OF_TRUTH.md`](diagnostics/DIAGNOSTICS_TECHNICIAN_WORKSPACE_UI_SOURCE_OF_TRUTH.md) defines its technician-only role, five-stage workflow, single-primary-action hierarchy, qualitative-confidence correction, advisor boundary, and required technician usability validation. This approval does not represent implemented UI or production usability evidence.

## Time & Attendance Foundation — 2026-07-23

The Time & Attendance CCC program foundation is implemented in source and documentation. [`docs/time-attendance/README.md`](time-attendance/README.md) indexes the product boundary, modular-monolith architecture, official Minnesota/federal policy-source register, exact-time/no-rounding decision, overtime/break/ESST algorithms, time-card and time-off workflows, permission matrix, implementation milestones, golden cases, release gates, and operational contract. The executable `src/server/time-attendance` foundation provides a source-linked policy registry, fail-closed overtime coverage resolution, exact tardiness calculation, Minnesota break evaluation, Minnesota standard ESST accrual, attendance/allocation reconciliation, and staff-specific paid/unpaid meal policy planning with focused unit coverage.

TA-G1 persistence and command-boundary foundations are now implemented in source. Prisma schema and additive migration `20260723220000_time_attendance_foundation` add policy profiles and assignments, append-only attendance events and sessions, break intervals, time cards, exceptions, attestations, approvals, time-off requests, balances, export batches, and export lines. The server command contract maps clock/meal capture commands into the shared enterprise command boundary and validates allowed session transitions.

TA-020 idempotent capture is implemented in source. `/api/time-attendance/capture` accepts `CLOCK_IN`, `START_MEAL`, `END_MEAL`, and `CLOCK_OUT`; the service enforces self-or-manager capture authority; the repository commits the enterprise command ledger, aggregate version, attendance session, attendance event, meal interval evidence, audit, domain event, and outbox message in one transaction.

TA-021 event normalization is implemented in source. The pure interval builder orders and deduplicates source events, pairs clock and meal events without inventing missing evidence, emits blocking normalization exceptions, splits derived intervals by location-local day and workweek attribution, and calculates attendance, meal, unpaid-meal, and paid-work minutes. Paid-work intervals deduct only actual unpaid completely-relieved meals, so planned lunch expectations do not silently remove worked time.

TA-022 through TA-025 are implemented in source. The effective policy resolver returns exactly one active assignment and policy bundle or a blocking conflict. The time-card calculator projects exact paid-work, regular, overtime, meal, unpaid-meal, Minnesota break, and ESST results from normalized events. The exception engine merges normalization, policy, break, overtime, and planned-meal exceptions with blocking semantics. The replay service returns stable input, projection, and combined checksums for reproducible historical calculations.

This foundation does not include applied runtime migration evidence, seed data, a live `/time-attendance` console, persisted time-card projection APIs, payroll-file generation, protected-leave case management, legal/payroll configuration approval, pilot evidence, or production release authority.

## Current Execution Order

1. Complete and accept Appointment architecture decisions.
2. Finalize E1 domain contracts and currently available configuration.
3. Implement the E1 schema, policy, validation, audit, and migration foundation in reviewable slices.
4. Continue through E2–E10 using the Appointment implementation roadmap and milestone gates.

## Baseline Change Rule

Update this snapshot whenever:

- A major legacy Dispatch Board capability changes status.
- An Enterprise Appointment milestone passes.
- Production deployment or release evidence changes.
- A placeholder surface becomes a live production workflow.
