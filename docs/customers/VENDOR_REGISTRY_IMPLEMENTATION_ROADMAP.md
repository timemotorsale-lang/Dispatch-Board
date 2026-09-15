# Vendor Registry Implementation Roadmap

**Document:** Vendor Registry Implementation Roadmap  
**Version:** 1.0 planning baseline  
**Date:** 2026-09-14  
**Status:** Draft execution roadmap for review before implementation  
**Source of truth:** [`VENDOR_REGISTRY_SOURCE_OF_TRUTH.md`](VENDOR_REGISTRY_SOURCE_OF_TRUTH.md)  
**Architecture:** [`VENDOR_REGISTRY_ARCHITECTURE.md`](VENDOR_REGISTRY_ARCHITECTURE.md)  
**Primary future route:** `/customers/vendors`  

---

## 1. Rollout Goal

Move CRM from no dedicated vendor registry to:

```text
A simple staff-facing Vendor Registry backed by durable vendor identity,
controlled categories, status rules, notes, task handoff, linked-record context,
permissions, audit history, and a foundation for future reporting.
```

Build one vertical slice at a time. Avoid a large all-at-once vendor-management suite.

---

## 2. Product Guardrails

- Keep the first release simple for staff.
- Put enterprise capability behind the scenes.
- Keep vendors separate from retail customers.
- Do not build accounting/tax controls in version 1.
- Do not create a standalone app.
- Do not allow free-text vendor categories.
- Do not mutate linked vehicle, appointment, task, deal, repair, or document records from the vendor profile unless the owning module supports it.
- Every mutation must have server validation and permission checks.
- Every accepted milestone should include focused tests and review evidence.

---

## 3. Milestone Sequence

| Order | Milestone | Suggested branch | Outcome |
| ---: | --- | --- | --- |
| 0 | Planning and acceptance gate | `codex/vendor-registry-planning-gate` | Source of truth, architecture, roadmap, category/status decisions, and version 1 boundary are approved. |
| 1 | Vendor identity foundation | `codex/vendor-registry-foundation` | Durable vendor records, category/status model, validation, policy, repository, and seed data exist. |
| 2 | Vendor list and search | `codex/vendor-registry-list-search` | Staff can open Vendor Registry, search, filter, and scan vendor records. |
| 3 | Add/edit vendor workflow | `codex/vendor-registry-create-edit` | Authorized users can create and update vendors through simple forms. |
| 4 | Vendor profile and notes | `codex/vendor-registry-profile-notes` | Staff can open a vendor profile, review details, and add notes/activity. |
| 5 | Task handoff and linked-record context | `codex/vendor-registry-work-links` | Staff can create a task from a vendor and see linked-record placeholders/context. |
| 6 | Manager controls and status safety | `codex/vendor-registry-manager-controls` | Preferred, inactive, pending review, and do-not-use behavior is enforced. |
| 7 | Version 1 readiness gate | `codex/vendor-registry-v1-readiness` | Tests, browser proof, documentation, known limits, and rollout readiness are complete. |

---

## 4. Milestone 0 - Planning and Acceptance Gate

**Goal:** agree on the build contract before code.

Scope:

- Approve `VENDOR_REGISTRY_SOURCE_OF_TRUTH.md`.
- Approve `VENDOR_REGISTRY_ARCHITECTURE.md`.
- Approve this roadmap.
- Confirm route placement: `/customers/vendors` versus a top-level `/vendors`.
- Confirm version 1 categories.
- Confirm version 1 statuses.
- Confirm who may create/edit vendors.
- Confirm whether internal contacts stay in Vendor Registry for version 1.

Exit gate:

- open decisions are resolved or explicitly deferred
- version 1 scope is accepted
- implementation can start without redesigning the concept mid-build

---

## 5. Milestone 1 - Vendor Identity Foundation

**Goal:** create safe backend identity before UI work expands.

Vertical slices:

1. Add vendor data model through an additive migration.
2. Add category and status constants/enums.
3. Add vendor validation rules.
4. Add vendor repository.
5. Add vendor policy checks.
6. Add create/update service skeleton.
7. Add synthetic seed vendors for development only.

Acceptance evidence:

- migration is additive and does not change retail customer identity
- validation rejects missing name, invalid category, invalid status, and cross-organization access
- repository tests cover create, update, search basics, and archive behavior
- policy tests cover staff, manager, and admin expectations

---

## 6. Milestone 2 - Vendor List and Search

**Goal:** make Vendor Registry findable and useful without deep workflow.

Vertical slices:

1. Add `/customers/vendors` route shell.
2. Add CRM navigation entry.
3. Add vendor list read model.
4. Add search and filters by name, category, status, phone, email.
5. Add empty, loading, unavailable, and no-results states.
6. Add responsive layout.

Staff-facing behavior:

- search vendors quickly
- filter by category/status
- open vendor profile route placeholder
- start add-vendor flow

Acceptance evidence:

- browser proof for list/search/filter states
- unit tests for search/read model mapping
- route does not break Customers dashboard

---

## 7. Milestone 3 - Add/Edit Vendor Workflow

**Goal:** allow authorized staff to create and maintain basic vendor records.

Vertical slices:

1. Add create vendor command route.
2. Add edit vendor command route.
3. Add simple add-vendor form.
4. Add simple edit form.
5. Add category/status selection.
6. Add primary contact fields.
7. Add success/error notices.

Version 1 form fields:

- vendor name
- category
- status
- contact name
- phone
- email
- address summary
- website/portal
- owner
- notes

Acceptance evidence:

- validation handles required fields and invalid categories/statuses
- unauthorized users cannot edit restricted fields
- create and edit browser flows work
- UI stays short and staff-friendly

---

## 8. Milestone 4 - Vendor Profile and Notes

**Goal:** provide a simple working profile page.

Vertical slices:

1. Add `/customers/vendors/[vendorId]` route.
2. Add vendor profile read model.
3. Add profile header: name, category, status, main contact.
4. Add overview section.
5. Add notes section.
6. Add add-note command.
7. Add basic activity timeline projection.

Acceptance evidence:

- profile opens from list
- missing vendor and unauthorized vendor states are handled
- staff can add a note
- note appears in profile timeline/activity
- profile remains simple and readable

---

## 9. Milestone 5 - Task Handoff and Linked-Record Context

**Goal:** connect vendors to daily work without making Vendor Registry own every workflow.

Vertical slices:

1. Add create-task-from-vendor action.
2. Carry vendor context into the Task Engine.
3. Add open work count to list/profile.
4. Add linked-record placeholder section.
5. Add manual linked-record service if version 1 needs it.
6. Add record ownership guardrails.

Acceptance evidence:

- task created from vendor keeps vendor name/id context
- vendor profile shows open task count or linked task context
- linked records are displayed as context only
- vendor profile does not mutate records owned by other modules

---

## 10. Milestone 6 - Manager Controls and Status Safety

**Goal:** make vendor status useful and safe.

Vertical slices:

1. Add status-change command.
2. Enforce who can mark Preferred, Inactive, Pending Review, or Do Not Use.
3. Add warnings for inactive and do-not-use vendors.
4. Add preferred vendor view/filter.
5. Add pending review view/filter.
6. Add status activity events.

Acceptance evidence:

- staff cannot mark do-not-use unless authorized
- inactive/do-not-use warnings are visible
- status changes are audited
- filters show preferred, pending review, inactive, and do-not-use vendors

---

## 11. Milestone 7 - Version 1 Readiness Gate

**Goal:** prepare Vendor Registry for adoption.

Scope:

- full route smoke tests
- create/edit/profile/note/task handoff proof
- responsive screenshots
- permission checks
- documentation updates
- known limits list
- rollback notes

Exit gate:

- staff can find vendors
- authorized users can add/edit vendors
- staff can add notes and create tasks
- statuses are visible and enforce basic safety
- vendor profiles remain distinct from customer profiles
- source-of-truth, architecture, roadmap, and implementation status are updated

---

## 12. Deferred Capabilities

Deferred until after version 1:

- accounting vendor payment management
- tax/W-9 document controls
- duplicate merge workflow
- vendor performance scorecards
- category-specific automation
- external portal integrations
- advanced reporting dashboards
- vendor issue/complaint workflow
- document upload permissions
- AI recommendations

---

## 13. Testing Strategy

Each implementation milestone should include the applicable tests:

- validation unit tests
- policy unit tests
- repository/service tests
- route tests
- read model tests
- browser smoke proof
- responsive screenshot proof for key pages

Minimum browser flows for version 1:

1. open Vendor Registry
2. search by vendor name
3. filter by category
4. create vendor
5. open vendor profile
6. add note
7. create task from vendor
8. verify inactive/do-not-use warning behavior

---

## 14. Rollout Strategy

Recommended rollout:

1. Start with internal seed vendors.
2. Let managers review category/status labels.
3. Pilot with a small staff group.
4. Collect missing field requests.
5. Add category-specific fields only when repeated real usage proves the need.
6. Keep the first public release simple.

---

## 15. Success Criteria

Vendor Registry version 1 succeeds when:

- staff stop hunting through notes/messages for vendor contact details
- vendors are searchable by name, category, and contact info
- managers can identify preferred, active, inactive, and do-not-use vendors
- vendor notes and tasks are attached to a durable vendor profile
- vendor work can be connected to operational records without confusing ownership
- the UI feels simple even though the backend is ready for enterprise growth

