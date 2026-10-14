# CRM Next — AI/Codex Agent Rules

## Read first

Read the CRM Next README, Product Blueprint, Information Architecture, UX Spec, Domain Model, Technical Architecture, Integration Contract, Acceptance Criteria, Roadmap, and root Dispatch Board AGENTS/ARCHITECTURE before meaningful CRM work.

## Architecture invariants

- CRM Next stays inside Dispatch Board.
- Legacy remains untouched except explicit fixes/migration work until cutover.
- Do not create a second task engine.
- Do not create a disconnected appointment system.
- Customer 360 uses Overview/Sales/Ownership/Support/Activity.
- Do not add primary navigation without explicit approval.
- Command Center is action-oriented, not chart-first.
- Workbench prioritizes execution/context.
- Timeline is unified/event-backed.
- Intelligence remains explainable.
- Sensitive permissions are server-side.

## Before coding

For non-trivial tasks: inspect actual code, identify reuse points, state current vs target behavior, list risks, propose the smallest vertical slice, and do not assume planned entities already exist.

## Change safety

Prefer small reviewable diffs. Do not refactor unrelated Legacy code. Do not add dependencies without justification. Preserve working behavior. Add tests. Update CRM Next docs when architecture/behavior changes.

## Definition of done

Requested behavior works; relevant tests/typecheck/lint pass or gaps are reported; loading/empty/error states exist where applicable; permissions are enforced; activity/audit behavior is correct; no duplicate platform capability was introduced; no undocumented architecture drift occurred.

