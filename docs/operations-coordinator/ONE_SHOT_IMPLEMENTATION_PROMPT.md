# One-Shot Implementation Prompt

Use this prompt after the planning package is approved.

```text
Implement the Time Motor Sales Operations Coordinator Workspace on branch codex/office-front-desk-workspace.

Before coding, read:
- docs/operations-coordinator/README.md
- docs/operations-coordinator/ARCHITECTURE.md
- docs/operations-coordinator/ALGORITHMS_RULES_AND_GUARDRAILS.md
- docs/operations-coordinator/WORKFLOWS.md
- docs/operations-coordinator/UI_SOURCE_OF_TRUTH.md
- docs/operations-coordinator/IMPLEMENTATION_ROADMAP.md

Build the Operations Coordinator role as the dealership's front-door operating loop: broad visibility, guided lightweight action, protected final authority, and fast routing across appointments, intake, repair, parts, inventory, sales, paperwork, finance, rentals, payments, collections, marketing, and documentation.

Implementation requirements:

1. Preserve canonical records.
   - Do not create duplicate appointment, repair order, parts, payment, finance, sales, rental, customer, vehicle, or document systems.
   - Use existing services/routes where possible.
   - Add only a read model and safe lightweight actions unless a canonical mutation already exists.

2. Role foundation.
   - Add/confirm Operations Coordinator role.
   - Add role-aware default landing route.
   - Add navigation entry.
   - Add capability defaults for broad view and lightweight action only.
   - Block manager approvals, repair authorization, QC override, final accounting close, financing approval, delete/rewrite history, and admin/policy changes.

3. Workspace read model.
   - Compose a coordinator snapshot from canonical sources:
     appointments, customers, vehicles, service intake, repair orders, parts receiving, inventory lifecycle, sales/paperwork, finance paperwork, rental checklist, payment intake, collections, documents, and tasks.
   - If a domain is not implemented, return safe unavailable/placeholder state rather than failing the page.

4. UI.
   - Create compact enterprise Operations Coordinator landing page.
   - Include:
     - Today Command Strip
     - Universal Search
     - Start Work Dock
     - My Coordination Queue
     - Paperwork Command Center
     - Department Peek Panels
     - Escalation Router
   - Keep font readable and layout compact.
   - Avoid dumping full manager consoles into this role.

5. Algorithms.
   - Implement action ranking by customer waiting, appointment time, due soon, blocker severity, missing document, payment risk, promise risk, and escalation state.
   - Implement role-safe action resolver:
     complete safely, prepare canonical workflow, route to authority, or read-only peek.
   - Implement no-result search actions after search-first behavior.

6. Quick action routing.
   - Wire quick actions to existing canonical routes where possible:
     New Appointment, Check In Vehicle, Add Customer/Vehicle, Start Service Intake, Receive Parts, Upload Document, Upload Photos, Start Sales Packet, Start Finance Packet, Verify Insurance, Initiate Rental, Record Payment, Add Collection Note.
   - If a deep workflow is not implemented, show a safe placeholder or route/escalation option.

7. Tests.
   - Add focused tests for:
     - role default landing
     - capability boundaries
     - workspace read model
     - action ranking
     - UI render
     - protected action blocking
     - unavailable/empty states
   - Run typecheck and focused tests.

8. Safety guardrails.
   - Use safe incremental edits.
   - Preserve user changes.
   - Avoid destructive commands.
   - Avoid schema migrations unless strictly necessary and justified.
   - Do not broaden authority beyond the approved role model.
   - Report changed files, tests, and any intentionally deferred work.
```
