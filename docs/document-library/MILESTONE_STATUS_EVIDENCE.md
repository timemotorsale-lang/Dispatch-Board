# Document Library Milestone Status Evidence

## Scope

This file records repository evidence for Document Library Milestones 1-8. It is intentionally narrow: it distinguishes implemented code from planning documents and visible UI placeholders.

## Current implementation evidence

- Route exposure exists for `/documents` through `src/app/(app)/documents/page.tsx`, which renders `DocumentLibraryLanding`.
- Navigation exposes Document Library entries and route authorization includes `/documents`.
- The current feature implementation is a staff-facing landing UI in `src/features/document-library/document-library-landing.tsx` with:
  - search field and status/packet filters;
  - document category tiles;
  - static packet list and packet detail content;
  - required-document rows showing received and missing states;
  - review action buttons for accept, needs correction, and request document;
  - audit/source display.
- The unit test `src/tests/unit/document-library-landing.test.tsx` verifies the landing structure, category scope, route page rendering, Add Document/Create Packet labels, and Required Documents display.
- Server-side rule/model evidence exists in `src/server/document-library/read-model.ts` and `src/server/document-library/permission-policy.ts` for:
  - document, packet, requirement, provider-reference, audit, permission, archive-state, and advisory-suggestion types;
  - permission-gated document visibility and sensitive actions;
  - packet evaluation for missing, held, expired, received-not-accepted, waived, and complete requirements;
  - archive eligibility preview;
  - human-confirmed provider action planning with audit, idempotency key, purpose, permission, legal-hold, and rollback checks;
  - advisory missing-document and readiness suggestions.
- Demo backend/API evidence exists in `src/server/document-library/domain.ts`, `src/server/document-library/service.ts`, `src/app/api/document-library/route.ts`, and `src/app/api/document-library/actions/route.ts` for:
  - a versioned `document-library.backend/v1` read model;
  - in-memory/demo document and packet records;
  - packet requirement resolution, blocker projection, review queue projection, archive preview, provider reference projection, and summary counts;
  - authenticated read access;
  - manager-only provider-action previews that remain held for confirmation with live provider writes disabled.
- The unit tests `src/tests/unit/document-library-rules.test.ts`, `src/tests/unit/document-library-permission-policy.test.ts`, `src/tests/unit/document-library-backend-service.test.ts`, and `src/tests/unit/document-library-backend-route.test.ts` cover role/action gating, deny-by-default access, linked-record access, restricted/sensitive action audit and idempotency, legal-hold/delete blocking, export/provider policy holds, archive/retention/legal-hold disposition, provider-action idempotency behavior, packet blocker logic, backend read-model projection, authentication errors, and manager-only held provider-action previews.

## Milestone status

| Milestone | Planned outcome | Evidence status |
| --- | --- | --- |
| M1 Manual Document Library MVP | Staff can manually add, link, classify, review, and find documents. | Partially evidenced. UI shows add/search/filter/review concepts; server/domain code models document records, linked records, classification, review state, permissions, audit trail, storage references, and a demo read API. No durable persistence, upload/link form handling, classification mutation, or audit writes beyond demo data are evidenced. |
| M2 Packet Requirements and Workflow Blocking | Workflows define required documents and show what is missing. | Partially evidenced. UI shows required/missing rows; server code resolves packet requirements, blockers, legal hold, archive state, waiver, completion counts, and packet status. No persisted packet templates, workflow blocker display across operational workflows, or waiver command flow is evidenced. |
| M3 Review Queues and Operational Dashboard | Managers and staff see documents needing attention. | Partially evidenced. The demo backend projects a review queue and summary counts, and the UI shows status counts/actions. No concrete manager/staff queue workspace, aging, urgency scoring, ownership assignment workflow, or dashboard drill-in behavior is evidenced. |
| M4 Storage Provider Abstraction | Document records are separated from physical file storage. | Partially evidenced. Storage/provider references are separated from document records in domain/read-model code and projected in the backend response with read-only posture. No storage-provider interface, persisted storage object/version table, adapter contract, migration path, or storage health process is evidenced. |
| M5 Archive and Retention Foundation | Inactive documents can be archived safely without losing evidence. | Partially evidenced. Archive states, legal hold, archive eligibility preview, retention category, retention permission checks, and legal-hold blockers exist in model/service evidence. No persisted archive workflow, restore command, retention schedule policy, or archive audit write path is evidenced. |
| M6 Document Integration Readiness | Prepare for external document providers. | Partially evidenced as read-only/provider-held reference model. Provider references include family, health, read-only posture, external ID, and freshness fields; backend projections keep provider references read-only. No provider intake workflow, connector integration, provider health monitor, or no-write integration proof against a real provider is evidenced. |
| M7 Intelligent Assistance | Advisory suggestions help staff without replacing review authority. | Partially evidenced. `buildAdvisorySuggestions` returns review-required missing-document and readiness suggestions. Suggested type, duplicate detection, OCR metadata extraction, expiration suggestions, and staff review/acceptance workflow are not evidenced. |
| M8 Controlled Provider Actions | Human-confirmed provider actions are enabled after trust is established. | Partially evidenced as held preview only. Controlled actions are enumerated; model/service/API code requires manager authority and idempotency, returns audit-required held previews, and explicitly keeps live provider writes disabled. No confirmed execution, provider reconciliation, import/export implementation, rollback execution, or persisted idempotency ledger is evidenced. |

## Documentation gaps remaining

- Add explicit acceptance evidence checklists for M1-M8 when implementation begins, including command/test names and required screenshots or fixtures.
- Convert the current read-model, domain, and permission-policy types into a durable data model contract for documents, packets, requirements, reviews, audit events, storage references, and archive records.
- Turn the permission policy into an explicit documented matrix for view, restricted view, download/export, review, waiver, archive, provider connection, provider action, retention/hold changes, and delete-disabled posture.
- Define the test plan separating UI shell, domain rules, persistence, audit, retention, provider abstraction, provider command, and integration-readiness tests.
- Clarify whether the current `/documents` landing page, demo backend API, and held provider-action preview are prototype evidence, a production-visible read-only shell, or the first deployable MVP surface.

## Verification note

- `npm test -- document-library` currently reports 20 passing tests and 2 failing tests. The failures are in the backend read-model path: `document-library-backend-service.test.ts` and `document-library-backend-route.test.ts` expect a General Manager fixture to read the backend model, while current backend access requires an approved document workflow role or duty through `canOpenDocumentLibrary`.
