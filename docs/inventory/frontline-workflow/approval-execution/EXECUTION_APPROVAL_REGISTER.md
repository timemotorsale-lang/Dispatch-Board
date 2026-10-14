# Execution Approval Register

**Status:** Slice 1 and Slice 2 partial execution recorded; 25 authorized dispositions; 105 decisions remain open

## Summary

| Packet | Decisions | OPEN | Authorized | Gate |
| --- | ---: | ---: | ---: | --- |
| AE-1 | 18 | 3 | 15 | PARTIAL / NO-GO |
| AE-2 | 32 | 25 | 7 | PARTIAL / NO-GO |
| AE-3 | 20 | 17 | 3 | PARTIAL / NO-GO |
| AE-4 | 30 | 30 | 0 | NO-GO |
| AE-5 | 10 | 10 | 0 | NO-GO |
| AE-6 | 10 | 10 | 0 | NO-GO |
| AE-7 | 10 | 10 | 0 | NO-GO |
| **Total** | **130** | **105** | **25** | **NO-GO** |

## Required record per decision

```text
decisionId
disposition: APPROVE | APPROVE_WITH_CHANGE | DEFER_SAFE | REJECT
exact authorized policy or exact replacement language
approver identity, role and represented authority
recusal/conflict and separation-of-duties confirmation
decidedAt and effectiveAt
organization, location, vehicle/source/route and pilot scope
workflow/policy version
rationale, conditions and expiry/review date
dependencies and affected slices
safe default and owner for deferral
closure evidence references
recorder and immutable approval-record reference
```

## Status rules

- A recommendation, discussion, meeting note, checkbox or document commit does not change `OPEN`.
- `APPROVE_WITH_CHANGE` requires exact replacement text, not a future promise to revise.
- `DEFER_SAFE` requires a safe default, owner, target/review date, affected slices and closure evidence.
- `REJECT` returns the affected policy/slices to redesign and preserves the reason.
- One decision may require several signers; it closes only when all required authority is present.
- Later decisions cannot silently supersede earlier ones; conflicts require explicit change control.

## Execution journal

| Session | Packet | Date/time | Authorized participants | Decisions attempted | Closed | Deferred | Rejected | Evidence | State |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `ITF-AE0-2026-01` / Slice 1 partial execution | AE-1/AE-2 applicable | 2026-07-16; exact time not captured | Eli Aswan authority; Brock Harris operating owner; user-confirmed via Codex | 50 | 19 | 3 | 0 | Decision Signature Journal; 28 missing-input holds | PARTIAL |
| `ITF-AE3-2026-01` / Slice 2 partial execution | AE-3 / Slice 2 | 2026-07-16; exact time not captured | Eli Aswan ultimate authority; Brock Harris operating owner; user-directed via Codex; chat-user identity not independently verified | 10 | 2 | 1 | 0 | Decision Signature Journal; 7 open-input holds | PARTIAL |
